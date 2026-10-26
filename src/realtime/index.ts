import { env } from '@/utils/env';
import type { RealtimeClient } from '@/realtime/types';

let clientPromise: Promise<RealtimeClient> | null = null;

/**
 * Loads the real Socket.IO transport in production, or the offline mock
 * transport in demo mode. Keeping this behind a dynamic import prevents mock
 * fixtures from entering the main bundle when mocks are disabled.
 */
export function getRealtimeClient(): Promise<RealtimeClient> {
  if (!clientPromise) {
    clientPromise = env.useMocks
      ? import('@/mocks/realtime').then((module) => module.mockRealtimeClient)
      : import('@/realtime/socket-client').then(
          (module) => module.socketRealtimeClient,
        );
  }
  return clientPromise;
}
