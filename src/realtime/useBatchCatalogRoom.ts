import { useEffect } from 'react';
import { useQueryClient, type Query } from '@tanstack/react-query';
import { getRealtimeClient } from '@/realtime';
import { queryKeys } from '@/services/query-keys';
import { sessionStore } from '@/services/session.store';

function queryContainsBatch(query: Query, batchId: string): boolean {
  const data = query.state.data as
    | { data?: Array<{ id?: string }> }
    | undefined;
  const items = data?.data;
  if (!Array.isArray(items)) return false;
  return items.some((item) => item.id === batchId);
}

export function useBatchCatalogRoom(batchIds: string[]) {
  const queryClient = useQueryClient();
  const signature = batchIds.join('|');

  useEffect(() => {
    const ids = signature ? signature.split('|') : [];
    if (ids.length === 0) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function subscribe() {
      const client = await getRealtimeClient();
      if (cancelled) return;

      client.connect(sessionStore.getAccessToken());
      ids.forEach((batchId) => client.joinLot(batchId));

      const watched = new Set(ids);

      const invalidateBatch = (batchId: string) => {
        if (!watched.has(batchId)) return;
        void queryClient.invalidateQueries({
          queryKey: queryKeys.batchs.all,
          predicate: (query) => queryContainsBatch(query, batchId),
        });
      };

      const offBid = client.on('bid:new', (payload) => {
        invalidateBatch(payload.batchId);
      });

      const offExtended = client.on('auction:extended', (payload) => {
        invalidateBatch(payload.batchId);
      });

      const offStatus = client.on('auction:status_change', (payload) => {
        invalidateBatch(payload.batchId);
      });

      const offEnded = client.on('auction:ended', (payload) => {
        invalidateBatch(payload.batchId);
      });

      let previousStatus = client.getStatus();

      const offConnection = client.onStatus((next) => {
        if (
          next === 'connected' &&
          (previousStatus === 'disconnected' || previousStatus === 'error')
        ) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.batchs.all,
          });
        }
        previousStatus = next;
      });

      cleanup = () => {
        offBid();
        offExtended();
        offStatus();
        offEnded();
        offConnection();
        ids.forEach((batchId) => client.leaveLot(batchId));
      };
    }

    void subscribe();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [signature, queryClient]);
}
