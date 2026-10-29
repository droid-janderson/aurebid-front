import type {
  RealtimeClient,
  RealtimeEventMap,
  RealtimeStatus,
} from '@/realtime/types';

export class FakeRealtimeClient implements RealtimeClient {
  status: RealtimeStatus = 'idle';
  rooms = new Map<string, number>();
  connects: Array<string | null> = [];
  authToken: string | null = null;

  private handlers = new Map<string, Set<(payload: unknown) => void>>();
  private statusHandlers = new Set<(status: RealtimeStatus) => void>();

  connect(token: string | null) {
    this.connects.push(token);
    this.authToken = token;
    this.setStatus('connected');
  }

  setAuth(token: string | null) {
    this.authToken = token;
  }

  disconnect() {
    this.rooms.clear();
    this.authToken = null;
    this.setStatus('disconnected');
  }

  joinLot(batchId: string) {
    this.rooms.set(batchId, (this.rooms.get(batchId) ?? 0) + 1);
  }

  leaveLot(batchId: string) {
    const count = this.rooms.get(batchId) ?? 0;
    if (count <= 0) return;

    if (count > 1) {
      this.rooms.set(batchId, count - 1);
      return;
    }

    this.rooms.delete(batchId);
  }

  on<K extends keyof RealtimeEventMap>(
    event: K,
    handler: (payload: RealtimeEventMap[K]) => void,
  ) {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler as (payload: unknown) => void);
    this.handlers.set(event, set);
    return () => {
      set.delete(handler as (payload: unknown) => void);
    };
  }

  onStatus(handler: (status: RealtimeStatus) => void) {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  getStatus() {
    return this.status;
  }

  emit<K extends keyof RealtimeEventMap>(
    event: K,
    payload: RealtimeEventMap[K],
  ) {
    this.handlers.get(event)?.forEach((handler) => handler(payload));
  }

  emitStatus(status: RealtimeStatus) {
    this.setStatus(status);
  }

  watching(batchId: string) {
    return (this.rooms.get(batchId) ?? 0) > 0;
  }

  reset() {
    this.rooms.clear();
    this.connects = [];
    this.authToken = null;
    this.handlers.clear();
    this.statusHandlers.clear();
    this.status = 'idle';
  }

  private setStatus(status: RealtimeStatus) {
    this.status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }
}

export const realtimeTestClient = new FakeRealtimeClient();

export function getRealtimeClient(): Promise<RealtimeClient> {
  return Promise.resolve(realtimeTestClient);
}

export function disconnectRealtime(): void {
  realtimeTestClient.disconnect();
}
