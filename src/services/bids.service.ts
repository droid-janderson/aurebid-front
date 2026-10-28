import type { Bid, BidReceipt } from '@/types/domain';
import { buildQuery, request, requestWithMeta } from '@/services/http';

export const bidsService = {
  place(batchId: string, amount: number) {
    return request<BidReceipt>(`/auctions/${encodeURIComponent(batchId)}/bids`, {
      method: 'POST',
      body: { amount },
    });
  },

  listForLot(batchId: string, page = 1, limit = 20) {
    return requestWithMeta<Bid>(
      `/auctions/${encodeURIComponent(batchId)}/bids${buildQuery({ page, limit })}`,
    );
  },

  listMine(page = 1, limit = 50) {
    return requestWithMeta<Bid>(`/bids${buildQuery({ page, limit })}`);
  },

  listMineForLot(batchId: string, page = 1, limit = 20) {
    return requestWithMeta<Bid>(
      `/bids${buildQuery({ page, limit, batchId })}`,
    );
  },
};
