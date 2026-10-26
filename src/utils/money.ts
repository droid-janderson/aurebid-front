const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return brlFormatter.format(value);
}

export function formatBRLCompact(value: number): string {
  return compactFormatter.format(value);
}

/** Converts a BRL amount to integer cents before arithmetic. */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/**
 * Minimum next bid according to the backend rule:
 * first bid equals starting price, later bids add the minimum increment.
 * Display only — the backend is authoritative.
 */
export function minimumNextBid(lot: {
  startingPrice: number;
  minimumIncrement: number;
  currentPrice: number;
  bidCount: number;
}): number {
  if (lot.bidCount === 0) return lot.startingPrice;
  return fromCents(toCents(lot.currentPrice) + toCents(lot.minimumIncrement));
}

/** Accepts "1.234,56", "1234.56" or "1234,56". */
export function parseBRLInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s|R\$/g, '');
  if (!cleaned) return null;

  const normalized =
    cleaned.includes(',') && cleaned.includes('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(',', '.');

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

export function formatAmountInput(value: number): string {
  return value.toFixed(2).replace('.', ',');
}
