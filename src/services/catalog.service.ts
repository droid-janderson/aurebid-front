import type { CatalogCard, CatalogCardPage } from '@/types/domain';
import { buildQuery, request } from '@/services/http';

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
  total?: number;
  page?: number;
  totalPages?: number;
}

function normalizeCard(card: RawCard): CatalogCard {
  return {
    id: card.id,
    name: card.name,
    setId: card.setId,
    setName: card.setName,
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
  /**
   * Card search must be proxied by the backend (Cardex integration).
   * Required backend endpoint: GET /catalog/cards?search=&page=&limit=
   */
  async search(search: string, page = 1, limit = 12): Promise<CatalogCardPage> {
    const response = await request<RawPage>(
      `/catalog/cards${buildQuery({ search, page, limit })}`,
    );

    return {
      items: (response.items ?? []).map(normalizeCard),
      total: response.total ?? response.items?.length ?? 0,
      page: response.page ?? page,
      totalPages:
        response.totalPages ??
        Math.max(1, Math.ceil((response.total ?? 0) / limit)),
    };
  },
};
