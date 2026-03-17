import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface DataExportButtonProps {
  data: Record<string, any>[];
  filename: string;
  label?: string;
  hotelName?: string;
}

function formatDateDDMMYYYY(val: any): string {
  if (!val) return '';
  const s = String(val);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  // Parse yyyy-MM-dd manually to avoid UTC timezone issues
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function isDateField(key: string): boolean {
  return /date|check_in|check_out|created_at|updated_at|issued_at|due_at|imported_at/i.test(key);
}

function formatForCSV(data: Record<string, any>[]): Record<string, any>[] {
  return data.map(row => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = isDateField(k) ? formatDateDDMMYYYY(v) : (v ?? '');
    }
    return out;
  });
}

export function DataExportButton({ data, filename, label = 'Export', hotelName }: DataExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportCSV = () => {
    if (!data.length) { toast.error('No data to export'); return; }
    setExporting(true);
    try {
      const formatted = formatForCSV(data);
      const headers = Object.keys(formatted[0]);
      const csv = [
        headers.join(','),
        ...formatted.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${filename}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data.length} rows as CSV`);
    } catch (e) { toast.error('Export failed'); }
    setExporting(false);
  };

  const exportExcel = () => {
    if (!data.length) { toast.error('No data to export'); return; }
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const headers = Object.keys(data[0]);
      const exportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      // Build rows: title row, blank, headers, data, blank, summary
      const wsData: any[][] = [];

      // Row 0: Hotel name + export date
      const titleRow: any[] = [hotelName || 'Data Export', '', '', `Exported: ${exportDate}`];
      wsData.push(titleRow);
      wsData.push([]); // blank row

      // Row 2: Column headers
      const prettyHeaders = headers.map(h =>
        h.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      );
      wsData.push(prettyHeaders);

      // Data rows with formatted dates
      const formatted = formatForCSV(data);
      for (const row of formatted) {
        wsData.push(headers.map(h => row[h] ?? ''));
      }

      // Summary row
      wsData.push([]); // blank
      const totalRes = data.length;
      const revenueIdx = headers.findIndex(h => /total_price|amount|revenue/i.test(h));
      const checkInIdx = headers.findIndex(h => /check_in/i.test(h));
      const checkOutIdx = headers.findIndex(h => /check_out/i.test(h));

      let totalRevenue = 0;
      let totalNights = 0;
      let nightsCount = 0;

      for (const row of data) {
        if (revenueIdx >= 0) {
          const val = parseFloat(row[headers[revenueIdx]]);
          if (!isNaN(val)) totalRevenue += val;
        }
        if (checkInIdx >= 0 && checkOutIdx >= 0) {
          const ci = new Date(row[headers[checkInIdx]]);
          const co = new Date(row[headers[checkOutIdx]]);
          if (!isNaN(ci.getTime()) && !isNaN(co.getTime())) {
            const n = Math.round((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
            if (n > 0) { totalNights += n; nightsCount++; }
          }
        }
      }

      const summaryRow: any[] = new Array(headers.length).fill('');
      summaryRow[0] = 'SUMMARY';
      summaryRow[1] = `Total: ${totalRes} reservations`;
      if (revenueIdx >= 0) summaryRow[2] = `Revenue: ${totalRevenue.toFixed(2)}`;
      if (nightsCount > 0) summaryRow[3] = `Avg Stay: ${(totalNights / nightsCount).toFixed(1)} nights`;
      wsData.push(summaryRow);

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Column widths - auto-fit based on content
      const colWidths = headers.map((h, i) => {
        let maxLen = prettyHeaders[i].length;
        for (const row of formatted) {
          const cellLen = String(row[h] ?? '').length;
          if (cellLen > maxLen) maxLen = cellLen;
        }
        return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
      });
      ws['!cols'] = colWidths;

      // Freeze panes: freeze row 3 (the header row, 0-indexed row 2)
      ws['!freeze'] = { xSplit: 0, ySplit: 3 };
      // SheetJS uses '!freeze' sometimes but the standard is views:
      if (!ws['!views']) ws['!views'] = [];
      (ws['!views'] as any[]).push({ state: 'frozen', ySplit: 3 });

      // Styling via cell properties
      const headerRowIdx = 2; // 0-indexed
      const dataStartRow = 3;
      const dataEndRow = dataStartRow + data.length - 1;
      const summaryRowIdx = dataEndRow + 2;
      const totalRows = wsData.length;

      // Apply styles
      for (let R = 0; R < totalRows; R++) {
        for (let C = 0; C < headers.length; C++) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
          const cell = ws[cellRef];

          if (!cell.s) cell.s = {};

          // Title row
          if (R === 0) {
            cell.s = {
              font: { bold: true, sz: 14, color: { rgb: '1A1A2E' } },
              fill: { fgColor: { rgb: 'FFFFFF' } },
            };
          }
          // Header row
          else if (R === headerRowIdx) {
            cell.s = {
              font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: '1A1A2E' } },
              alignment: { horizontal: 'center', vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '1A1A2E' } },
                bottom: { style: 'thin', color: { rgb: '1A1A2E' } },
                left: { style: 'thin', color: { rgb: '1A1A2E' } },
                right: { style: 'thin', color: { rgb: '1A1A2E' } },
              },
            };
          }
          // Data rows - alternating colors
          else if (R >= dataStartRow && R <= dataEndRow) {
            const isEven = (R - dataStartRow) % 2 === 0;
            cell.s = {
              font: { sz: 9 },
              fill: { fgColor: { rgb: isEven ? 'FFFFFF' : 'F5F5F5' } },
              border: {
                top: { style: 'thin', color: { rgb: 'E0E0E0' } },
                bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
                left: { style: 'thin', color: { rgb: 'E0E0E0' } },
                right: { style: 'thin', color: { rgb: 'E0E0E0' } },
              },
            };
          }
          // Summary row
          else if (R === summaryRowIdx) {
            cell.s = {
              font: { bold: true, sz: 10, color: { rgb: '1A1A2E' } },
              fill: { fgColor: { rgb: 'E8EAF6' } },
              border: {
                top: { style: 'medium', color: { rgb: '1A1A2E' } },
                bottom: { style: 'medium', color: { rgb: '1A1A2E' } },
              },
            };
          }
        }
      }

      // Merge title cell across first 3 columns
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } });

      XLSX.utils.book_append_sheet(wb, ws, 'Reservations');
      XLSX.writeFile(wb, `${filename}.xlsx`, { bookSST: true });
      toast.success(`Exported ${data.length} rows as Excel`);
    } catch (e) {
      console.error('Export error:', e);
      toast.error('Export failed');
    }
    setExporting(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={exporting}>
          <Download size={14} /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCSV} className="gap-2 text-xs">
          <FileText size={14} /> Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel} className="gap-2 text-xs">
          <FileSpreadsheet size={14} /> Export as Excel (.xlsx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
