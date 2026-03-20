/**
 * Format a number as currency using the hotel's display currency.
 * No conversion is performed — prices are stored in the hotel's own currency.
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const symbols: Record<string, string> = { EUR: '€', GBP: '£', USD: '$', CHF: 'CHF ', JPY: '¥' };
    const sym = symbols[currency] || `${currency} `;
    return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Display a price using the hotel's currency — just format, no conversion.
 * The `baseCurrency` param is kept for API compatibility but ignored.
 */
export function displayPrice(amount: number, displayCurrency: string, _baseCurrency?: string): string {
  return formatCurrency(amount, displayCurrency);
}

// Legacy exports kept for compatibility — they are no-ops now
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  return { USD: 1 };
}

export function convertCurrency(amount: number, _from: string, _to: string): number {
  return amount; // No conversion — prices stored in hotel's own currency
}
