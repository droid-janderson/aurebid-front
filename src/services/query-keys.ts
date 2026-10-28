import type { BatchListFilters } from '@/types/domain';

export const queryKeys = {
  auth: ['auth'] as const,
  batchs: {
    all: ['batchs'] as const,
    list: (filters: BatchListFilters) => ['batchs', 'list', filters] as const,
    details: (batchId: string) => ['batchs', 'detail', batchId] as const,
    detail: (batchId: string, viewerId: string) =>
      [...queryKeys.batchs.details(batchId), viewerId] as const,
    managed: (batchId: string) => ['batchs', 'managed', batchId] as const,
    mine: (filters: BatchListFilters) => ['batchs', 'mine', filters] as const,
    summary: ['batchs', 'mine', 'summary'] as const,
  },
  bids: {
    forBatch: (batchId: string) => ['bids', 'batch', batchId] as const,
    batch: (batchId: string, viewerId: string) =>
      [...queryKeys.bids.forBatch(batchId), viewerId] as const,
    mine: ['bids', 'mine'] as const,
  },
  wallet: {
    detail: ['wallet'] as const,
    transactions: (page: number) => ['wallet', 'transactions', page] as const,
  },
  settlements: {
    mine: ['settlements', 'mine'] as const,
    byToken: (token: string) => ['settlements', 'token', token] as const,
  },
  audit: {
    entries: (batchId: string) => ['audit', 'entries', batchId] as const,
    verify: (batchId: string) => ['audit', 'verify', batchId] as const,
  },
  catalog: {
    search: (term: string, page: number) =>
      ['catalog', 'search', term, page] as const,
  },
};
