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
}

export interface NewBidEvent {
  batchId: string;
  bid: {
    id: string;
    amount: number;
    createdAt: string;
    bidder: { id: string; name: string };
  };
}

export interface StatusChangeEvent {
  batchId: string;
  status: BatchStatus;
  startsAt: string;
  endsAt: string;
}

export interface AuctionEndedEvent {
  batchId: string;
  status: BatchStatus;
  winner: { id: string; name: string } | null;
  finalPrice: number | null;
}

export interface TimerEvent {
  batchId: string;
  timeRemaining: number;
}

export interface RealtimeEventMap {
  'auction:state': AuctionStateEvent;
  'bid:new': NewBidEvent;
  'auction:status_change': StatusChangeEvent;
  'auction:ended': AuctionEndedEvent;
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
