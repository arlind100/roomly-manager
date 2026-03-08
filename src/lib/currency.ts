export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const sym = currency === 'EUR' ? '€' : '$';
  return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
