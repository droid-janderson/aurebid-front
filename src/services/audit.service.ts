import type { AuditVerification, Bid } from '@/types/domain';
import { request, requestWithMeta } from '@/services/http';

export interface AuditRecord {
  bid: Bid;
  sequence: number;
  currentHash: string;
  previousHash: string | null;
  createdAt: string;
}

export const auditService = {
  /**
   * Public bid history. The backend exposes sequence and hash alongside each
   * bid, which is enough to render the public chain without admin access.
   */
  async list(lotId: string): Promise<AuditRecord[]> {
    const response = await requestWithMeta<Bid>(
      `/auctions/${encodeURIComponent(lotId)}/bids?page=1&limit=100`,
    );

    return response.data
      .filter((bid) => bid.audit)
      .map((bid) => ({
        bid,
        sequence: bid.audit?.sequence ?? 0,
        currentHash: bid.audit?.currentHash ?? '',
        previousHash: bid.audit?.previousHash ?? null,
        createdAt: bid.audit?.createdAt ?? bid.createdAt,
      }))
      .sort((a, b) => a.sequence - b.sequence);
  },

  /**
   * Integrity verification is a backend responsibility. The current backend
   * only exposes it to admins, so a missing public endpoint maps to the
   * "unavailable" state instead of a false positive.
   */
  async verify(lotId: string): Promise<AuditVerification> {
    try {
      const result = await request<{
        valid: boolean;
        entries: number;
        brokenAtSequence?: number;
        reason?: string;
        checkedAt?: string;
      }>(`/auctions/${encodeURIComponent(lotId)}/audit/verify`, {
        auth: false,
      });

      return {
        status: result.valid ? 'VERIFIED' : 'FAILED',
        entries: result.entries,
        checkedAt: result.checkedAt ?? null,
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
