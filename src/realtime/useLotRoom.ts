import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeClient } from '@/realtime';
import type { RealtimeStatus } from '@/realtime/types';
import { queryKeys } from '@/services/query-keys';
import { sessionStore } from '@/services/session.store';

/**
 * Subscribes to a lot room and reconciles server state through the query
 * cache. Events never mutate financial values locally; they invalidate the
 * authoritative queries.
 */
export function useLotRoom(lotId: string | undefined, enabled: boolean) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>(
    enabled ? 'connecting' : 'idle',
  );

  useEffect(() => {
    if (!lotId || !enabled) {
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function subscribe() {
      const client = await getRealtimeClient();
      if (cancelled) return;

      client.connect(sessionStore.getAccessToken());
      client.joinLot(lotId!);

      const refreshLot = () => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.lots.detail(lotId!),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.bids.lot(lotId!),
        });
      };

      const offBid = client.on('bid:new', (payload) => {
        if (payload.lotId === lotId) {
          refreshLot();
          void queryClient.invalidateQueries({
            queryKey: queryKeys.wallet.detail,
          });
          void queryClient.invalidateQueries({
            queryKey: queryKeys.bids.mine,
          });
        }
      });

      const offStatus = client.on('auction:status_change', (payload) => {
        if (payload.lotId === lotId) refreshLot();
      });

      const offEnded = client.on('auction:ended', (payload) => {
        if (payload.lotId === lotId) {
          refreshLot();
          void queryClient.invalidateQueries({
            queryKey: queryKeys.settlements.mine,
          });
          void queryClient.invalidateQueries({
            queryKey: queryKeys.wallet.detail,
          });
        }
      });

      const offState = client.on('auction:state', (payload) => {
        if (payload.lotId === lotId) {
          setStatus('connected');
        }
      });

      const offConnection = client.onStatus((next) => {
        if (!cancelled) setStatus(next);
      });

      cleanup = () => {
        offBid();
        offStatus();
        offEnded();
        offState();
        offConnection();
        client.leaveLot(lotId!);
      };
    }

    void subscribe();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [lotId, enabled, queryClient]);

  return enabled && lotId ? status : 'idle';
}
