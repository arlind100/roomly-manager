import jsPDF from 'jspdf';

interface InvoiceData {
  invoiceNumber: string;
  issuedAt: string;
  hotelName: string;
  hotelAddress?: string;
  hotelEmail?: string;
  hotelPhone?: string;
  guestName: string;
  guestEmail?: string;
  reservationCode?: string;
  checkIn?: string;
  checkOut?: string;
  roomName?: string;
  amount: number;
  currency: string;
  taxPercentage?: number;
  status: string;
}

export function generateInvoicePdf(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const sym = data.currency === 'EUR' ? '€' : '$';
  const tax = data.taxPercentage || 0;
  const taxAmount = data.amount * (tax / 100);
  const total = data.amount + taxAmount;

  // Header bg
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, 210, 50, 'F');

  // Hotel name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(data.hotelName, 20, 25);

  // Invoice label
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('INVOICE', 20, 35);
  doc.setFontSize(14);
  doc.text(data.invoiceNumber, 20, 43);

  // Status
  doc.setFontSize(10);
  doc.text(`Status: ${data.status.toUpperCase()}`, 150, 35);
  doc.text(`Date: ${data.issuedAt?.split('T')[0] || ''}`, 150, 43);

  // Reset color
  doc.setTextColor(30, 41, 59);
  let y = 65;

  // Hotel info
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  if (data.hotelAddress) { doc.text(data.hotelAddress, 20, y); y += 5; }
  if (data.hotelEmail) { doc.text(data.hotelEmail, 20, y); y += 5; }
  if (data.hotelPhone) { doc.text(data.hotelPhone, 20, y); y += 5; }
  y += 5;

  // Bill To
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text('BILL TO', 20, y);
  y += 6;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.guestName, 20, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (data.guestEmail) { doc.text(data.guestEmail, 20, y); y += 5; }
  y += 8;

  // Table header
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(20, y, 170, 10, 'F');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', 25, y + 7);
  doc.text('DETAILS', 100, y + 7);
  doc.text('AMOUNT', 165, y + 7);
  y += 14;

  // Line item
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(data.roomName || 'Accommodation', 25, y);
  const details = data.checkIn && data.checkOut ? `${data.checkIn} → ${data.checkOut}` : (data.reservationCode || '');
  doc.setFontSize(9);
  doc.text(details, 100, y);
  doc.text(`${sym}${data.amount.toFixed(2)}`, 165, y);
  y += 8;

  if (data.reservationCode) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Reservation: ${data.reservationCode}`, 25, y);
    y += 6;
  }

  // Divider
  y += 5;
  doc.setDrawColor(226, 232, 240);
  doc.line(20, y, 190, y);
  y += 8;

  // Subtotal, Tax, Total
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text('Subtotal', 130, y);
  doc.setTextColor(30, 41, 59);
  doc.text(`${sym}${data.amount.toFixed(2)}`, 170, y);
  y += 6;

  if (tax > 0) {
    doc.setTextColor(100, 116, 139);
    doc.text(`Tax (${tax}%)`, 130, y);
    doc.setTextColor(30, 41, 59);
    doc.text(`${sym}${taxAmount.toFixed(2)}`, 170, y);
    y += 6;
  }

  doc.setFillColor(30, 41, 59);
  doc.rect(125, y, 65, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', 130, y + 7);
  doc.text(`${sym}${total.toFixed(2)}`, 170, y + 7);

  // Footer
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your stay!', 105, 280, { align: 'center' });

  return doc;
}
