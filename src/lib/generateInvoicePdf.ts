import jsPDF from 'jspdf';

interface InvoiceData {
  invoiceNumber: string;
  issuedAt: string;
  dueAt?: string;
  hotelName: string;
  hotelAddress?: string;
  hotelEmail?: string;
  hotelPhone?: string;
  hotelLogoUrl?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  reservationCode?: string;
  checkIn?: string;
  checkOut?: string;
  roomName?: string;
  roomNumber?: string;
  guestsCount?: number;
  amount: number;
  currency: string;
  taxPercentage?: number;
  status: string;
  cancellationPolicy?: string;
}

// Color palette
const ACCENT = { r: 26, g: 26, b: 46 }; // #1a1a2e
const ACCENT_LIGHT = { r: 42, g: 42, b: 74 };
const TEXT_DARK = { r: 30, g: 30, b: 50 };
const TEXT_MED = { r: 100, g: 105, b: 120 };
const TEXT_LIGHT = { r: 150, g: 155, b: 165 };
const WHITE = { r: 255, g: 255, b: 255 };
const BG_LIGHT = { r: 247, g: 248, b: 250 };
const BORDER = { r: 220, g: 225, b: 235 };

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcNights(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 1;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function setColor(doc: jsPDF, c: { r: number; g: number; b: number }) {
  doc.setTextColor(c.r, c.g, c.b);
}

export function generateInvoicePdf(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const sym = data.currency === 'EUR' ? '€' : data.currency === 'GBP' ? '£' : '$';
  const tax = data.taxPercentage || 0;
  const nights = calcNights(data.checkIn, data.checkOut);
  const unitPrice = data.amount / nights;
  const subtotal = data.amount;
  const taxAmount = subtotal * (tax / 100);
  const total = subtotal + taxAmount;
  const pageW = 210;
  const marginL = 20;
  const marginR = 190;
  const contentW = marginR - marginL;

  // ─── HEADER BAR ───
  doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
  doc.rect(0, 0, pageW, 44, 'F');
  
  // Accent stripe
  doc.setFillColor(80, 120, 200);
  doc.rect(0, 44, pageW, 2, 'F');

  // Hotel name
  doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.hotelName, marginL, 22);

  // Hotel contact info under name
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 185, 210);
  const contactParts: string[] = [];
  if (data.hotelAddress) contactParts.push(data.hotelAddress);
  if (data.hotelPhone) contactParts.push(data.hotelPhone);
  if (data.hotelEmail) contactParts.push(data.hotelEmail);
  if (contactParts.length > 0) {
    const line1 = contactParts.slice(0, 2).join('  •  ');
    doc.text(line1, marginL, 30);
    if (contactParts.length > 2) {
      doc.text(contactParts.slice(2).join('  •  '), marginL, 36);
    }
  }

  // INVOICE title on right
  doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', marginR, 22, { align: 'right' });

  // Invoice meta on right
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 185, 210);
  doc.text(`#${data.invoiceNumber}`, marginR, 30, { align: 'right' });
  doc.text(`Issued: ${formatDate(data.issuedAt)}`, marginR, 36, { align: 'right' });
  if (data.dueAt) {
    doc.text(`Due: ${formatDate(data.dueAt)}`, marginR, 42, { align: 'right' });
  }

  let y = 56;

  // ─── TWO COLUMN: BILL TO + BOOKING DETAILS ───
  // Bill To (left)
  setColor(doc, TEXT_LIGHT);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', marginL, y);
  
  // Booking Details (right)
  doc.text('BOOKING DETAILS', 120, y);
  y += 7;

  // Guest info
  setColor(doc, TEXT_DARK);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(data.guestName, marginL, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setColor(doc, TEXT_MED);
  if (data.guestEmail) { doc.text(data.guestEmail, marginL, y); y += 5; }
  if (data.guestPhone) { doc.text(data.guestPhone, marginL, y); y += 5; }

  // Booking details (right column)
  let ry = 63;
  doc.setFontSize(8.5);
  
  const addDetailRow = (label: string, value: string) => {
    setColor(doc, TEXT_LIGHT);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 120, ry);
    setColor(doc, TEXT_DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(value, 155, ry);
    ry += 5.5;
  };

  if (data.reservationCode) addDetailRow('Reference:', data.reservationCode);
  if (data.checkIn) addDetailRow('Check-in:', formatDate(data.checkIn));
  if (data.checkOut) addDetailRow('Check-out:', formatDate(data.checkOut));
  if (data.roomName) addDetailRow('Room Type:', data.roomName);
  if (data.roomNumber) addDetailRow('Room No:', data.roomNumber);
  if (data.guestsCount) addDetailRow('Guests:', String(data.guestsCount));
  addDetailRow('Nights:', String(nights));

  y = Math.max(y, ry) + 8;

  // ─── DIVIDER ───
  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, marginR, y);
  y += 6;

  // ─── ITEMIZED TABLE ───
  // Table header
  const colDesc = marginL + 2;
  const colNights = 115;
  const colUnit = 145;
  const colTotal = marginR - 2;

  doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
  doc.roundedRect(marginL, y, contentW, 10, 1, 1, 'F');
  
  doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', colDesc, y + 7);
  doc.text('NIGHTS', colNights, y + 7, { align: 'center' });
  doc.text('UNIT PRICE', colUnit, y + 7, { align: 'center' });
  doc.text('TOTAL', colTotal, y + 7, { align: 'right' });
  y += 14;

  // Table row
  doc.setFillColor(BG_LIGHT.r, BG_LIGHT.g, BG_LIGHT.b);
  doc.rect(marginL, y - 3, contentW, 14, 'F');
  
  setColor(doc, TEXT_DARK);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(data.roomName || 'Accommodation', colDesc, y + 3);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setColor(doc, TEXT_MED);
  const stayDesc = data.checkIn && data.checkOut 
    ? `${formatDate(data.checkIn)} — ${formatDate(data.checkOut)}`
    : '';
  doc.text(stayDesc, colDesc, y + 8);

  setColor(doc, TEXT_DARK);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(String(nights), colNights, y + 5, { align: 'center' });
  doc.text(`${sym}${unitPrice.toFixed(2)}`, colUnit, y + 5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`${sym}${subtotal.toFixed(2)}`, colTotal, y + 5, { align: 'right' });
  y += 18;

  // Table bottom border
  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, marginR, y);
  y += 10;

  // ─── TOTALS SECTION ───
  const totalsX = 130;
  const totalsValX = marginR - 2;
  
  // Subtotal
  setColor(doc, TEXT_MED);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal', totalsX, y);
  setColor(doc, TEXT_DARK);
  doc.text(`${sym}${subtotal.toFixed(2)}`, totalsValX, y, { align: 'right' });
  y += 7;

  // Tax
  if (tax > 0) {
    setColor(doc, TEXT_MED);
    doc.text(`Tax (${tax}%)`, totalsX, y);
    setColor(doc, TEXT_DARK);
    doc.text(`${sym}${taxAmount.toFixed(2)}`, totalsValX, y, { align: 'right' });
    y += 7;
  }

  // Total box
  y += 2;
  doc.setFillColor(ACCENT.r, ACCENT.g, ACCENT.b);
  doc.roundedRect(totalsX - 5, y - 5, marginR - totalsX + 7, 14, 2, 2, 'F');
  doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL DUE', totalsX, y + 4);
  doc.setFontSize(13);
  doc.text(`${sym}${total.toFixed(2)}`, totalsValX, y + 4, { align: 'right' });

  // Status badge
  y += 20;
  const statusUpper = data.status.toUpperCase();
  const statusColors: Record<string, { r: number; g: number; b: number }> = {
    PAID: { r: 34, g: 139, b: 34 },
    SENT: { r: 59, g: 130, b: 246 },
    DRAFT: { r: 156, g: 163, b: 175 },
    OVERDUE: { r: 220, g: 38, b: 38 },
  };
  const badgeColor = statusColors[statusUpper] || statusColors.DRAFT;
  doc.setFillColor(badgeColor.r, badgeColor.g, badgeColor.b);
  const badgeW = doc.getTextWidth(statusUpper) + 12;
  doc.roundedRect(totalsX - 5, y - 4, badgeW + 6, 9, 2, 2, 'F');
  doc.setTextColor(WHITE.r, WHITE.g, WHITE.b);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(statusUpper, totalsX + 1, y + 2);

  // ─── FOOTER SECTION ───
  // Thank you message
  let footerY = 240;
  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.setLineWidth(0.2);
  doc.line(marginL, footerY, marginR, footerY);
  footerY += 8;

  setColor(doc, TEXT_DARK);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for choosing ' + data.hotelName + '!', marginL, footerY);
  footerY += 6;

  setColor(doc, TEXT_MED);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('We hope you enjoyed your stay and look forward to welcoming you again.', marginL, footerY);
  footerY += 8;

  // Cancellation policy
  if (data.cancellationPolicy) {
    setColor(doc, TEXT_LIGHT);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    const policyLines = doc.splitTextToSize(`Terms: ${data.cancellationPolicy}`, contentW);
    doc.text(policyLines, marginL, footerY);
    footerY += policyLines.length * 4;
  }

  // Powered by Roomly
  setColor(doc, { r: 190, g: 195, b: 205 });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('Powered by Roomly', pageW / 2, 290, { align: 'center' });

  return doc;
}
