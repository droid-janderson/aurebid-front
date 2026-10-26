import type { Settlement, SettlementStatus } from '@/types/domain';
import { buildQuery, request, requestWithMeta } from '@/services/http';

export const settlementsService = {
  listMine(page = 1, limit = 50, status?: SettlementStatus) {
    return requestWithMeta<Settlement>(
      `/settlements${buildQuery({ page, limit, status })}`,
    );
  },

  getPublic(token: string) {
    return request<Settlement>(
      `/settlements/public/${encodeURIComponent(token)}`,
      { auth: false },
    );
  },

  process(settlementId: string) {
    return request<Settlement>(
      `/settlements/${encodeURIComponent(settlementId)}/process`,
      { method: 'POST' },
    );
  },
};
