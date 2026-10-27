import type { Batch, PokemonCardSnapshot } from '@/types/domain';

export interface CardAttributes {
  setName?: string;
  setCode?: string;
  number?: string;
  rarity?: string;
  supertype?: string;
  subtypes: string[];
  types: string[];
  imageSmall?: string;
  imageLarge?: string;
  source?: string;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/** Extracts display metadata from the flexible productData snapshot. */
export function cardSnapshot(batch: Pick<Batch, 'productData'>): PokemonCardSnapshot | null {
  const raw = batch.productData;
  if (!raw || typeof raw !== 'object') return null;

  const nested =
    raw.card && typeof raw.card === 'object'
      ? (raw.card as Record<string, unknown>)
      : raw;

  const externalId =
    stringValue(nested.externalId) ??
    stringValue(nested.id) ??
    stringValue(raw.externalId);
  const name = stringValue(nested.name) ?? stringValue(raw.name);

  if (!externalId && !name) return null;

  return {
    source: 'CARDEX',
    externalId: externalId ?? name ?? 'unknown',
    setId: stringValue(nested.setId),
    setName: stringValue(nested.setName) ?? stringValue(raw.setName),
    number: stringValue(nested.number) ?? stringValue(raw.number),
    rarity:
      stringValue(nested.rarity) && stringValue(nested.rarity) !== 'None'
        ? stringValue(nested.rarity)
        : null,
    supertype: stringValue(nested.supertype) ?? null,
    subtypes: stringList(nested.subtypes),
    types: stringList(nested.types),
    imageSmall:
      stringValue(nested.imageSmall) ?? stringValue(raw.imageSmall) ?? null,
    imageLarge:
      stringValue(nested.imageLarge) ?? stringValue(raw.imageLarge) ?? null,
  };
}

export function cardAttributes(batch: Pick<Batch, 'productData' | 'productSource'>): CardAttributes {
  const snapshot = cardSnapshot(batch);
  const attributes: CardAttributes = {
    setName: snapshot?.setName,
    setCode: snapshot?.setId,
    number: snapshot?.number,
    rarity: snapshot?.rarity ?? undefined,
    supertype: snapshot?.supertype ?? undefined,
    subtypes: snapshot?.subtypes ?? [],
    types: snapshot?.types ?? [],
    imageSmall: snapshot?.imageSmall ?? undefined,
    imageLarge: snapshot?.imageLarge ?? undefined,
    source: snapshot?.source,
  };

  if (!snapshot) {
    const raw = batch.productData ?? {};
    attributes.setName = stringValue(raw.setName);
    attributes.number = stringValue(raw.number);
    attributes.rarity = stringValue(raw.rarity);
    attributes.types = stringList(raw.types);
  }

  return attributes;
}

export function primaryCardImage(
  batch: Pick<Batch, 'imageUrl' | 'productData'>,
): string | null {
  const snapshot = cardSnapshot(batch);
  return batch.imageUrl ?? snapshot?.imageLarge ?? snapshot?.imageSmall ?? null;
}

export function cardSummaryLine(batch: Pick<Batch, 'productData' | 'productSource'>): string {
  const attributes = cardAttributes(batch);
  return [
    attributes.setName,
    attributes.number ? `#${attributes.number}` : undefined,
    attributes.rarity,
  ]
    .filter(Boolean)
    .join(' · ');
}
