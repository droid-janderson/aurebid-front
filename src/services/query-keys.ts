import type { LotListFilters } from '@/types/domain';

export const queryKeys = {
  auth: ['auth'] as const,
  lots: {
    all: ['lots'] as const,
    list: (filters: LotListFilters) => ['lots', 'list', filters] as const,
    detail: (lotId: string) => ['lots', 'detail', lotId] as const,
    managed: (lotId: string) => ['lots', 'managed', lotId] as const,
    mine: (filters: LotListFilters) => ['lots', 'mine', filters] as const,
    summary: ['lots', 'mine', 'summary'] as const,
  },
  bids: {
    lot: (lotId: string) => ['bids', 'lot', lotId] as const,
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
    entries: (lotId: string) => ['audit', 'entries', lotId] as const,
    verify: (lotId: string) => ['audit', 'verify', lotId] as const,
  },
  catalog: {
    search: (term: string, page: number) =>
      ['catalog', 'search', term, page] as const,
  },
};
