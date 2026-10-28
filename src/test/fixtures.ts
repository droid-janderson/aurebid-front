import type { Batch, Bid, Settlement, User } from '@/types/domain';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();

function iso(offsetMs: number): string {
  return new Date(now + offsetMs).toISOString();
}

export const demoUsers: Record<string, User> = {
  'user-bidder': {
    id: 'user-bidder',
    name: 'Ana Licitante',
    email: 'bidder@aurebid.com',
    role: 'BIDDER',
  },
  'user-bidder-2': {
    id: 'user-bidder-2',
    name: 'Bruno Licitante',
    email: 'bidder2@aurebid.com',
    role: 'BIDDER',
  },
  'user-auctioneer': {
    id: 'user-auctioneer',
    name: 'Carla Leiloeira',
    email: 'auctioneer@aurebid.com',
    role: 'AUCTIONEER',
  },
};

const seller = { id: 'user-auctioneer', name: 'Carla Leiloeira' };

function bid(
  batchId: string,
  id: string,
  amount: number,
  label: string,
  isMine = false,
  sequence = 1,
): Bid {
  return {
    id,
    batchId,
    amount,
    createdAt: iso(-30 * 60 * 1000),
    bidder: { label, isMine },
    audit: {
      sequence,
      currentHash: `hash-${id}-${'0'.repeat(40)}`,
      previousHash: sequence > 1 ? `hash-${sequence - 1}` : null,
      createdAt: iso(-30 * 60 * 1000),
    },
  };
}

export const activeBatch: Batch = {
  id: 'batch-001',
  sellerId: 'user-auctioneer',
  productSource: 'CARDEX',
  externalProductId: 'base-004',
  title: 'Charizard · Base Set',
  description: 'Carta icônica em bom estado.',
  imageUrl: null,
  productData: { setName: 'Base Set', number: '4', rarity: 'Rare Holo' },
  startingPrice: 1000,
  minimumIncrement: 100,
  startsAt: iso(-DAY),
  endsAt: iso(HOUR),
  status: 'ACTIVE',
  createdAt: iso(-2 * DAY),
  updatedAt: iso(-HOUR),
  seller,
  bids: [bid('batch-001', 'bid-high', 1500, 'Licitante 7F3A', false, 3)],
  currentPrice: 1500,
  bidCount: 3,
  timing: { status: 'active', timeRemaining: HOUR, timeUntilStart: 0 },
  settlement: null,
};

export const scheduledBatch: Batch = {
  ...activeBatch,
  id: 'batch-003',
  externalProductId: 'base-002',
  title: 'Pikachu · Base Set',
  status: 'SCHEDULED',
  startsAt: iso(DAY),
  endsAt: iso(2 * DAY),
  currentPrice: 500,
  bidCount: 0,
  bids: [],
  timing: { status: 'scheduled', timeRemaining: 2 * DAY, timeUntilStart: DAY },
};

export const endedBatch: Batch = {
  ...activeBatch,
  id: 'batch-005',
  externalProductId: 'base-009',
  title: 'Blastoise · Base Set',
  status: 'ENDED',
  startsAt: iso(-2 * DAY),
  endsAt: iso(-HOUR),
  bids: [bid('batch-005', 'bid-winner', 4200, 'Licitante 4A1C', false, 1)],
  currentPrice: 4200,
  bidCount: 1,
  timing: { status: 'ended', timeRemaining: 0, timeUntilStart: 0 },
  settlement: {
    id: 'settlement-005',
    status: 'COMPLETED',
    amount: 4200,
    receiptNumber: 'REC-2026-0006',
    publicToken: 'rec-demo-2026',
    completedAt: iso(-30 * 60 * 1000),
    buyerLabel: 'Comprador 4A1C',
    sellerLabel: 'Vendedor 9B2D',
  },
};

export const batches: Batch[] = [activeBatch, scheduledBatch, endedBatch];

export function batchById(id: string): Batch | undefined {
  return batches.find((batch) => batch.id === id);
}

export function bidsFor(batchId: string, viewerId: string | null): Bid[] {
  const batch = batchById(batchId);
  if (!batch) return [];

  if (batchId === 'batch-001') {
    const mine = (ownerId: string) => viewerId === ownerId;
    return [
      {
        ...bid(batchId, 'bid-high', 1500, 'Licitante 7F3A', false, 3),
        bidder: {
          label: 'Licitante 7F3A',
          isMine: mine('user-bidder-2'),
        },
      },
      {
        ...bid(batchId, 'bid-mid', 1400, 'Licitante 2C8D', false, 2),
        bidder: {
          label: 'Licitante 2C8D',
          isMine: mine('user-bidder'),
        },
      },
      {
        ...bid(batchId, 'bid-low', 1300, 'Licitante 7F3A', false, 1),
        bidder: {
          label: 'Licitante 7F3A',
          isMine: mine('user-bidder-2'),
        },
      },
    ];
  }

  return (batch.bids ?? []).map((item) => ({
    ...item,
    bidder: {
      ...item.bidder,
      isMine: false,
    },
  }));
}

export const publicSettlement: Settlement = {
  id: 'settlement-006',
  batchId: 'batch-006',
  winningBidId: 'bid-006',
  amount: 7800,
  receiptNumber: 'REC-2026-0001',
  status: 'COMPLETED',
  completedAt: iso(-HOUR),
  createdAt: iso(-HOUR - 5000),
  updatedAt: iso(-HOUR),
  batchTitle: 'Venusaur · Base Set',
  batchImageUrl: null,
  batchEndsAt: iso(-2 * HOUR),
  buyerLabel: 'Comprador 4A1C',
  sellerLabel: 'Vendedor 9B2D',
  failureReason: null,
  batch: {
    id: 'batch-006',
    title: 'Venusaur · Base Set',
    status: 'SETTLED',
    imageUrl: null,
    endsAt: iso(-2 * HOUR),
  },
  winningBid: {
    id: 'bid-006',
    amount: 7800,
    createdAt: iso(-2 * HOUR - 10_000),
  },
  buyer: { label: 'Comprador 4A1C' },
  seller: { label: 'Vendedor 9B2D' },
};
