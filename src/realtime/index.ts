import type { RealtimeClient } from '@/realtime/types';

let clientPromise: Promise<RealtimeClient> | null = null;
let loadedClient: RealtimeClient | null = null;

export function getRealtimeClient(): Promise<RealtimeClient> {
  if (!clientPromise) {
    clientPromise = import('@/realtime/socket-client').then((module) => {
      loadedClient = module.socketRealtimeClient;
      return module.socketRealtimeClient;
    });
  }
  return clientPromise;
}

export function disconnectRealtime(): void {
  loadedClient?.disconnect();
}
