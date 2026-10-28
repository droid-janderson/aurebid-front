import type { BatchStatus } from '@/types/domain';

export type RealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface AuctionStateEvent {
  batchId: string;
  status: BatchStatus;
  currentPrice: number;
  bidCount: number;
  timeRemaining: number;
  startsAt: string;
  endsAt: string;
  serverTime: string;
}

export interface NewBidEvent {
  batchId: string;
  bid: {
    id: string;
    amount: number;
    createdAt: string;
    bidder: { label: string | null };
  };
  serverTime: string;
}

export interface StatusChangeEvent {
  batchId: string;
  status: BatchStatus;
  startsAt: string;
  endsAt: string;
  serverTime: string;
}

export interface AuctionEndedEvent {
  batchId: string;
  status: BatchStatus;
  winner: { label: string } | null;
  finalPrice: number | null;
  serverTime: string;
}

export interface TimerEvent {
  batchId: string;
  timeRemaining: number;
  serverTime: string;
}

export interface ExtendedEvent {
  batchId: string;
  endsAt: string;
  extendedBy: number;
  serverTime: string;
}

export interface RealtimeEventMap {
  'auction:state': AuctionStateEvent;
  'bid:new': NewBidEvent;
  'auction:status_change': StatusChangeEvent;
  'auction:ended': AuctionEndedEvent;
  'auction:extended': ExtendedEvent;
  'auction:timer': TimerEvent;
}

export interface RealtimeClient {
  connect(token: string | null): void;
  disconnect(): void;
  joinLot(batchId: string): void;
  leaveLot(batchId: string): void;
  on<K extends keyof RealtimeEventMap>(
    event: K,
    handler: (payload: RealtimeEventMap[K]) => void,
  ): () => void;
  onStatus(handler: (status: RealtimeStatus) => void): () => void;
  getStatus(): RealtimeStatus;
}
