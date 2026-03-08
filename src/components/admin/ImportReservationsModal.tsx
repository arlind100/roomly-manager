import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportReservationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomTypes: any[];
  hotelId: string;
  onImported: () => void;
}

type ColumnMapping = {
  guest_name: string;
  check_in: string;
  check_out: string;
  room_type: string;
  guests_count: string;
  total_price: string;
  external_id: string;
  platform: string;
};

const EXPECTED_COLUMNS: (keyof ColumnMapping)[] = [
  'guest_name', 'check_in', 'check_out', 'room_type', 'guests_count', 'total_price', 'external_id', 'platform'
];

const COLUMN_LABELS: Record<keyof ColumnMapping, string> = {
  guest_name: 'Guest Name',
  check_in: 'Check-in Date',
  check_out: 'Check-out Date',
  room_type: 'Room Type',
  guests_count: 'Guests',
  total_price: 'Total Price',
  external_id: 'Reservation ID',
  platform: 'Source Platform',
};

const REQUIRED_COLUMNS: (keyof ColumnMapping)[] = ['guest_name', 'check_in', 'check_out'];

// Auto-detect column mapping based on header names
function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { guest_name: '', check_in: '', check_out: '', room_type: '', guests_count: '', total_price: '', external_id: '', platform: '' };
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  const patterns: Record<keyof ColumnMapping, RegExp[]> = {
    guest_name: [/guest.?name/i, /name/i, /client/i, /ospite/i, /nom/i],
    check_in: [/check.?in/i, /arrival/i, /arriv/i, /start/i, /from/i, /date.?in/i],
    check_out: [/check.?out/i, /departure/i, /depart/i, /end/i, /to/i, /date.?out/i],
    room_type: [/room.?type/i, /room/i, /type/i, /camera/i, /chambre/i, /accommodation/i],
    guests_count: [/guest.*count/i, /guests/i, /pax/i, /persons/i, /people/i, /ospiti/i, /personnes/i],
    total_price: [/total.?price/i, /price/i, /amount/i, /total/i, /cost/i, /prezzo/i, /prix/i],
    external_id: [/reservation.?id/i, /booking.?id/i, /external.?id/i, /ref/i, /confirmation/i, /codice/i],
    platform: [/platform/i, /source/i, /channel/i, /origin/i, /fonte/i],
  };

  for (const key of EXPECTED_COLUMNS) {
    for (const pattern of patterns[key]) {
      const idx = lowerHeaders.findIndex(h => pattern.test(h));
      if (idx >= 0 && !Object.values(mapping).includes(headers[idx])) {
        mapping[key] = headers[idx];
        break;
      }
    }
  }
  return mapping;
}

// Normalize date string to YYYY-MM-DD
function normalizeDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY
  const m1 = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;
  // MM/DD/YYYY
  const m2 = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (m2) {
    const month = parseInt(m2[1]), day = parseInt(m2[2]);
    if (month <= 12 && day <= 31) return `${m2[3]}-${m2[1].padStart(2, '0')}-${m2[2].padStart(2, '0')}`;
  }
  // Try native parse
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

type RowStatus = 'ok' | 'duplicate' | 'conflict' | 'error';

interface ParsedRow {
  raw: Record<string, any>;
  guest_name: string;
  check_in: string;
  check_out: string;
  room_type_name: string;
  room_type_id: string | null;
  guests_count: number;
  total_price: number;
  external_id: string;
  platform: string;
  status: RowStatus;
  statusMessage: string;
}

export function ImportReservationsModal({ open, onOpenChange, roomTypes, hotelId, onImported }: ImportReservationsModalProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ guest_name: '', check_in: '', check_out: '', room_type: '', guests_count: '', total_price: '', external_id: '', platform: '' });
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ total: number; imported: number; duplicates: number; conflicts: number; errors: number } | null>(null);
  const [defaultPlatform, setDefaultPlatform] = useState('booking.com');
  const [importHistory, setImportHistory] = useState<any[]>([]);

  // Load import history
  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from('import_logs' as any).select('*').eq('hotel_id', hotelId).order('imported_at', { ascending: false }).limit(10);
    setImportHistory(data || []);
  }, [hotelId]);

  useEffect(() => { if (open) loadHistory(); }, [open, loadHistory]);

  const reset = () => {
    setStep(1); setFileName(''); setHeaders([]); setRawRows([]); setParsedRows([]); setImportResult(null);
    setMapping({ guest_name: '', check_in: '', check_out: '', room_type: '', guests_count: '', total_price: '', external_id: '', platform: '' });
  };

  // Step 1: File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

    if (json.length === 0) { toast.error('File is empty'); return; }

    const hdrs = Object.keys(json[0]);
    setHeaders(hdrs);
    setRawRows(json);
    setMapping(autoDetectMapping(hdrs));
    setStep(2);
  };

  // Step 2 → 3: Parse and validate rows
  const processRows = async () => {
    const rows: ParsedRow[] = [];

    // Fetch existing external IDs to check duplicates
    const { data: existingRes } = await supabase.from('reservations')
      .select('external_reservation_id, external_platform')
      .eq('is_external', true)
      .eq('hotel_id', hotelId);
    const existingSet = new Set((existingRes || []).map(r => `${r.external_platform}::${r.external_reservation_id}`));

    // Fetch active reservations for conflict detection
    const { data: activeRes } = await supabase.from('reservations')
      .select('room_type_id, check_in, check_out')
      .eq('hotel_id', hotelId)
      .neq('status', 'cancelled');

    for (const raw of rawRows) {
      const guest_name = String(raw[mapping.guest_name] || '').trim();
      const check_in = normalizeDate(raw[mapping.check_in]);
      const check_out = normalizeDate(raw[mapping.check_out]);
      const room_type_name = String(raw[mapping.room_type] || '').trim();
      const guests_count = parseInt(raw[mapping.guests_count]) || 1;
      const total_price = parseFloat(raw[mapping.total_price]) || 0;
      const external_id = String(raw[mapping.external_id] || '').trim();
      const platform = String(raw[mapping.platform] || '').trim() || defaultPlatform;

      // Match room type
      const rt = roomTypes.find(r => r.name.toLowerCase() === room_type_name.toLowerCase());

      let status: RowStatus = 'ok';
      let statusMessage = '';

      if (!guest_name || !check_in || !check_out) {
        status = 'error';
        statusMessage = 'Missing required fields';
      } else if (external_id && existingSet.has(`${platform}::${external_id}`)) {
        status = 'duplicate';
        statusMessage = 'Already imported';
      } else if (rt) {
        // Check conflicts
        const overlapping = (activeRes || []).filter(r =>
          r.room_type_id === rt.id && r.check_in < check_out && r.check_out > check_in
        );
        if (overlapping.length >= rt.available_units) {
          status = 'conflict';
          statusMessage = 'Date conflict with existing booking';
        }
      }

      rows.push({
        raw, guest_name, check_in: check_in || '', check_out: check_out || '',
        room_type_name, room_type_id: rt?.id || null, guests_count, total_price,
        external_id, platform, status, statusMessage,
      });
    }

    setParsedRows(rows);
    setStep(3);
  };

  // Step 3: Import
  const handleImport = async (skipConflicts: boolean) => {
    setImporting(true);
    const batchId = `IMP-${Date.now()}`;
    let imported = 0, duplicates = 0, conflicts = 0, errors = 0;

    for (const row of parsedRows) {
      if (row.status === 'error') { errors++; continue; }
      if (row.status === 'duplicate') { duplicates++; continue; }
      if (row.status === 'conflict' && skipConflicts) { conflicts++; continue; }
      if (row.status === 'conflict') conflicts++;

      const { error } = await supabase.from('reservations').insert({
        hotel_id: hotelId,
        guest_name: row.guest_name,
        check_in: row.check_in,
        check_out: row.check_out,
        room_type_id: row.room_type_id,
        guests_count: row.guests_count,
        total_price: row.total_price || null,
        external_reservation_id: row.external_id || null,
        external_platform: row.platform,
        import_batch_id: batchId,
        imported_at: new Date().toISOString(),
        is_external: true,
        status: 'confirmed',
        booking_source: row.platform,
      });

      if (error) { errors++; console.error('Import row error:', error); }
      else imported++;
    }

    // Log the import
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('import_logs' as any).insert({
      import_batch_id: batchId,
      filename: fileName,
      imported_by: user?.id,
      hotel_id: hotelId,
      records_imported: imported,
      duplicates_detected: duplicates,
      conflicts_detected: conflicts,
      errors,
    });

    setImportResult({ total: parsedRows.length, imported, duplicates, conflicts, errors });
    setStep(4);
    setImporting(false);
    onImported();
    loadHistory();
  };

  const okCount = parsedRows.filter(r => r.status === 'ok').length;
  const conflictCount = parsedRows.filter(r => r.status === 'conflict').length;
  const dupCount = parsedRows.filter(r => r.status === 'duplicate').length;
  const errCount = parsedRows.filter(r => r.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet size={20} />
            {t('admin.importReservations')}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          {[
            { n: 1, label: t('admin.importStep1') },
            { n: 2, label: t('admin.importStep2') },
            { n: 3, label: t('admin.importStep3') },
          ].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${step >= n ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {n}
              </div>
              <span className={step >= n ? 'text-foreground font-medium' : ''}>{label}</span>
              {n < 3 && <ArrowRight size={12} className="mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload size={40} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">{t('admin.importUploadDesc')}</p>
              <label>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                <Button asChild variant="outline"><span>{t('admin.importChooseFile')}</span></Button>
              </label>
            </div>

            {/* Import History */}
            {importHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">{t('admin.importHistory')}</h4>
                <div className="space-y-2">
                  {importHistory.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between text-xs bg-muted/50 rounded-md px-3 py-2">
                      <div>
                        <span className="font-medium">{log.filename}</span>
                        <span className="text-muted-foreground ml-2">{new Date(log.imported_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{log.records_imported} {t('admin.importImported')}</Badge>
                        {log.duplicates_detected > 0 && <Badge variant="outline">{log.duplicates_detected} dup</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Map columns */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('admin.importMapDesc')} <span className="font-medium">{fileName}</span> — {rawRows.length} {t('admin.importRows')}</p>

            <div className="grid grid-cols-2 gap-3">
              {EXPECTED_COLUMNS.map(col => (
                <div key={col}>
                  <Label className="text-xs">
                    {COLUMN_LABELS[col]}
                    {REQUIRED_COLUMNS.includes(col) && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  <Select value={mapping[col]} onValueChange={v => setMapping(m => ({ ...m, [col]: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None —</SelectItem>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Label className="text-xs whitespace-nowrap">{t('admin.importDefaultPlatform')}</Label>
              <Input value={defaultPlatform} onChange={e => setDefaultPlatform(e.target.value)} className="h-8 text-xs max-w-48" />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft size={14} className="mr-1" /> {t('booking.back')}
              </Button>
              <Button size="sm" onClick={processRows} disabled={!mapping.guest_name || !mapping.check_in || !mapping.check_out}>
                {t('admin.importPreview')} <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary"><CheckCircle2 size={12} className="mr-1" /> {okCount} {t('admin.importReady')}</Badge>
              {conflictCount > 0 && <Badge variant="outline" className="border-yellow-500 text-yellow-600"><AlertTriangle size={12} className="mr-1" /> {conflictCount} {t('admin.importConflicts')}</Badge>}
              {dupCount > 0 && <Badge variant="outline"><XCircle size={12} className="mr-1" /> {dupCount} {t('admin.importDuplicates')}</Badge>}
              {errCount > 0 && <Badge variant="destructive">{errCount} {t('admin.importErrors')}</Badge>}
            </div>

            <div className="overflow-x-auto max-h-[40vh] border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium">{t('admin.status')}</th>
                    <th className="text-left py-2 px-3 font-medium">{t('admin.guestName')}</th>
                    <th className="text-left py-2 px-3 font-medium">{t('admin.room')}</th>
                    <th className="text-left py-2 px-3 font-medium">{t('admin.checkIn')}</th>
                    <th className="text-left py-2 px-3 font-medium">{t('admin.checkOut')}</th>
                    <th className="text-left py-2 px-3 font-medium">{t('admin.guests')}</th>
                    <th className="text-right py-2 px-3 font-medium">{t('admin.totalPrice')}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row, i) => (
                    <tr key={i} className={`border-t border-border/50 ${row.status === 'error' ? 'bg-destructive/10' : row.status === 'duplicate' ? 'bg-muted/50 opacity-50' : row.status === 'conflict' ? 'bg-yellow-500/10' : ''}`}>
                      <td className="py-2 px-3">
                        {row.status === 'ok' && <CheckCircle2 size={14} className="text-green-500" />}
                        {row.status === 'duplicate' && <span className="text-muted-foreground">Dup</span>}
                        {row.status === 'conflict' && <span className="text-yellow-500"><AlertTriangle size={14} /></span>}
                        {row.status === 'error' && <span className="text-destructive"><XCircle size={14} /></span>}
                      </td>
                      <td className="py-2 px-3">{row.guest_name || '—'}</td>
                      <td className="py-2 px-3">
                        {row.room_type_id ? row.room_type_name : <span className="text-yellow-600">{row.room_type_name || '—'}</span>}
                      </td>
                      <td className="py-2 px-3">{row.check_in || '—'}</td>
                      <td className="py-2 px-3">{row.check_out || '—'}</td>
                      <td className="py-2 px-3">{row.guests_count}</td>
                      <td className="py-2 px-3 text-right">{row.total_price || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                <ArrowLeft size={14} className="mr-1" /> {t('booking.back')}
              </Button>
              <div className="flex gap-2">
                {conflictCount > 0 && (
                  <Button variant="outline" size="sm" onClick={() => handleImport(false)} disabled={importing}>
                    {t('admin.importWithConflicts')}
                  </Button>
                )}
                <Button size="sm" onClick={() => handleImport(true)} disabled={importing}>
                  {importing && <Loader2 size={14} className="mr-1 animate-spin" />}
                  {t('admin.importConfirm')} ({okCount + (conflictCount > 0 ? 0 : 0)})
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Summary */}
        {step === 4 && importResult && (
          <div className="space-y-4 text-center py-4">
            <CheckCircle2 size={48} className="mx-auto text-green-500" />
            <h3 className="text-lg font-semibold">{t('admin.importComplete')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-muted rounded-lg p-3">
                <div className="text-2xl font-bold">{importResult.total}</div>
                <div className="text-muted-foreground text-xs">{t('admin.importTotalRows')}</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-600">{importResult.imported}</div>
                <div className="text-muted-foreground text-xs">{t('admin.importImported')}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-2xl font-bold">{importResult.duplicates}</div>
                <div className="text-muted-foreground text-xs">{t('admin.importDuplicates')}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-2xl font-bold">{importResult.errors}</div>
                <div className="text-muted-foreground text-xs">{t('admin.importErrors')}</div>
              </div>
            </div>
            <Button onClick={() => { reset(); onOpenChange(false); }}>{t('admin.importDone')}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
