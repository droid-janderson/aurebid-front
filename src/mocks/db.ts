import type {
  Bid,
  BidAuditStamp,
  Lot,
  LotStatus,
  ReservationStatus,
  SettlementStatus,
  User,
  Wallet,
  WalletReservation,
  WalletTransaction,
} from '@/types/domain';
import { CATALOG_CARDS, snapshotFor } from '@/mocks/fixtures/cards';

export interface MockUser extends User {
  password: string;
}

type StoredLot = Omit<
  Lot,
  | 'seller'
  | 'bids'
  | 'currentPrice'
  | 'bidCount'
  | 'timing'
  | 'settlement'
  | '_count'
>;

interface StoredBid {
  id: string;
  lotId: string;
  bidderId: string;
  amount: number;
  createdAt: string;
  audit: BidAuditStamp;
}

interface StoredWallet {
  userId: string;
  balance: number;
  reservations: WalletReservation[];
  transactions: WalletTransaction[];
}

interface StoredSettlement {
  id: string;
  lotId: string;
  winningBidId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  receiptNumber: string;
  publicToken: string;
  status: SettlementStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockDatabase {
  users: MockUser[];
  lots: StoredLot[];
  bids: StoredBid[];
  wallets: StoredWallet[];
  settlements: StoredSettlement[];
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
let idCounter = 100;

function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${String(idCounter).padStart(3, '0')}`;
}

function fakeHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < input.length; index += 1) {
    const char = input.charCodeAt(index);
    h1 = Math.imul(h1 ^ char, 2654435761);
    h2 = Math.imul(h2 ^ char, 1597334677);
  }
  const left = (h1 >>> 0).toString(16).padStart(8, '0');
  const right = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${left}${right}`.repeat(4).slice(0, 64);
}

function buildSeed(): MockDatabase {
  const now = Date.now();
  const at = (offset: number) => new Date(now + offset).toISOString();

  const users: MockUser[] = [
    {
      id: 'user-admin',
      name: 'Administração AureBid',
      email: 'admin@aurebid.com',
      role: 'ADMIN',
      password: 'admin123',
      createdAt: at(-120 * DAY),
      updatedAt: at(-120 * DAY),
    },
    {
      id: 'user-auctioneer',
      name: 'Helena Vasques',
      email: 'auctioneer@aurebid.com',
      role: 'AUCTIONEER',
      password: 'auctioneer123',
      createdAt: at(-90 * DAY),
      updatedAt: at(-10 * DAY),
    },
    {
      id: 'user-bidder',
      name: 'Marina Duarte',
      email: 'bidder@aurebid.com',
      role: 'BIDDER',
      password: 'bidder123',
      createdAt: at(-60 * DAY),
      updatedAt: at(-2 * DAY),
    },
    {
      id: 'user-bidder-2',
      name: 'Rafael Nogueira',
      email: 'bidder2@aurebid.com',
      role: 'BIDDER',
      password: 'bidder123',
      createdAt: at(-45 * DAY),
      updatedAt: at(-1 * DAY),
    },
    {
      id: 'user-bidder-3',
      name: 'Camila Prado',
      email: 'bidder3@aurebid.com',
      role: 'BIDDER',
      password: 'bidder123',
      createdAt: at(-30 * DAY),
      updatedAt: at(-1 * DAY),
    },
  ];

  const sellerId = 'user-auctioneer';

  const lot = (
    partial: Pick<
      StoredLot,
      'id' | 'externalProductId' | 'title' | 'status' | 'startingPrice' | 'minimumIncrement' | 'startsAt' | 'endsAt'
    > &
      Partial<StoredLot>,
  ): StoredLot => {
    const card = CATALOG_CARDS.find(
      (item) => item.id === partial.externalProductId,
    );
    return {
      sellerId,
      description: card
        ? `Carta ${card.name} do set ${card.setName ?? card.setId}, número ${card.number}. Item de coleção em bom estado, conforme imagem do catálogo.`
        : null,
      imageUrl: card?.imageLarge ?? null,
      productData: card
        ? { card: snapshotFor(card), condition: 'Near Mint', language: 'Inglês' }
        : null,
      createdAt: at(-12 * DAY),
      updatedAt: at(-2 * HOUR),
      ...partial,
      productSource: 'CARDEX',
    };
  };

  const lots: StoredLot[] = [
    lot({
      id: 'lot-001',
      externalProductId: 'base1-4',
      title: 'Charizard · Base Set',
      status: 'ACTIVE',
      startingPrice: 4500,
      minimumIncrement: 250,
      startsAt: at(-4 * HOUR),
      endsAt: at(2.5 * HOUR),
    }),
    lot({
      id: 'lot-002',
      externalProductId: 'base1-58',
      title: 'Pikachu · Base Set',
      status: 'ACTIVE',
      startingPrice: 380,
      minimumIncrement: 20,
      startsAt: at(-2 * HOUR),
      endsAt: at(45 * 60_000),
    }),
    lot({
      id: 'lot-003',
      externalProductId: 'base1-10',
      title: 'Mewtwo · Base Set',
      status: 'SCHEDULED',
      startingPrice: 1200,
      minimumIncrement: 100,
      startsAt: at(18 * HOUR),
      endsAt: at(3 * DAY),
    }),
    lot({
      id: 'lot-004',
      externalProductId: 'sv3-130',
      title: 'Umbreon · Obsidian Flames',
      status: 'SCHEDULED',
      startingPrice: 850,
      minimumIncrement: 50,
      startsAt: at(2 * DAY),
      endsAt: at(5 * DAY),
      createdAt: at(-6 * DAY),
    }),
    lot({
      id: 'lot-005',
      externalProductId: 'base1-2',
      title: 'Blastoise · Base Set',
      status: 'ENDED',
      startingPrice: 1500,
      minimumIncrement: 100,
      startsAt: at(-2 * DAY),
      endsAt: at(-2 * HOUR),
      createdAt: at(-10 * DAY),
    }),
    lot({
      id: 'lot-006',
      externalProductId: 'base1-15',
      title: 'Venusaur · Base Set',
      status: 'SETTLED',
      startingPrice: 1200,
      minimumIncrement: 100,
      startsAt: at(-8 * DAY),
      endsAt: at(-4 * DAY),
      createdAt: at(-20 * DAY),
      updatedAt: at(-2 * DAY),
    }),
    lot({
      id: 'lot-007',
      externalProductId: 'base3-5',
      title: 'Gengar · Fossil',
      status: 'ENDED',
      startingPrice: 950,
      minimumIncrement: 50,
      startsAt: at(-5 * DAY),
      endsAt: at(-2 * DAY),
      createdAt: at(-14 * DAY),
    }),
    lot({
      id: 'lot-008',
      externalProductId: 'bw11-93',
      title: 'Rayquaza · Legendary Treasures',
      status: 'ACTIVE',
      startingPrice: 900,
      minimumIncrement: 50,
      startsAt: at(-1 * HOUR),
      endsAt: at(5 * HOUR),
      createdAt: at(-3 * DAY),
    }),
    lot({
      id: 'lot-009',
      externalProductId: 'sv8pt5-82',
      title: 'Lugia ex · Prismatic Evolutions',
      status: 'SCHEDULED',
      startingPrice: 1500,
      minimumIncrement: 100,
      startsAt: at(3 * DAY),
      endsAt: at(7 * DAY),
      createdAt: at(-2 * DAY),
    }),
    lot({
      id: 'lot-010',
      externalProductId: 'base2-51',
      title: 'Eevee · Jungle',
      status: 'ACTIVE',
      startingPrice: 260,
      minimumIncrement: 20,
      startsAt: at(-1.5 * HOUR),
      endsAt: at(8 * HOUR),
      createdAt: at(-2 * DAY),
    }),
    lot({
      id: 'lot-011',
      externalProductId: 'base2-11',
      title: 'Snorlax · Jungle',
      status: 'DRAFT',
      startingPrice: 700,
      minimumIncrement: 50,
      startsAt: at(5 * DAY),
      endsAt: at(8 * DAY),
      createdAt: at(-1 * DAY),
    }),
    lot({
      id: 'lot-012',
      externalProductId: 'base3-4',
      title: 'Dragonite · Fossil',
      status: 'CANCELLED',
      startingPrice: 1100,
      minimumIncrement: 100,
      startsAt: at(-3 * DAY),
      endsAt: at(-1 * DAY),
      createdAt: at(-12 * DAY),
    }),
  ];

  const bids: StoredBid[] = [];
  const auditCounters = new Map<string, { sequence: number; hash: string | null }>();

  const addBid = (
    id: string,
    lotId: string,
    bidderId: string,
    amount: number,
    createdAt: string,
  ) => {
    const state = auditCounters.get(lotId) ?? { sequence: 0, hash: null };
    const sequence = state.sequence + 1;
    const currentHash = fakeHash(
      `${state.hash ?? ''}|${lotId}|${id}|${amount.toFixed(2)}|${createdAt}`,
    );
    bids.push({
      id,
      lotId,
      bidderId,
      amount,
      createdAt,
      audit: {
        sequence,
        currentHash,
        previousHash: state.hash,
        createdAt,
      },
    });
    auditCounters.set(lotId, { sequence, hash: currentHash });
  };

  addBid('bid-001', 'lot-001', 'user-bidder-2', 5500, at(-3 * HOUR));
  addBid('bid-002', 'lot-001', 'user-bidder', 6000, at(-2 * HOUR));
  addBid('bid-003', 'lot-001', 'user-bidder-2', 6500, at(-40 * 60_000));

  addBid('bid-004', 'lot-002', 'user-bidder-2', 420, at(-30 * 60_000));
  addBid('bid-005', 'lot-002', 'user-bidder', 460, at(-10 * 60_000));

  addBid('bid-006', 'lot-005', 'user-bidder', 1500, at(-30 * HOUR));
  addBid('bid-007', 'lot-005', 'user-bidder-2', 1800, at(-20 * HOUR));
  addBid('bid-008', 'lot-005', 'user-bidder-3', 2000, at(-8 * HOUR));
  addBid('bid-009', 'lot-005', 'user-bidder-2', 2100, at(-4 * HOUR));

  addBid('bid-010', 'lot-006', 'user-bidder-2', 1500, at(-6 * DAY));
  addBid('bid-011', 'lot-006', 'user-bidder', 1800, at(-5 * DAY));

  addBid('bid-012', 'lot-008', 'user-bidder', 1000, at(-20 * 60_000));

  const reservation = (
    id: string,
    walletUserId: string,
    lotId: string,
    bidId: string,
    amount: number,
    status: ReservationStatus,
    createdAt: string,
  ): WalletReservation => ({
    id,
    walletId: `wallet-${walletUserId}`,
    lotId,
    bidId,
    amount,
    status,
    createdAt,
    updatedAt: createdAt,
  });

  const bidderReservations: WalletReservation[] = [
    reservation('res-001', 'user-bidder', 'lot-001', 'bid-002', 6000, 'ACTIVE', at(-2 * HOUR)),
    reservation('res-002', 'user-bidder', 'lot-002', 'bid-005', 460, 'ACTIVE', at(-10 * 60_000)),
    reservation('res-003', 'user-bidder', 'lot-008', 'bid-012', 1000, 'ACTIVE', at(-20 * 60_000)),
    reservation('res-004', 'user-bidder', 'lot-005', 'bid-006', 1500, 'RELEASED', at(-30 * HOUR)),
    reservation('res-005', 'user-bidder', 'lot-006', 'bid-011', 1800, 'CONSUMED', at(-5 * DAY)),
  ];

  const bidder2Reservations: WalletReservation[] = [
    reservation('res-006', 'user-bidder-2', 'lot-001', 'bid-003', 6500, 'ACTIVE', at(-40 * 60_000)),
    reservation('res-007', 'user-bidder-2', 'lot-002', 'bid-004', 420, 'ACTIVE', at(-30 * 60_000)),
    reservation('res-008', 'user-bidder-2', 'lot-005', 'bid-009', 2100, 'ACTIVE', at(-4 * HOUR)),
    reservation('res-009', 'user-bidder-2', 'lot-006', 'bid-010', 1500, 'RELEASED', at(-6 * DAY)),
  ];

  const bidder3Reservations: WalletReservation[] = [
    reservation('res-010', 'user-bidder-3', 'lot-005', 'bid-008', 2000, 'RELEASED', at(-8 * HOUR)),
  ];

  const settlement006: StoredSettlement = {
    id: 'settlement-006',
    lotId: 'lot-006',
    winningBidId: 'bid-011',
    buyerId: 'user-bidder',
    sellerId,
    amount: 1800,
    receiptNumber: 'REC-2026-0001',
    publicToken: 'rec-demo-2026',
    status: 'COMPLETED',
    completedAt: at(-2 * DAY),
    createdAt: at(-4 * DAY),
    updatedAt: at(-2 * DAY),
  };

  const settlement005: StoredSettlement = {
    id: 'settlement-005',
    lotId: 'lot-005',
    winningBidId: 'bid-009',
    buyerId: 'user-bidder-2',
    sellerId,
    amount: 2100,
    receiptNumber: 'REC-2026-0005',
    publicToken: 'rec-blastoise-demo',
    status: 'PENDING',
    completedAt: null,
    createdAt: at(-2 * HOUR),
    updatedAt: at(-2 * HOUR),
  };

  const transaction = (
    id: string,
    walletUserId: string,
    type: WalletTransaction['type'],
    amount: number,
    description: string,
    createdAt: string,
    settlementId: string | null = null,
  ): WalletTransaction => ({
    id,
    walletId: `wallet-${walletUserId}`,
    settlementId,
    type,
    amount,
    description,
    createdAt,
    settlement:
      settlementId === 'settlement-006'
        ? {
            id: 'settlement-006',
            receiptNumber: 'REC-2026-0001',
            status: 'COMPLETED',
          }
        : null,
  });

  const wallets: StoredWallet[] = [
    {
      userId: 'user-bidder',
      balance: 48200,
      reservations: bidderReservations,
      transactions: [
        transaction('tx-001', 'user-bidder', 'DEPOSIT', 50000, 'Depósito simulado de demonstração', at(-30 * DAY)),
        transaction('tx-002', 'user-bidder', 'BUYER_SETTLEMENT_DEBIT', -1800, 'Débito do arremate REC-2026-0001', at(-2 * DAY), 'settlement-006'),
      ],
    },
    {
      userId: 'user-bidder-2',
      balance: 40000,
      reservations: bidder2Reservations,
      transactions: [
        transaction('tx-003', 'user-bidder-2', 'DEPOSIT', 40000, 'Depósito simulado de demonstração', at(-25 * DAY)),
      ],
    },
    {
      userId: 'user-bidder-3',
      balance: 30000,
      reservations: bidder3Reservations,
      transactions: [
        transaction('tx-004', 'user-bidder-3', 'DEPOSIT', 30000, 'Depósito simulado de demonstração', at(-20 * DAY)),
      ],
    },
    {
      userId: 'user-auctioneer',
      balance: 23500,
      reservations: [],
      transactions: [
        transaction('tx-005', 'user-auctioneer', 'DEPOSIT', 10000, 'Saldo inicial de demonstração', at(-60 * DAY)),
        transaction('tx-006', 'user-auctioneer', 'SELLER_SETTLEMENT_CREDIT', 1800, 'Crédito do arremate REC-2026-0001', at(-2 * DAY), 'settlement-006'),
        transaction('tx-007', 'user-auctioneer', 'SELLER_SETTLEMENT_CREDIT', 11700, 'Crédito de arremate (histórico)', at(-25 * DAY)),
      ],
    },
    {
      userId: 'user-admin',
      balance: 10000,
      reservations: [],
      transactions: [
        transaction('tx-008', 'user-admin', 'DEPOSIT', 10000, 'Saldo inicial de demonstração', at(-90 * DAY)),
      ],
    },
  ];

  return { users, lots, bids, wallets, settlements: [settlement006, settlement005] };
}

export let mockDb: MockDatabase = buildSeed();

export function resetMockDb() {
  idCounter = 100;
  mockDb = buildSeed();
}

export function nextMockId(prefix: string) {
  return nextId(prefix);
}

export function publicUser(user: MockUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function findUser(userId: string) {
  return mockDb.users.find((user) => user.id === userId);
}

export function findUserByEmail(email: string) {
  return mockDb.users.find(
    (user) => user.email.toLowerCase() === email.toLowerCase(),
  );
}

export function findLot(lotId: string) {
  return mockDb.lots.find((lot) => lot.id === lotId);
}

export function lotBids(lotId: string) {
  return mockDb.bids
    .filter((bid) => bid.lotId === lotId)
    .sort((a, b) => b.amount - a.amount);
}

export function appendMockBid(
  lotId: string,
  bidderId: string,
  amount: number,
): StoredBid {
  const previous = [...mockDb.bids]
    .filter((bid) => bid.lotId === lotId)
    .sort((a, b) => b.audit.sequence - a.audit.sequence)[0];
  const sequence = (previous?.audit.sequence ?? 0) + 1;
  const createdAt = new Date().toISOString();
  const previousHash = previous?.audit.currentHash ?? null;
  const id = nextId('bid');
  const currentHash = fakeHash(
    `${previousHash ?? ''}|${lotId}|${id}|${amount.toFixed(2)}|${createdAt}`,
  );

  const bid: StoredBid = {
    id,
    lotId,
    bidderId,
    amount,
    createdAt,
    audit: { sequence, currentHash, previousHash, createdAt },
  };

  mockDb.bids.push(bid);
  return bid;
}

export function releaseLotReservations(lotId: string, keepUserId?: string) {
  mockDb.wallets.forEach((wallet) => {
    if (keepUserId && wallet.userId === keepUserId) return;
    wallet.reservations.forEach((reservation) => {
      if (reservation.lotId === lotId && reservation.status === 'ACTIVE') {
        reservation.status = 'RELEASED';
        reservation.updatedAt = new Date().toISOString();
      }
    });
  });
}

export function timingFor(lot: StoredLot): Lot['timing'] {
  const now = Date.now();
  const start = new Date(lot.startsAt).getTime();
  const end = new Date(lot.endsAt).getTime();

  if (lot.status === 'ENDED' || lot.status === 'SETTLED' || now > end) {
    return { status: 'ended', timeRemaining: 0, timeUntilStart: 0 };
  }

  if (now < start) {
    return {
      status: 'scheduled',
      timeRemaining: end - start,
      timeUntilStart: start - now,
    };
  }

  return {
    status: 'active',
    timeRemaining: end - now,
    timeUntilStart: 0,
  };
}

export function serializeBid(bid: StoredBid): Bid {
  const bidder = findUser(bid.bidderId);
  return {
    id: bid.id,
    lotId: bid.lotId,
    bidderId: bid.bidderId,
    amount: bid.amount,
    createdAt: bid.createdAt,
    bidder: {
      id: bidder?.id ?? bid.bidderId,
      name: bidder?.name ?? 'Participante',
    },
    audit: bid.audit,
  };
}

export function serializeLot(
  lot: StoredLot,
  mode: 'list' | 'detail' = 'list',
): Lot {
  const seller = findUser(lot.sellerId);
  const bids = lotBids(lot.id);
  const highest = bids[0];
  const settlement = mockDb.settlements.find(
    (item) => item.lotId === lot.id,
  );

  return {
    ...lot,
    seller: {
      id: seller?.id ?? lot.sellerId,
      name: seller?.name ?? 'Leiloeiro',
      email: seller?.email,
    },
    bids:
      mode === 'detail'
        ? bids.slice(0, 10).map(serializeBid)
        : highest
          ? [
              {
                id: highest.id,
                lotId: highest.lotId,
                bidderId: highest.bidderId,
                amount: highest.amount,
                createdAt: highest.createdAt,
                bidder: {
                  id: highest.bidderId,
                  name: findUser(highest.bidderId)?.name ?? 'Participante',
                },
                audit: highest.audit,
              },
            ]
          : [],
    currentPrice: highest?.amount ?? lot.startingPrice,
    bidCount: bids.length,
    timing: timingFor(lot),
    settlement: settlement
      ? {
          id: settlement.id,
          status: settlement.status,
          amount: settlement.amount,
          receiptNumber: settlement.receiptNumber,
          publicToken: settlement.publicToken,
          completedAt: settlement.completedAt,
        }
      : null,
    _count: {
      bids: bids.length,
      auditEntries: bids.length,
      reservations: mockDb.wallets.reduce(
        (total, wallet) =>
          total +
          wallet.reservations.filter(
            (reservation) =>
              reservation.lotId === lot.id && reservation.status === 'ACTIVE',
          ).length,
        0,
      ),
    },
  };
}

export function serializeWallet(wallet: StoredWallet): Wallet {
  const reservedAmount = wallet.reservations
    .filter((reservation) => reservation.status === 'ACTIVE')
    .reduce((total, reservation) => total + reservation.amount, 0);

  const availableAmount = wallet.balance - reservedAmount;

  return {
    id: `wallet-${wallet.userId}`,
    balance: wallet.balance,
    reservedAmount,
    availableAmount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    formatted: {
      balance: wallet.balance.toFixed(2),
      reservedAmount: reservedAmount.toFixed(2),
      availableAmount: availableAmount.toFixed(2),
    },
    reservations: wallet.reservations
      .filter((reservation) => reservation.status === 'ACTIVE')
      .map((reservation) => {
        const lot = findLot(reservation.lotId);
        return {
          ...reservation,
          lot: lot
            ? {
                id: lot.id,
                title: lot.title,
                status: lot.status,
                endsAt: lot.endsAt,
              }
            : undefined,
        };
      }),
    recentTransactions: [...wallet.transactions]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 10),
  };
}

export function serializeSettlement(settlement: StoredSettlement) {
  const lot = findLot(settlement.lotId);
  const winningBid = mockDb.bids.find(
    (bid) => bid.id === settlement.winningBidId,
  );
  const buyer = findUser(settlement.buyerId);
  const seller = findUser(settlement.sellerId);

  return {
    id: settlement.id,
    lotId: settlement.lotId,
    winningBidId: settlement.winningBidId,
    buyerId: settlement.buyerId,
    sellerId: settlement.sellerId,
    amount: settlement.amount,
    receiptNumber: settlement.receiptNumber,
    publicToken: settlement.publicToken,
    status: settlement.status,
    completedAt: settlement.completedAt,
    createdAt: settlement.createdAt,
    updatedAt: settlement.updatedAt,
    lot: lot
      ? {
          id: lot.id,
          title: lot.title,
          status: lot.status,
          imageUrl: lot.imageUrl,
          endsAt: lot.endsAt,
        }
      : null,
    winningBid: winningBid
      ? {
          id: winningBid.id,
          amount: winningBid.amount,
          createdAt: winningBid.createdAt,
        }
      : null,
    buyer: buyer
      ? { id: buyer.id, name: buyer.name, email: buyer.email }
      : { id: settlement.buyerId, name: 'Comprador' },
    seller: seller
      ? { id: seller.id, name: seller.name, email: seller.email }
      : { id: settlement.sellerId, name: 'Vendedor' },
  };
}

export function walletFor(userId: string) {
  return mockDb.wallets.find((wallet) => wallet.userId === userId);
}

export function addWalletTransaction(
  userId: string,
  type: WalletTransaction['type'],
  amount: number,
  description: string,
) {
  const wallet = walletFor(userId);
  if (!wallet) return null;
  const transaction: WalletTransaction = {
    id: nextId('tx'),
    walletId: `wallet-${userId}`,
    settlementId: null,
    type,
    amount,
    description,
    createdAt: new Date().toISOString(),
    settlement: null,
  };
  wallet.transactions.unshift(transaction);
  return transaction;
}

export function availableForBid(userId: string, lotId: string): number {
  const wallet = walletFor(userId);
  if (!wallet) return 0;
  const reservedElsewhere = wallet.reservations
    .filter(
      (reservation) =>
        reservation.status === 'ACTIVE' && reservation.lotId !== lotId,
    )
    .reduce((total, reservation) => total + reservation.amount, 0);
  return wallet.balance - reservedElsewhere;
}

export function statusCounts() {
  const counts = {
    published: 0,
    scheduled: 0,
    active: 0,
    ended: 0,
    settled: 0,
  };
  mockDb.lots.forEach((lot) => {
    if (!['DRAFT', 'CANCELLED'].includes(lot.status)) counts.published += 1;
    if (lot.status === 'SCHEDULED') counts.scheduled += 1;
    if (lot.status === 'ACTIVE') counts.active += 1;
    if (lot.status === 'ENDED') counts.ended += 1;
    if (lot.status === 'SETTLED') {
      counts.ended += 1;
      counts.settled += 1;
    }
  });
  return counts;
}

export function isPublicStatus(status: LotStatus) {
  return status !== 'DRAFT' && status !== 'CANCELLED';
}
