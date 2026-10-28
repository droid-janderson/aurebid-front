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

export function formatBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return '—';
  }
  return brlFormatter.format(numeric);
}

export function formatBRLCompact(value: number): string {
  return compactFormatter.format(value);
}

export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function minimumNextBid(batch: {
  startingPrice: number;
  minimumIncrement: number;
  currentPrice: number;
  bidCount: number;
}): number {
  if (batch.bidCount === 0) return batch.startingPrice;
  return fromCents(toCents(batch.currentPrice) + toCents(batch.minimumIncrement));
}

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

export function formatAmountInput(value: number | string): string {
  return Number(value).toFixed(2).replace('.', ',');
}
