import { useQuery } from '@tanstack/react-query';
import { Gavel, History, ShieldCheck } from 'lucide-react';
import { bidsService } from '@/services/bids.service';
import { queryKeys } from '@/services/query-keys';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';
import { InlineAlert } from '@/components/feedback/InlineAlert';
import { formatBRL } from '@/utils/money';
import { formatDateTime } from '@/utils/datetime';
import { shortHash } from '@/utils/pseudonym';
import { presentError } from '@/utils/errors';

export function BidHistory({ batchId }: { batchId: string }) {
  const { user } = useAuth();
  const viewerId = user?.id ?? 'anon';
  const bidsQuery = useQuery({
    queryKey: queryKeys.bids.batch(batchId, viewerId),
    queryFn: () => bidsService.listForLot(batchId, 1, 30),
    staleTime: 10_000,
  });

  if (bidsQuery.isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (bidsQuery.isError) {
    const error = presentError(bidsQuery.error);
    return (
      <InlineAlert tone="error" title={error.title}>
        {error.message}
      </InlineAlert>
    );
  }

  const bids = bidsQuery.data.data;

  if (bids.length === 0) {
    return (
      <EmptyState
        icon={Gavel}
        compact
        title="Nenhum lance ainda"
        description="Seja o primeiro a disputar este lote. O primeiro lance válido é o valor inicial."
      />
    );
  }

  return (
    <div>
      <ol className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line">
        {bids.map((bid, index) => {
          const isMe = Boolean(bid.bidder?.isMine);
          const bidderLabel = isMe
            ? 'Você'
            : (bid.bidder?.name ?? bid.bidder?.label ?? 'Licitante');
          return (
            <li
              key={bid.id}
              className={
                index === 0
                  ? 'flex items-center gap-3 bg-gold/[0.055] px-4 py-3'
                  : 'flex items-center gap-3 bg-raised/30 px-4 py-3'
              }
            >
              <span
                className={
                  index === 0
                    ? 'numeric flex size-8 shrink-0 items-center justify-center rounded-full border border-gold/35 bg-gold/10 text-[0.6875rem] text-gold-bright'
                    : 'numeric flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-ink/50 text-[0.6875rem] text-mist-dim'
                }
              >
                {bid.audit?.sequence ?? bids.length - index}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-[0.8125rem] font-medium text-chalk">
                  {bidderLabel}
                  {index === 0 && (
                    <span className="shrink-0 rounded-full border border-gold/30 px-1.5 py-0.5 font-mono text-[0.5rem] tracking-[0.1em] text-gold uppercase">
                      Líder
                    </span>
                  )}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[0.6875rem] text-mist-dim">
                  <History aria-hidden="true" className="size-3" />
                  {formatDateTime(bid.createdAt)}
                  {bid.audit && (
                    <span className="hidden items-center gap-1 font-mono text-[0.625rem] sm:inline-flex">
                      <ShieldCheck aria-hidden="true" className="size-3 text-win/70" />
                      {shortHash(bid.audit.currentHash)}
                    </span>
                  )}
                </p>
              </div>
              <p
                className={
                  index === 0
                    ? 'numeric shrink-0 text-sm font-medium text-gold-bright'
                    : 'numeric shrink-0 text-sm text-chalk'
                }
              >
                {formatBRL(bid.amount)}
              </p>
            </li>
          );
        })}
      </ol>
      {bidsQuery.data.meta.total > bids.length && (
        <p className="mt-2 text-center text-[0.6875rem] text-mist-dim">
          Exibindo os {bids.length} lances mais altos de {bidsQuery.data.meta.total}.
        </p>
      )}
    </div>
  );
}
