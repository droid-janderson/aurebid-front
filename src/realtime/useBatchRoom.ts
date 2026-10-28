import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeClient } from '@/realtime';
import type { RealtimeStatus } from '@/realtime/types';
import { queryKeys } from '@/services/query-keys';
import { sessionStore } from '@/services/session.store';
import { syncServerClock } from '@/utils/server-clock';
import { useToast } from '@/components/ui/Toast';

export function useBatchRoom(batchId: string | undefined, enabled: boolean) {
  const queryClient = useQueryClient();
  const { push } = useToast();
  const [status, setStatus] = useState<RealtimeStatus>(
    enabled ? 'connecting' : 'idle',
  );

  useEffect(() => {
    if (!batchId || !enabled) {
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function subscribe() {
      const client = await getRealtimeClient();
      if (cancelled) return;

      client.connect(sessionStore.getAccessToken());
      client.joinLot(batchId!);

      const refreshLot = () => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.batchs.details(batchId!),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.bids.forBatch(batchId!),
        });
      };

      const offBid = client.on('bid:new', (payload) => {
        if (payload.batchId === batchId) {
          syncServerClock(payload.serverTime);
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
        if (payload.batchId !== batchId) return;
        syncServerClock(payload.serverTime);
        refreshLot();
      });

      const offEnded = client.on('auction:ended', (payload) => {
        if (payload.batchId !== batchId) return;
        syncServerClock(payload.serverTime);
        refreshLot();
        void queryClient.invalidateQueries({
          queryKey: queryKeys.settlements.mine,
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.wallet.detail,
        });
      });

      const offExtended = client.on('auction:extended', (payload) => {
        if (payload.batchId !== batchId) return;
        syncServerClock(payload.serverTime);
        refreshLot();
        push({
          title: 'Tempo estendido',
          description:
            'Um lance nos últimos minutos adicionou 2 minutos ao lote.',
          tone: 'warning',
        });
      });

      const offTimer = client.on('auction:timer', (payload) => {
        if (payload.batchId !== batchId) return;
        syncServerClock(payload.serverTime);
      });

      const offState = client.on('auction:state', (payload) => {
        if (payload.batchId !== batchId) return;
        syncServerClock(payload.serverTime);
        setStatus('connected');
      });

      const offConnection = client.onStatus((next) => {
        if (!cancelled) setStatus(next);
      });

      cleanup = () => {
        offBid();
        offStatus();
        offEnded();
        offExtended();
        offTimer();
        offState();
        offConnection();
        client.leaveLot(batchId!);
      };
    }

    void subscribe();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [batchId, enabled, queryClient, push]);

  return enabled && batchId ? status : 'idle';
}
