import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { useHotel } from '@/hooks/useHotel';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { CalendarIcon, Check, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import roomDeluxe from '@/assets/room-deluxe.jpg';
import roomSuite from '@/assets/room-suite.jpg';
import roomPenthouse from '@/assets/room-penthouse.jpg';

const fallbackImages: Record<string, string> = { 'Deluxe Room': roomDeluxe, 'Grand Suite': roomSuite, 'Presidential Penthouse': roomPenthouse };

const Booking = () => {
  const { t } = useLanguage();
  const { hotel } = useHotel();
  const cur = hotel?.currency || 'USD';
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState(searchParams.get('room') || '');
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState('2');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checkingAvail, setCheckingAvail] = useState(false);

  useEffect(() => {
    supabase.from('room_types').select('*').eq('show_on_website', true).order('base_price')
      .then(({ data }) => { setRoomTypes(data || []); setLoadingRooms(false); });
  }, []);

  const room = roomTypes.find(r => r.id === selectedRoom);
  const nights = checkIn && checkOut ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const totalPrice = room ? Number(room.base_price) * nights : 0;

  const getRoomImage = (rt: any) => {
    if (rt.image_url && rt.image_url.startsWith('http')) return rt.image_url;
    return fallbackImages[rt.name] || roomDeluxe;
  };

  useEffect(() => {
    if (!selectedRoom || !checkIn || !checkOut || nights <= 0) { setAvailable(null); return; }
    const check = async () => {
      setCheckingAvail(true);
      const ci = format(checkIn, 'yyyy-MM-dd');
      const co = format(checkOut, 'yyyy-MM-dd');
      const { count } = await supabase.from('reservations').select('*', { count: 'exact', head: true }).eq('room_type_id', selectedRoom).neq('status', 'cancelled').lt('check_in', co).gt('check_out', ci);
      const { count: blockedCount } = await supabase.from('availability_blocks').select('*', { count: 'exact', head: true }).eq('room_type_id', selectedRoom).gte('date', ci).lt('date', co);
      const rt = roomTypes.find(r => r.id === selectedRoom);
      setAvailable((count || 0) < (rt?.available_units || 1) && (blockedCount || 0) === 0);
      setCheckingAvail(false);
    };
    check();
  }, [selectedRoom, checkIn, checkOut, nights, roomTypes]);

  const canProceed = selectedRoom && checkIn && checkOut && nights > 0 && available;

  const handleSubmit = async () => {
    if (!room || !checkIn || !checkOut) return;
    setSubmitting(true);
    const { data: h } = await supabase.from('hotels').select('id').limit(1).maybeSingle();
    if (!h) { toast.error('Hotel not configured'); setSubmitting(false); return; }
    const { error } = await supabase.from('reservations').insert({
      hotel_id: h.id, guest_name: name, guest_email: email, guest_phone: phone,
      room_type_id: selectedRoom, check_in: format(checkIn, 'yyyy-MM-dd'), check_out: format(checkOut, 'yyyy-MM-dd'),
      guests_count: parseInt(guests), status: 'pending', payment_status: 'unpaid',
      total_price: totalPrice, booking_source: 'website', special_requests: specialRequests || null,
    });
    setSubmitting(false);
    if (error) { toast.error('Failed to submit reservation.'); return; }
    setSubmitted(true);
    toast.success(t('booking.submitted'));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 pb-20 px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto text-center glass-card rounded-2xl p-12">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6"><Check size={32} className="text-primary" /></div>
            <h2 className="font-display text-2xl font-semibold mb-3">{t('booking.submitted')}</h2>
            <p className="text-muted-foreground mb-2">{t('booking.submittedThank')}</p>
            <p className="text-muted-foreground text-sm mb-2"><strong>{room?.name}</strong> · {checkIn && format(checkIn, 'MMM dd, yyyy')} — {checkOut && format(checkOut, 'MMM dd, yyyy')} · {nights} {nights > 1 ? t('booking.nights') : t('booking.night')}</p>
            <p className="text-xs text-muted-foreground mb-8">{t('booking.pendingNote')}</p>
            <Link to="/"><Button className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body">{t('booking.returnHome')}</Button></Link>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-20 px-4">
        <div className="container-luxury max-w-4xl">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-6 text-sm"><ArrowLeft size={16} /> {t('booking.backHome')}</Link>
          <h1 className="font-display text-3xl md:text-4xl font-semibold mb-2">{t('booking.title')}</h1>
          <p className="text-muted-foreground mb-10">{t('booking.subtitle')}</p>

          <div className="flex items-center gap-3 mb-10">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all', step >= s ? 'bg-gradient-gold text-primary-foreground' : 'bg-muted text-muted-foreground')}>{step > s ? <Check size={16} /> : s}</div>
                <span className="text-sm hidden sm:inline">{s === 1 ? t('booking.roomDates') : t('booking.guestDetails')}</span>
                {s < 2 && <div className={cn('w-12 h-px', step > 1 ? 'bg-primary' : 'bg-border')} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div>
                <label className="font-display text-lg font-medium block mb-4">{t('booking.selectRoom')}</label>
                {loadingRooms ? <div className="flex items-center justify-center h-32"><Loader2 className="animate-spin text-primary" /></div>
                : roomTypes.length === 0 ? <p className="text-muted-foreground text-sm">{t('rooms.noRooms')}</p>
                : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {roomTypes.map(r => (
                      <button key={r.id} onClick={() => setSelectedRoom(r.id)} className={cn('glass-card rounded-xl overflow-hidden text-left transition-all duration-300', selectedRoom === r.id ? 'ring-2 ring-primary shadow-gold' : 'hover:shadow-gold/50')}>
                        <img src={getRoomImage(r)} alt={r.name} className="w-full h-32 object-cover" />
                        <div className="p-4"><h4 className="font-display text-sm font-medium">{r.name}</h4><p className="text-primary text-sm font-semibold mt-1">{formatCurrency(Number(r.base_price), cur)}{t('rooms.perNight')}</p></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">{t('booking.checkInDate')}</label>
                  <Popover><PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal bg-muted/50', !checkIn && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{checkIn ? format(checkIn, 'PPP') : t('booking.selectDate')}</Button>
                  </PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={checkIn} onSelect={setCheckIn} disabled={(d) => d < new Date()} initialFocus className="p-3 pointer-events-auto" /></PopoverContent></Popover>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">{t('booking.checkOutDate')}</label>
                  <Popover><PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal bg-muted/50', !checkOut && 'text-muted-foreground')}><CalendarIcon className="mr-2 h-4 w-4" />{checkOut ? format(checkOut, 'PPP') : t('booking.selectDate')}</Button>
                  </PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={checkOut} onSelect={setCheckOut} disabled={(d) => d <= (checkIn || new Date())} initialFocus className="p-3 pointer-events-auto" /></PopoverContent></Popover>
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">{t('booking.numGuests')}</label>
                <Select value={guests} onValueChange={setGuests}>
                  <SelectTrigger className="w-full sm:w-48 bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>{[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n} {n > 1 ? t('booking.guestsLabel') : t('booking.guest')}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {checkingAvail && <div className="glass-card rounded-xl p-4 flex items-center gap-3"><Loader2 className="animate-spin text-primary" size={20} /><p className="text-sm">{t('booking.checkingAvail')}</p></div>}
              {!checkingAvail && available !== null && (
                <div className={cn('glass-card rounded-xl p-4 flex items-center gap-3', available ? 'border-primary/30' : 'border-destructive/30')}>
                  {available ? <>
                    <Check className="text-primary" size={20} />
                    <div><p className="text-sm font-medium">{t('booking.available')}</p><p className="text-xs text-muted-foreground">{room?.name} · {nights} {nights > 1 ? t('booking.nights') : t('booking.night')} · {t('booking.total')}: {formatCurrency(totalPrice, cur)}</p></div>
                  </> : <>
                    <AlertCircle className="text-destructive" size={20} />
                    <div><p className="text-sm font-medium text-destructive">{t('booking.notAvailable')}</p><p className="text-xs text-muted-foreground">{t('booking.notAvailableDesc')}</p></div>
                  </>}
                </div>
              )}
              <Button disabled={!canProceed} onClick={() => setStep(2)} className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body tracking-wide px-8">{t('booking.continue')}</Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="glass-card rounded-xl p-6 mb-6">
                <h3 className="font-display text-lg font-medium mb-2">{t('booking.bookingSummary')}</h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong className="text-foreground">{room?.name}</strong></p>
                  <p>{checkIn && format(checkIn, 'MMM dd, yyyy')} — {checkOut && format(checkOut, 'MMM dd, yyyy')}</p>
                  <p>{nights} {nights > 1 ? t('booking.nights') : t('booking.night')} · {guests} {parseInt(guests) > 1 ? t('booking.guestsLabel') : t('booking.guest')}</p>
                  <p className="text-primary font-semibold text-lg mt-2">{t('booking.total')}: {formatCurrency(totalPrice, cur)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="text-sm text-muted-foreground mb-1.5 block">{t('booking.fullName')} *</label><Input required value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="bg-muted/50" /></div>
                <div><label className="text-sm text-muted-foreground mb-1.5 block">{t('booking.email')} *</label><Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" className="bg-muted/50" /></div>
              </div>
              <div><label className="text-sm text-muted-foreground mb-1.5 block">{t('booking.phone')} *</label><Input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="bg-muted/50" /></div>
              <div><label className="text-sm text-muted-foreground mb-1.5 block">{t('booking.specialRequests')}</label><Textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} placeholder="Any special requirements..." rows={4} className="bg-muted/50 resize-none" /></div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="font-body">{t('booking.back')}</Button>
                <Button disabled={!name || !email || !phone || submitting} onClick={handleSubmit} className="bg-gradient-gold text-primary-foreground border-0 hover:opacity-90 font-body tracking-wide px-8">{submitting ? t('booking.submitting') : t('booking.submit')}</Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Booking;
