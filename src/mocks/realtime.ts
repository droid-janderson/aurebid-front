import type {
  RealtimeClient,
  RealtimeEventMap,
  RealtimeStatus,
} from '@/realtime/types';
import {
  findLot,
  lotBids,
  serializeBid,
  timingFor,
} from '@/mocks/db';

type Handler = (payload: unknown) => void;

/**
 * Development-only realtime transport. It never touches the network and is
 * loaded exclusively when VITE_USE_MOCKS=true.
 */
class MockRealtimeClient implements RealtimeClient {
  private status: RealtimeStatus = 'idle';
  private rooms = new Set<string>();
  private handlers = new Map<string, Set<Handler>>();
  private statusHandlers = new Set<(status: RealtimeStatus) => void>();
  private timer: number | null = null;

  connect(token: string | null) {
    if (!token) {
      this.setStatus('disconnected');
      return;
    }
    this.setStatus('connected');
    this.startTicker();
  }

  disconnect() {
    this.rooms.clear();
    this.stopTicker();
    this.setStatus('disconnected');
  }

  joinLot(lotId: string) {
    this.rooms.add(lotId);
    window.setTimeout(() => this.emitState(lotId), 40);
    this.startTicker();
  }

  leaveLot(lotId: string) {
    this.rooms.delete(lotId);
    if (this.rooms.size === 0) this.stopTicker();
  }

  on<K extends keyof RealtimeEventMap>(
    event: K,
    handler: (payload: RealtimeEventMap[K]) => void,
  ) {
    const set = this.handlers.get(event) ?? new Set<Handler>();
    set.add(handler as Handler);
    this.handlers.set(event, set);
    return () => {
      set.delete(handler as Handler);
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

  publish<K extends keyof RealtimeEventMap>(
    event: K,
    payload: RealtimeEventMap[K],
  ) {
    this.handlers.get(event)?.forEach((handler) => handler(payload));
  }

  publishBid(lotId: string, bidId: string) {
    const bid = lotBids(lotId).find((item) => item.id === bidId);
    if (!bid) return;
    const serialized = serializeBid(bid);
    this.publish('bid:new', {
      lotId,
      bid: {
        id: serialized.id,
        amount: serialized.amount,
        createdAt: serialized.createdAt,
        bidder: {
          id: serialized.bidder.id,
          name: serialized.bidder.name,
        },
      },
    });
  }

  private emitState(lotId: string) {
    if (!this.rooms.has(lotId)) return;
    const lot = findLot(lotId);
    if (!lot) return;
    const bids = lotBids(lotId);
    const timing = timingFor(lot);
    this.publish('auction:state', {
      lotId,
      status: lot.status,
      currentPrice: bids[0]?.amount ?? lot.startingPrice,
      bidCount: bids.length,
      timeRemaining: timing.status === 'ended' ? 0 : timing.timeRemaining,
    });
  }

  private startTicker() {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => {
      this.rooms.forEach((lotId) => {
        const lot = findLot(lotId);
        if (!lot) return;
        const timing = timingFor(lot);
        this.publish('auction:timer', {
          lotId,
          timeRemaining:
            timing.status === 'ended' ? 0 : Math.max(0, timing.timeRemaining),
        });
      });
    }, 5000);
  }

  private stopTicker() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private setStatus(status: RealtimeStatus) {
    this.status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }
}

export const mockRealtimeClient = new MockRealtimeClient();

export function publishMockBid(lotId: string, bidId: string) {
  mockRealtimeClient.publishBid(lotId, bidId);
}

export function publishMockStatusChange(lotId: string) {
  const lot = findLot(lotId);
  if (!lot) return;
  mockRealtimeClient.publish('auction:status_change', {
    lotId,
    status: lot.status,
    startsAt: lot.startsAt,
    endsAt: lot.endsAt,
  });
}

export function publishMockEnded(lotId: string) {
  const lot = findLot(lotId);
  if (!lot) return;
  const highest = lotBids(lotId)[0];
  mockRealtimeClient.publish('auction:ended', {
    lotId,
    status: lot.status,
    winner: highest
      ? {
          id: highest.bidderId,
          name: 'Participante',
        }
      : null,
    finalPrice: highest?.amount ?? null,
  });
}
