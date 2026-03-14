// Exchange rates (base: USD) — updated periodically
const RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CHF: 0.88,
  CAD: 1.36,
  AUD: 1.53,
  CNY: 7.24,
  INR: 83.1,
  BRL: 4.97,
  MXN: 17.15,
  TRY: 30.2,
  AED: 3.67,
  SAR: 3.75,
};

let cachedRates: Record<string, number> | null = null;
let fetchPromise: Promise<void> | null = null;

/** Attempt to fetch live rates from a free API. Falls back to hardcoded rates. */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  if (cachedRates) return cachedRates;
  if (fetchPromise) {
    await fetchPromise;
    return cachedRates || RATES;
  }

  fetchPromise = (async () => {
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data?.rates) {
          cachedRates = data.rates;
        }
      }
    } catch {
      // Use hardcoded rates as fallback
    }
  })();

  await fetchPromise;
  return cachedRates || RATES;
}

function getRates(): Record<string, number> {
  return cachedRates || RATES;
}

export function convertCurrency(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const rates = getRates();
  const inUsd = amount / (rates[from] || 1);
  return inUsd * (rates[to] || 1);
}

/**
 * Convert an amount stored in a base currency to the display currency, then format.
 * All prices in the DB are assumed to be stored in USD.
 */
export function displayPrice(amount: number, displayCurrency: string, baseCurrency: string = 'USD'): string {
  const converted = convertCurrency(amount, baseCurrency, displayCurrency);
  return formatCurrency(converted, displayCurrency);
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
