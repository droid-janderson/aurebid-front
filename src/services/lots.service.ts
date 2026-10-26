import type {
  CreateLotInput,
  Lot,
  LotListFilters,
  SellerSummary,
  UpdateLotInput,
} from '@/types/domain';
import { buildQuery, request, requestWithMeta } from '@/services/http';
import { ApiError } from '@/services/api-error';
import { toCents } from '@/utils/money';

export const lotsService = {
  list(filters: LotListFilters = {}) {
    return requestWithMeta<Lot>(
      `/catalog/lots${buildQuery({
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        search: filters.search,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      })}`,
    );
  },

  listMine(filters: LotListFilters = {}) {
    return requestWithMeta<Lot>(
      `/catalog/lots/mine${buildQuery({
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      })}`,
    );
  },

  get(lotId: string) {
    return request<Lot>(`/auctions/${encodeURIComponent(lotId)}`);
  },

  getManaged(lotId: string) {
    return request<Lot>(`/catalog/lots/${encodeURIComponent(lotId)}`);
  },

  create(input: CreateLotInput) {
    return request<Lot>('/catalog/lots', { method: 'POST', body: input });
  },

  update(lotId: string, input: UpdateLotInput) {
    return request<Lot>(`/catalog/lots/${encodeURIComponent(lotId)}`, {
      method: 'PUT',
      body: input,
    });
  },

  remove(lotId: string) {
    return request<undefined>(`/catalog/lots/${encodeURIComponent(lotId)}`, {
      method: 'DELETE',
    });
  },

  publish(lotId: string) {
    return request<Lot>(`/auctions/${encodeURIComponent(lotId)}/publish`, {
      method: 'POST',
    });
  },

  cancel(lotId: string) {
    return request<Lot>(`/auctions/${encodeURIComponent(lotId)}/cancel`, {
      method: 'POST',
    });
  },

  end(lotId: string) {
    return request<{ lot: Lot | null }>(
      `/auctions/${encodeURIComponent(lotId)}/end`,
      { method: 'POST' },
    );
  },

  /**
   * Aggregated seller metrics. This endpoint does not exist in the current
   * backend; null means the UI must fall back to locally listed data and
   * omit authoritative financial totals.
   */
  async summary(): Promise<SellerSummary | null> {
    try {
      return await request<SellerSummary>('/catalog/lots/mine/summary');
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 404 || error.status === 403 || error.status === 405)
      ) {
        return null;
      }
      throw error;
    }
  },

  minimumNextBid(lot: Lot): number {
    if (lot.bidCount === 0) return lot.startingPrice;
    return (
      (toCents(lot.currentPrice) + toCents(lot.minimumIncrement)) / 100
    );
  },
};
