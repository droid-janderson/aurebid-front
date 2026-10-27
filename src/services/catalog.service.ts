import type { CatalogCard, CatalogCardPage } from '@/types/domain';
import { buildQuery, requestRaw } from '@/services/http';

interface RawCard {
  id: string;
  name: string;
  setId: string;
  setName?: string;
  number?: string;
  imageSmall?: string | null;
  imageLarge?: string | null;
  rarity?: string | null;
  supertype?: string | null;
  subtypes?: string[];
  types?: string[];
  cardmarketLowPrice?: number | null;
  tcgplayerLowPrice?: number | null;
}

interface RawPage {
  items: RawCard[];
  page?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
}

function normalizeCard(card: RawCard): CatalogCard {
  return {
    id: card.id,
    name: card.name,
    setId: card.setId,
    setName: card.setName ?? card.setId,
    number: card.number ?? '',
    imageSmall: card.imageSmall ?? null,
    imageLarge: card.imageLarge ?? null,
    rarity:
      card.rarity && card.rarity !== 'None' ? card.rarity : null,
    supertype: card.supertype ?? null,
    subtypes: card.subtypes ?? [],
    types: card.types ?? [],
    cardmarketLowPrice: card.cardmarketLowPrice ?? null,
    tcgplayerLowPrice: card.tcgplayerLowPrice ?? null,
  };
}

export const catalogService = {
  async search(search: string, page = 1, pageSize = 8): Promise<CatalogCardPage> {
    const response = await requestRaw<RawPage>(
      `/catalog/cards${buildQuery({ name: search, page, pageSize })}`,
    );

    return {
      items: (response.items ?? []).map(normalizeCard),
      total: response.totalCount ?? response.items?.length ?? 0,
      page: response.page ?? page,
      totalPages:
        response.totalPages ??
        Math.max(1, Math.ceil((response.totalCount ?? 0) / pageSize)),
    };
  },
};
