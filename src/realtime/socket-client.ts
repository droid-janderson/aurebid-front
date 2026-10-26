import { io, type Socket } from 'socket.io-client';
import { env } from '@/utils/env';
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
  'auction:timer',
];

export class SocketRealtimeClient implements RealtimeClient {
  private socket: Socket | null = null;
  private status: RealtimeStatus = 'idle';
  private rooms = new Set<string>();
  private handlers = new Map<string, Set<(payload: unknown) => void>>();
  private statusHandlers = new Set<(status: RealtimeStatus) => void>();
  private envName = env.socketUrl;

  connect(token: string | null) {
    if (!token) {
      this.setStatus('disconnected');
      return;
    }

    if (this.socket?.connected) return;

    if (this.socket) {
      this.socket.auth = { token };
      this.socket.connect();
      return;
    }

    this.setStatus('connecting');

    const socket = io(this.envName, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1200,
      transports: ['websocket', 'polling'],
    });

    this.socket = socket;

    socket.on('connect', () => {
      this.setStatus('connected');
      this.rooms.forEach((room) => socket.emit('auction:join', room));
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

  disconnect() {
    this.rooms.clear();
    this.socket?.disconnect();
    this.socket = null;
    this.setStatus('disconnected');
  }

  joinLot(lotId: string) {
    if (this.rooms.has(lotId)) return;
    this.rooms.add(lotId);
    if (this.socket?.connected) this.socket.emit('auction:join', lotId);
  }

  leaveLot(lotId: string) {
    if (!this.rooms.has(lotId)) return;
    this.rooms.delete(lotId);
    if (this.socket?.connected) this.socket.emit('auction:leave', lotId);
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

  private setStatus(status: RealtimeStatus) {
    this.status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }
}

export const socketRealtimeClient = new SocketRealtimeClient();
