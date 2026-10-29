import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeClient } from '@/realtime';
import { queryKeys } from '@/services/query-keys';
import { sessionStore } from '@/services/session.store';

export function useWalletRealtime(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function subscribe() {
      const client = await getRealtimeClient();
      if (cancelled) return;

      client.connect(sessionStore.getAccessToken());

      const refreshWallet = () => {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.wallet.detail,
        });
      };

      let previousStatus = client.getStatus();

      const offWallet = client.on('wallet:changed', refreshWallet);

      const offConnection = client.onStatus((next) => {
        if (
          next === 'connected' &&
          (previousStatus === 'disconnected' || previousStatus === 'error')
        ) {
          refreshWallet();
        }
        previousStatus = next;
      });

      cleanup = () => {
        offWallet();
        offConnection();
      };
    }

    void subscribe();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [enabled, queryClient]);
}
