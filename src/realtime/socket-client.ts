import { io, type Socket } from 'socket.io-client';
import { env } from '@/utils/env';
import { sessionStore } from '@/services/session.store';
import type {
  RealtimeClient,
  RealtimeEventMap,
  RealtimeStatus,
} from '@/realtime/types';

const EVENTS: Array<keyof RealtimeEventMap> = [
  'auction:state',
  'bid:new',
  'auction:status_change',
  'auction:ended',
  'auction:extended',
  'auction:timer',
  'wallet:changed',
  'error',
];

type SocketAuth = { token?: string };

export class SocketRealtimeClient implements RealtimeClient {
  private socket: Socket | null = null;
  private status: RealtimeStatus = 'idle';
  private rooms = new Map<string, number>();
  private handlers = new Map<string, Set<(payload: unknown) => void>>();
  private statusHandlers = new Set<(status: RealtimeStatus) => void>();
  private envName = env.socketUrl;

  connect(token: string | null) {
    if (!this.socket) {
      this.createSocket(token);
      return;
    }

    if (this.currentAuthToken() !== (token ?? null)) {
      this.applyAuth(token);
      return;
    }

    if (!this.socket.connected) {
      this.setStatus('connecting');
      this.socket.connect();
    }
  }

  setAuth(token: string | null) {
    if (!this.socket) {
      this.createSocket(token);
      return;
    }

    if (this.currentAuthToken() === token) return;
    this.applyAuth(token);
  }

  disconnect() {
    this.rooms.clear();
    this.socket?.disconnect();
    this.socket = null;
    this.setStatus('disconnected');
  }

  joinLot(batchId: string) {
    const count = this.rooms.get(batchId) ?? 0;
    this.rooms.set(batchId, count + 1);
    if (count === 0 && this.socket?.connected) {
      this.socket.emit('auction:join', batchId);
    }
  }

  leaveLot(batchId: string) {
    const count = this.rooms.get(batchId) ?? 0;
    if (count <= 0) return;

    if (count > 1) {
      this.rooms.set(batchId, count - 1);
      return;
    }

    this.rooms.delete(batchId);
    if (this.socket?.connected) this.socket.emit('auction:leave', batchId);
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

  private currentAuthToken(): string | null {
    const auth = this.socket?.auth as SocketAuth | undefined;
    return auth?.token ?? null;
  }

  private applyAuth(token: string | null) {
    const socket = this.socket;
    if (!socket) return;

    socket.auth = token ? { token } : {};

    if (socket.connected) {
      socket.disconnect();
      this.setStatus('connecting');
      socket.connect();
    }
  }

  private createSocket(token: string | null) {
    this.setStatus('connecting');

    const socket = io(this.envName, {
      auth: token ? { token } : {},
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1200,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });

    this.socket = socket;

    socket.io.on('reconnect_attempt', () => {
      const nextToken = sessionStore.getAccessToken();
      socket.auth = nextToken ? { token: nextToken } : {};
    });

    socket.on('connect', () => {
      this.setStatus('connected');
      this.rooms.forEach((_count, room) => socket.emit('auction:join', room));
    });

    socket.on('disconnect', () => {
      this.setStatus('disconnected');
    });

    socket.on('connect_error', () => {
      this.setStatus('error');
    });

    EVENTS.forEach((event) => {
      socket.on(event, (payload: unknown) => {
        this.handlers.get(event)?.forEach((handler) => handler(payload));
      });
    });
  }

  private setStatus(status: RealtimeStatus) {
    this.status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }
}

export const socketRealtimeClient = new SocketRealtimeClient();
