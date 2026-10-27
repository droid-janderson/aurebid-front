import type { AuditVerification } from '@/types/domain';
import { request, requestWithMeta } from '@/services/http';

export interface AuditRecord {
  batchId: string;
  sequence: number;
  currentHash: string;
  previousHash: string | null;
  createdAt: string;
  bidId: string;
  amount: number;
  bidder: { id: string | null };
}

export const auditService = {
  async list(batchId: string): Promise<AuditRecord[]> {
    const records: AuditRecord[] = [];
    let page = 1;
    let hasNext = true;
    let guard = 0;

    while (hasNext && guard < 50) {
      const response = await requestWithMeta<AuditRecord>(
        `/auctions/${encodeURIComponent(batchId)}/audit?page=${page}&limit=100`,
      );
      records.push(...response.data);
      hasNext = response.meta.hasNext;
      page += 1;
      guard += 1;
    }

    return records.sort((a, b) => a.sequence - b.sequence);
  },

  async verify(batchId: string): Promise<AuditVerification> {
    try {
      const result = await request<{
        valid: boolean;
        entries: number;
        brokenAtSequence?: number;
        reason?: string;
      }>(`/auctions/${encodeURIComponent(batchId)}/audit/verify`);

      return {
        status: result.valid ? 'VERIFIED' : 'FAILED',
        entries: result.entries,
        checkedAt: new Date().toISOString(),
        brokenAtSequence: result.brokenAtSequence,
        reason: result.reason,
      };
    } catch {
      return {
        status: 'UNAVAILABLE',
        entries: 0,
        checkedAt: null,
        reason:
          'A verificação de integridade pública ainda não está disponível neste ambiente.',
      };
    }
  },
};
