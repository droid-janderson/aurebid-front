import type { Bid } from '@/types/domain';
import { buildQuery, request, requestWithMeta } from '@/services/http';

export const bidsService = {
  place(lotId: string, amount: number) {
    return request<Bid>(`/auctions/${encodeURIComponent(lotId)}/bids`, {
      method: 'POST',
      body: { amount },
    });
  },

  listForLot(lotId: string, page = 1, limit = 20) {
    return requestWithMeta<Bid>(
      `/auctions/${encodeURIComponent(lotId)}/bids${buildQuery({ page, limit })}`,
    );
  },

  listMine(page = 1, limit = 50) {
    return requestWithMeta<Bid>(`/bids${buildQuery({ page, limit })}`);
  },

  listMineForLot(lotId: string, page = 1, limit = 20) {
    return requestWithMeta<Bid>(
      `/bids${buildQuery({ page, limit, lotId })}`,
    );
  },
};
