// Approximate exchange rates (base: USD)
const RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
};

export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const inUsd = amount / (RATES[from] || 1);
  return inUsd * (RATES[to] || 1);
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const sym = currency === 'EUR' ? '€' : '$';
    return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
}
