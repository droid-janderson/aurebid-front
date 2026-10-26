import type { LotStatus } from '@/types/domain';

export type RealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface AuctionStateEvent {
  lotId: string;
  status: LotStatus;
  currentPrice: number;
  bidCount: number;
  timeRemaining: number;
}

export interface NewBidEvent {
  lotId: string;
  bid: {
    id: string;
    amount: number;
    createdAt: string;
    bidder: { id: string; name: string };
  };
}

export interface StatusChangeEvent {
  lotId: string;
  status: LotStatus;
  startsAt: string;
  endsAt: string;
}

export interface AuctionEndedEvent {
  lotId: string;
  status: LotStatus;
  winner: { id: string; name: string } | null;
  finalPrice: number | null;
}

export interface TimerEvent {
  lotId: string;
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
  joinLot(lotId: string): void;
  leaveLot(lotId: string): void;
  on<K extends keyof RealtimeEventMap>(
    event: K,
    handler: (payload: RealtimeEventMap[K]) => void,
  ): () => void;
  onStatus(handler: (status: RealtimeStatus) => void): () => void;
  getStatus(): RealtimeStatus;
}
