import type { RealtimeClient } from '@/realtime/types';

let clientPromise: Promise<RealtimeClient> | null = null;

export function getRealtimeClient(): Promise<RealtimeClient> {
  if (!clientPromise) {
    clientPromise = import('@/realtime/socket-client').then(
      (module) => module.socketRealtimeClient,
    );
  }
  return clientPromise;
}
