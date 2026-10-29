import type {
  CreateBatchInput,
  Batch,
  BatchListFilters,
  Settlement,
  UpdateBatchInput,
} from "@/types/domain";
import { buildQuery, request, requestWithMeta } from "@/services/http";
import { toCents } from "@/utils/money";

export const batchsService = {
  list(filters: BatchListFilters = {}) {
    return requestWithMeta<Batch>(
      `/catalog/batchs${buildQuery({
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

  listMine(filters: BatchListFilters = {}) {
    return requestWithMeta<Batch>(
      `/catalog/batchs/mine${buildQuery({
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        search: filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      })}`,
    );
  },

  get(batchId: string) {
    return request<Batch>(`/auctions/${encodeURIComponent(batchId)}`);
  },

  getManaged(batchId: string) {
    return request<Batch>(`/catalog/batchs/${encodeURIComponent(batchId)}`);
  },

  listLeading() {
    return requestWithMeta<Batch>("/auctions/leading");
  },

  create(input: CreateBatchInput) {
    return request<Batch>("/catalog/batchs", { method: "POST", body: input });
  },

  update(batchId: string, input: UpdateBatchInput) {
    return request<Batch>(`/catalog/batchs/${encodeURIComponent(batchId)}`, {
      method: "PUT",
      body: input,
    });
  },

  remove(batchId: string) {
    return request<undefined>(
      `/catalog/batchs/${encodeURIComponent(batchId)}`,
      {
        method: "DELETE",
      },
    );
  },

  publish(batchId: string) {
    return request<Batch>(`/auctions/${encodeURIComponent(batchId)}/publish`, {
      method: "POST",
    });
  },

  cancel(batchId: string) {
    return request<Batch>(`/auctions/${encodeURIComponent(batchId)}/cancel`, {
      method: "POST",
    });
  },

  end(batchId: string) {
    return request<{ batch: Batch | null; settlement: Settlement | null }>(
      `/auctions/${encodeURIComponent(batchId)}/end`,
      { method: "POST" },
    );
  },

  minimumNextBid(batch: Batch): number {
    if (batch.bidCount === 0) return batch.startingPrice;
    return (
      (toCents(batch.currentPrice) + toCents(batch.minimumIncrement)) / 100
    );
  },
};
