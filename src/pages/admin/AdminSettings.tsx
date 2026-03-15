import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useAdminTheme } from '@/hooks/useAdminTheme';
import { fetchExchangeRates } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { languageNames, type Language } from '@/i18n/translations';
import { Sun, Moon, Plus, Trash2, RefreshCw, ChevronDown, Rss, Globe, Upload, X, ImageIcon, Copy, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const SUPABASE_URL = "https://qdxtmdyagsxtvtjaxqou.supabase.co";

const currencies = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CHF', label: 'CHF (Fr)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
];

const conflictPolicies = [
  { value: 'external_priority', label: 'External Platform Priority' },
  { value: 'website_priority', label: 'Website Priority' },
  { value: 'first_booking', label: 'First Booking Wins' },
];

type ICalFeed = {
  id: string;
  hotel_id: string;
  name: string;
  ical_url: string;
  room_type_id: string | null;
  sync_enabled: boolean;
  priority_level: number;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
};

const AdminSettings = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useAdminTheme();
  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Logo upload state
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // iCal state
  const [feeds, setFeeds] = useState<ICalFeed[]>([]);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [newFeed, setNewFeed] = useState({ name: '', ical_url: '', room_type_id: '' });
  const [addingFeed, setAddingFeed] = useState(false);
  const [syncingFeedId, setSyncingFeedId] = useState<string | null>(null);

  useEffect(() => { fetchAll(); fetchExchangeRates(); }, []);

  const fetchAll = async () => {
    const [hotelRes, feedsRes, rtRes] = await Promise.all([
      supabase.from('hotels').select('*').limit(1).single(),
      supabase.from('ical_feeds').select('*').order('created_at', { ascending: false }),
      supabase.from('room_types').select('id, name'),
    ]);
    setHotel(hotelRes.data);
    setFeeds((feedsRes.data as ICalFeed[]) || []);
    setRoomTypes(rtRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!hotel) return;
    setSaving(true);
    const { error } = await supabase.from('hotels').update({
      name: hotel.name, logo_url: hotel.logo_url, address: hotel.address, email: hotel.email,
      phone: hotel.phone, currency: hotel.currency, check_in_time: hotel.check_in_time,
      check_out_time: hotel.check_out_time, booking_policy: hotel.booking_policy,
      cancellation_policy: hotel.cancellation_policy, tax_percentage: hotel.tax_percentage,
      conflict_policy: hotel.conflict_policy,
      cleaning_duration_minutes: hotel.cleaning_duration_minutes || 120,
      updated_at: new Date().toISOString(),
    }).eq('id', hotel.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t('admin.settingsSaved'));
  };

  const update = (key: string, value: any) => setHotel((h: any) => ({ ...h, [key]: value }));

  // Logo upload handlers
  const uploadLogo = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop() || 'png';
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `logos/${fileName}`;

    const { error } = await supabase.storage.from('room-images').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    setUploading(false);

    if (error) {
      toast.error('Upload failed: ' + error.message);
      return;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/room-images/${filePath}`;
    update('logo_url', publicUrl);
    toast.success('Logo uploaded');
  }, []);

  const handleLogoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadLogo(file);
  }, [uploadLogo]);

  const handleLogoFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogo(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [uploadLogo]);

  const removeLogo = () => update('logo_url', '');

  // iCal feed handlers
  const handleAddFeed = async () => {
    if (!newFeed.name || !newFeed.ical_url) { toast.error('Name and URL are required'); return; }
    setAddingFeed(true);
    const { error } = await supabase.from('ical_feeds').insert({
      hotel_id: hotel.id,
      name: newFeed.name,
      ical_url: newFeed.ical_url,
      room_type_id: newFeed.room_type_id || null,
    });
    setAddingFeed(false);
    if (error) { toast.error(error.message); return; }
    toast.success('iCal feed added');
    setShowAddFeed(false);
    setNewFeed({ name: '', ical_url: '', room_type_id: '' });
    fetchAll();
  };

  const handleDeleteFeed = async (id: string) => {
    if (!confirm('Delete this iCal feed?')) return;
    const { error } = await supabase.from('ical_feeds').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Feed deleted');
    fetchAll();
  };

  const handleToggleFeed = async (id: string, enabled: boolean) => {
    const { error } = await supabase.from('ical_feeds').update({ sync_enabled: enabled, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setFeeds(prev => prev.map(f => f.id === id ? { ...f, sync_enabled: enabled } : f));
  };

  const handleSyncNow = async (feedId: string) => {
    setSyncingFeedId(feedId);
    try {
      const { data, error } = await supabase.functions.invoke('sync-ical', {
        body: { feed_id: feedId },
      });
      if (error) { toast.error(error.message); return; }
      const result = data?.results?.[0];
      if (result) {
        toast.success(`Synced: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped${result.conflicts > 0 ? `, ${result.conflicts} conflicts` : ''}`);
        if (result.errors?.length > 0) {
          result.errors.forEach((e: string) => toast.error(e));
        }
      } else {
        toast.success('Sync completed');
      }
      fetchAll();
    } catch (e) {
      toast.error('Sync failed');
    } finally {
      setSyncingFeedId(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!hotel) return <div className="text-center text-muted-foreground py-12">No hotel configured.</div>;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Appearance */}
      <section className="bg-card rounded-[0.625rem] border border-border/60 p-6 space-y-4 shadow-card">
        <h2 className="text-sm font-semibold">{t('admin.appearance')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>{t('admin.language')}</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => (
                  <SelectItem key={code} value={code}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('admin.theme')}</Label>
            <div className="flex gap-2 mt-1.5">
              <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')} className="flex-1">
                <Sun size={14} className="mr-1.5" /> {t('admin.light')}
              </Button>
              <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')} className="flex-1">
                <Moon size={14} className="mr-1.5" /> {t('admin.dark')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Hotel Info */}
      <section className="bg-card rounded-[0.625rem] border border-border/60 p-6 space-y-4 shadow-card">
        <h2 className="text-sm font-semibold">{t('admin.hotelInfo')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label>{t('admin.hotelName')}</Label><Input value={hotel.name} onChange={e => update('name', e.target.value)} /></div>
          
          {/* Logo Upload - Drag & Drop */}
          <div className="sm:col-span-2">
            <Label className="mb-2 block">{t('admin.logoUrl')}</Label>
            {hotel.logo_url ? (
              <div className="relative rounded-[0.625rem] overflow-hidden border border-border/60 bg-muted/30 p-4 flex items-center gap-4">
                <img src={hotel.logo_url} alt="Hotel logo" className="h-16 w-auto max-w-[200px] object-contain rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Hotel Logo</p>
                  <p className="text-xs text-muted-foreground">Click remove to change</p>
                </div>
                <button
                  onClick={removeLogo}
                  className="w-8 h-8 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-sm"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleLogoDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'relative flex flex-col items-center justify-center h-32 rounded-[0.625rem] border-2 border-dashed cursor-pointer transition-all duration-300',
                  dragOver ? 'border-primary bg-primary/5 shadow-lg' : 'border-border hover:border-primary/50 hover:bg-muted/30 hover:shadow-md',
                  uploading && 'pointer-events-none opacity-60'
                )}
              >
                {uploading ? (
                  <>
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs text-muted-foreground">Uploading...</p>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2 shadow-sm">
                      <ImageIcon size={20} className="text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="text-primary font-medium">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG, SVG up to 5MB</p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoFileSelect}
                />
              </div>
            )}
          </div>

          <div className="sm:col-span-2"><Label>{t('admin.address')}</Label><Input value={hotel.address || ''} onChange={e => update('address', e.target.value)} /></div>
          <div><Label>{t('admin.email')}</Label><Input type="email" value={hotel.email || ''} onChange={e => update('email', e.target.value)} /></div>
          <div><Label>{t('admin.phone')}</Label><Input value={hotel.phone || ''} onChange={e => update('phone', e.target.value)} /></div>
        </div>
      </section>

      {/* Operations */}
      <section className="bg-card rounded-[0.625rem] border border-border/60 p-6 space-y-4 shadow-card">
        <h2 className="text-sm font-semibold">{t('admin.operations')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>{t('admin.currency')}</Label>
            <Select value={hotel.currency} onValueChange={v => update('currency', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {currencies.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>{t('admin.checkInTime')}</Label><Input type="time" value={hotel.check_in_time || ''} onChange={e => update('check_in_time', e.target.value)} /></div>
          <div><Label>{t('admin.checkOutTime')}</Label><Input type="time" value={hotel.check_out_time || ''} onChange={e => update('check_out_time', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>{t('admin.taxPercentage')}</Label><Input type="number" min={0} max={100} step={0.01} value={hotel.tax_percentage || 0} onChange={e => update('tax_percentage', parseFloat(e.target.value) || 0)} /></div>
          <div>
            <Label>Cleaning Duration (minutes)</Label>
            <Input type="number" min={15} max={480} step={15} value={hotel.cleaning_duration_minutes || 120} onChange={e => update('cleaning_duration_minutes', parseInt(e.target.value) || 120)} />
            <p className="text-xs text-muted-foreground mt-1">Time rooms are marked as "Cleaning" after checkout</p>
          </div>
        </div>
      </section>

      {/* Policies */}
      <section className="bg-card rounded-[0.625rem] border border-border/60 p-6 space-y-4 shadow-card">
        <h2 className="text-sm font-semibold">{t('admin.policies')}</h2>
        <div><Label>{t('admin.bookingPolicy')}</Label><Textarea value={hotel.booking_policy || ''} onChange={e => update('booking_policy', e.target.value)} rows={3} /></div>
        <div><Label>{t('admin.cancellationPolicy')}</Label><Textarea value={hotel.cancellation_policy || ''} onChange={e => update('cancellation_policy', e.target.value)} rows={3} /></div>
      </section>

      {/* ===== iCal Synchronization ===== */}
      <section className="bg-card rounded-[0.625rem] border border-border/60 p-6 space-y-4 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Rss size={14} /> iCal Synchronization</h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddFeed(true)} className="gap-1.5">
            <Plus size={14} /> Add iCal Feed
          </Button>
        </div>

        {/* Conflict Policy */}
        <div>
          <Label>Conflict Resolution Policy</Label>
          <Select value={hotel.conflict_policy || 'external_priority'} onValueChange={v => update('conflict_policy', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {conflictPolicies.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">Determines how conflicts are interpreted. Conflicts are flagged but never auto-cancelled.</p>
        </div>

        {/* Feed List */}
        {feeds.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Globe size={24} className="mx-auto mb-2 opacity-40" />
            <p>No iCal feeds configured</p>
            <p className="text-xs">Add feeds to sync external bookings from Booking.com, Airbnb, etc.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {feeds.map(feed => {
              const roomType = roomTypes.find(rt => rt.id === feed.room_type_id);
              return (
                <Collapsible key={feed.id}>
                  <div className="border border-border/60 rounded-[0.625rem] shadow-sm">
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/30 transition-colors text-left rounded-[0.625rem]">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-2 h-2 rounded-full ${feed.sync_enabled ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{feed.name}</p>
                          <p className="text-xs text-muted-foreground">{roomType?.name || 'No room mapped'}</p>
                        </div>
                      </div>
                      <ChevronDown size={14} className="text-muted-foreground shrink-0" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-3 border-t border-border/60 pt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">iCal URL</p>
                          <p className="text-xs font-mono break-all bg-muted/30 rounded-lg p-2 mt-1">{feed.ical_url}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground">Last Sync</p>
                            <p className="text-xs">{feed.last_sync ? new Date(feed.last_sync).toLocaleString() : 'Never'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Enabled</Label>
                            <Switch
                              checked={feed.sync_enabled}
                              onCheckedChange={(v) => handleToggleFeed(feed.id, v)}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 flex-1"
                            onClick={() => handleSyncNow(feed.id)}
                            disabled={syncingFeedId === feed.id}
                          >
                            <RefreshCw size={12} className={syncingFeedId === feed.id ? 'animate-spin' : ''} />
                            {syncingFeedId === feed.id ? 'Syncing...' : 'Sync Now'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30"
                            onClick={() => handleDeleteFeed(feed.id)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </section>

      <Button onClick={handleSave} disabled={saving}>{saving ? t('admin.saving') : t('admin.saveSettings')}</Button>

      {/* Add Feed Dialog */}
      <Dialog open={showAddFeed} onOpenChange={setShowAddFeed}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add iCal Feed</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Feed Name *</Label>
              <Input value={newFeed.name} onChange={e => setNewFeed(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Booking.com Deluxe" />
            </div>
            <div>
              <Label>iCal URL *</Label>
              <Input value={newFeed.ical_url} onChange={e => setNewFeed(p => ({ ...p, ical_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>Room Type</Label>
              <Select value={newFeed.room_type_id} onValueChange={v => setNewFeed(p => ({ ...p, room_type_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                <SelectContent>
                  {roomTypes.map(rt => <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddFeed} disabled={addingFeed} className="w-full">
              {addingFeed ? 'Adding...' : 'Add Feed'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;
