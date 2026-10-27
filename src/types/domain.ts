export type UserRole = 'ADMIN' | 'AUCTIONEER' | 'BIDDER';

export type BatchStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'ENDED'
  | 'SETTLED'
  | 'CANCELLED';

export type SettlementStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type ReservationStatus = 'ACTIVE' | 'RELEASED' | 'CONSUMED';

export type WalletTransactionType =
  | 'DEPOSIT'
  | 'BUYER_SETTLEMENT_DEBIT'
  | 'SELLER_SETTLEMENT_CREDIT'
  | 'REFUND'
  | 'ADJUSTMENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
  wallet?: {
    id: string;
    balance: number;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface BatchSeller {
  id: string;
  name: string;
  email?: string;
}

export interface BatchTiming {
  status: 'scheduled' | 'active' | 'ended';
  timeRemaining: number;
  timeUntilStart: number;
}

export interface BidAuditStamp {
  sequence: number;
  currentHash: string;
  previousHash?: string | null;
  createdAt?: string;
}

export interface BidderSummary {
  id: string;
  name: string;
  email?: string;
}

export interface Bid {
  id: string;
  batchId: string;
  bidderId: string;
  amount: number;
  createdAt: string;
  bidder: BidderSummary;
  audit?: BidAuditStamp | null;
  batch?: Pick<
    Batch,
    | 'id'
    | 'title'
    | 'status'
    | 'startingPrice'
    | 'minimumIncrement'
    | 'startsAt'
    | 'endsAt'
    | 'imageUrl'
    | 'seller'
  >;
}

export interface BatchSettlementSummary {
  id: string;
  status: SettlementStatus;
  amount: number;
  receiptNumber: string;
  publicToken: string;
  completedAt: string | null;
}

export interface Batch {
  id: string;
  sellerId: string;
  productSource: string;
  externalProductId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  productData: Record<string, unknown> | null;
  startingPrice: number;
  minimumIncrement: number;
  startsAt: string;
  endsAt: string;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
  seller: BatchSeller;
  bids?: Bid[];
  currentPrice: number;
  bidCount: number;
  timing: BatchTiming;
  settlement?: BatchSettlementSummary | null;
  _count?: {
    bids?: number;
    auditEntries?: number;
    reservations?: number;
  };
}

export interface BatchListFilters {
  page?: number;
  limit?: number;
  status?: BatchStatus;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'createdAt' | 'startsAt' | 'endsAt' | 'title' | 'startingPrice';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateBatchInput {
  productSource: string;
  externalProductId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  productData?: Record<string, unknown>;
  startingPrice: number;
  minimumIncrement: number;
  startsAt: string;
  endsAt: string;
  status?: 'DRAFT' | 'SCHEDULED';
}

export type UpdateBatchInput = Partial<CreateBatchInput>;

export interface WalletReservation {
  id: string;
  walletId: string;
  batchId: string;
  bidId: string | null;
  amount: number;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
  batch?: {
    id: string;
    title: string;
    status: BatchStatus;
    endsAt: string;
  };
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  settlementId: string | null;
  type: WalletTransactionType;
  amount: number;
  description: string | null;
  createdAt: string;
  settlement?: {
    id: string;
    receiptNumber: string;
    status: SettlementStatus;
  } | null;
}

export interface Wallet {
  id: string;
  balance: number;
  reservedAmount: number;
  availableAmount: number;
  createdAt: string;
  updatedAt: string;
  formatted?: {
    balance: string;
    reservedAmount: string;
    availableAmount: string;
  };
  reservations: WalletReservation[];
  recentTransactions: WalletTransaction[];
}

export interface WalletTransactionPage {
  transactions: WalletTransaction[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DepositInput {
  amount: number;
  method: 'PIX' | 'BANK_TRANSFER';
}

export interface Settlement {
  id: string;
  batchId: string;
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
  batch: {
    id: string;
    title: string;
    status: BatchStatus;
    imageUrl: string | null;
    endsAt: string;
  };
  winningBid: {
    id: string;
    amount: number;
    createdAt: string;
  } | null;
  buyer: BidderSummary;
  seller: BidderSummary;
}

export interface AuditEntry {
  id: string;
  bidId: string;
  batchId: string;
  sequence: number;
  previousHash: string | null;
  currentHash: string;
  createdAt: string;
  bid: {
    id: string;
    amount: number;
    createdAt: string;
    bidder: BidderSummary;
  } | null;
  batch: {
    id: string;
    title: string;
    status: BatchStatus;
  } | null;
}

export type AuditIntegrityStatus = 'VERIFIED' | 'FAILED' | 'UNAVAILABLE';

export interface AuditVerification {
  status: AuditIntegrityStatus;
  entries: number;
  checkedAt: string | null;
  brokenAtSequence?: number;
  reason?: string;
}

export interface CatalogCard {
  id: string;
  name: string;
  setId: string;
  setName?: string;
  number: string;
  imageSmall: string | null;
  imageLarge: string | null;
  rarity: string | null;
  supertype: string | null;
  subtypes: string[];
  types: string[];
  cardmarketLowPrice?: number | null;
  tcgplayerLowPrice?: number | null;
}

export interface CatalogCardPage {
  items: CatalogCard[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SellerSummary {
  published: number;
  scheduled: number;
  active: number;
  ended: number;
  settled: number;
  auctioned: number;
  totalReceived: number;
  currency: 'BRL';
}

export interface PokemonCardSnapshot {
  source: 'CARDEX';
  externalId: string;
  setId?: string;
  setName?: string;
  number?: string;
  rarity?: string | null;
  supertype?: string | null;
  subtypes?: string[];
  types?: string[];
  imageSmall?: string | null;
  imageLarge?: string | null;
}
