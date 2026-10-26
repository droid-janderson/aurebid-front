import { delay, http, HttpResponse } from 'msw';
import type {
  Bid,
  Lot,
  LotStatus,
  SettlementStatus,
  User,
  WalletTransaction,
} from '@/types/domain';
import type { FieldError } from '@/types/api';
import { env } from '@/utils/env';
import {
  appendMockBid,
  availableForBid,
  findLot,
  findUser,
  findUserByEmail,
  isPublicStatus,
  lotBids,
  mockDb,
  nextMockId,
  publicUser,
  releaseLotReservations,
  serializeBid,
  serializeLot,
  serializeSettlement,
  serializeWallet,
  statusCounts,
  walletFor,
  type MockUser,
} from '@/mocks/db';
import {
  publishMockBid,
  publishMockEnded,
  publishMockStatusChange,
} from '@/mocks/realtime';
import { CATALOG_CARDS } from '@/mocks/fixtures/cards';

const ACCESS_PREFIX = 'mock.access.';
const REFRESH_PREFIX = 'mock.refresh.';

function accessToken(userId: string) {
  return `${ACCESS_PREFIX}${userId}`;
}

function refreshToken(userId: string) {
  return `${REFRESH_PREFIX}${userId}`;
}

function userFromToken(token: string | null): MockUser | null {
  if (!token?.startsWith(ACCESS_PREFIX)) return null;
  return findUser(token.slice(ACCESS_PREFIX.length)) ?? null;
}

function currentUser(request: Request): MockUser | null {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return userFromToken(header.slice(7));
}

function ok<T>(data: T, message?: string, status = 200) {
  return HttpResponse.json(
    { success: true, data, ...(message ? { message } : {}) },
    { status },
  );
}

function fail(
  status: number,
  error: string,
  message: string,
  errors?: FieldError[],
) {
  return HttpResponse.json(
    { success: false, error, message, ...(errors ? { errors } : {}) },
    { status },
  );
}

function unauthorized() {
  return fail(401, 'AUTHENTICATION_ERROR', 'Access token required');
}

function forbidden() {
  return fail(403, 'AUTHORIZATION_ERROR', 'Insufficient permissions');
}

function notFound(resource: string) {
  return fail(404, 'NOT_FOUND', `${resource} not found`);
}

function validation(errors: FieldError[]) {
  return fail(400, 'VALIDATION_ERROR', 'Validation failed', errors);
}

async function wait() {
  const ms = import.meta.env.MODE === 'test' ? 0 : env.mockLatencyMs;
  if (ms > 0) await delay(ms);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    return asRecord(await request.json());
  } catch {
    return {};
  }
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function queryNumber(url: URL, key: string, fallback: number) {
  const value = Number(url.searchParams.get(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function paginate<T>(items: T[], page: number, limit: number) {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * safeLimit;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    data: items.slice(start, start + safeLimit),
    meta: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
    },
  };
}

function filterAndSortLots(options: {
  sellerId?: string;
  includePrivate: boolean;
  status?: LotStatus;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  let lots = [...mockDb.lots];

  if (options.sellerId) {
    lots = lots.filter((lot) => lot.sellerId === options.sellerId);
  }

  if (!options.includePrivate) {
    lots = lots.filter((lot) => isPublicStatus(lot.status));
  }

  if (options.status) {
    lots = lots.filter((lot) => lot.status === options.status);
  }

  if (options.search) {
    const term = options.search.toLowerCase();
    lots = lots.filter(
      (lot) =>
        lot.title.toLowerCase().includes(term) ||
        lot.externalProductId.toLowerCase().includes(term) ||
        lot.description?.toLowerCase().includes(term),
    );
  }

  if (options.minPrice !== undefined) {
    lots = lots.filter((lot) => lot.startingPrice >= options.minPrice!);
  }

  if (options.maxPrice !== undefined) {
    lots = lots.filter((lot) => lot.startingPrice <= options.maxPrice!);
  }

  const sortBy = options.sortBy ?? 'startsAt';
  const direction = options.sortOrder === 'desc' ? -1 : 1;

  lots.sort((a, b) => {
    if (sortBy === 'startingPrice') {
      return (a.startingPrice - b.startingPrice) * direction;
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title) * direction;
    }
    if (sortBy === 'createdAt') {
      return (
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
        direction
      );
    }
    if (sortBy === 'endsAt') {
      return (
        (new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()) *
        direction
      );
    }
    return (
      (new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()) *
      direction
    );
  });

  return lots;
}

function settlementForLot(lotId: string) {
  return mockDb.settlements.find((settlement) => settlement.lotId === lotId);
}

function publicBid(bid: Bid) {
  return {
    ...bid,
    bidder: { id: bid.bidder.id, name: bid.bidder.name },
  };
}

export const handlers = [
  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------
  http.post(`${env.apiUrl}/auth/login`, async ({ request }) => {
    await wait();
    const body = await readBody(request);
    const email = String(body.email ?? '').trim();
    const password = String(body.password ?? '');
    const user = findUserByEmail(email);

    if (!user || user.password !== password) {
      return fail(
        401,
        'INVALID_CREDENTIALS',
        'E-mail ou senha incorretos.',
      );
    }

    return ok({
      user: publicUser(user),
      accessToken: accessToken(user.id),
      refreshToken: refreshToken(user.id),
    });
  }),

  http.post(`${env.apiUrl}/auth/register`, async ({ request }) => {
    await wait();
    const body = await readBody(request);
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim();
    const password = String(body.password ?? '');
    const role = body.role === 'AUCTIONEER' ? 'AUCTIONEER' : 'BIDDER';

    const errors: FieldError[] = [];
    if (name.length < 2) {
      errors.push({ field: 'name', message: 'Informe seu nome completo.', code: 'too_small' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: 'Informe um e-mail válido.', code: 'invalid_string' });
    }
    if (password.length < 8) {
      errors.push({ field: 'password', message: 'A senha precisa ter ao menos 8 caracteres.', code: 'too_small' });
    }
    if (errors.length > 0) return validation(errors);

    if (findUserByEmail(email)) {
      return fail(409, 'CONFLICT', 'Já existe uma conta com este e-mail.');
    }

    const now = new Date().toISOString();
    const user: MockUser = {
      id: `user-${nextMockId('new')}`,
      name,
      email,
      role,
      password,
      createdAt: now,
      updatedAt: now,
    };
    mockDb.users.push(user);
    mockDb.wallets.push({
      userId: user.id,
      balance: 0,
      reservations: [],
      transactions: [],
    });

    return HttpResponse.json(
      {
        success: true,
        data: {
          user: publicUser(user),
          accessToken: accessToken(user.id),
          refreshToken: refreshToken(user.id),
        },
      },
      { status: 201 },
    );
  }),

  http.post(`${env.apiUrl}/auth/refresh`, async ({ request }) => {
    await wait();
    const body = await readBody(request);
    const token = String(body.refreshToken ?? '');
    if (!token.startsWith(REFRESH_PREFIX)) {
      return fail(401, 'REFRESH_TOKEN_INVALID', 'Invalid refresh token');
    }
    const user = findUser(token.slice(REFRESH_PREFIX.length));
    if (!user) {
      return fail(401, 'REFRESH_TOKEN_INVALID', 'Invalid refresh token');
    }
    return ok({
      accessToken: accessToken(user.id),
      refreshToken: refreshToken(user.id),
    });
  }),

  http.post(`${env.apiUrl}/auth/logout`, async () => {
    await wait();
    return ok(null, 'Logged out successfully');
  }),

  http.get(`${env.apiUrl}/auth/me`, async ({ request }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    const wallet = walletFor(user.id);
    return ok({
      ...publicUser(user),
      wallet: wallet
        ? {
            id: `wallet-${wallet.userId}`,
            balance: wallet.balance,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : null,
    });
  }),

  // -------------------------------------------------------------------------
  // Card catalog (expected backend proxy to Cardex)
  // -------------------------------------------------------------------------
  http.get(`${env.apiUrl}/catalog/cards`, async ({ request }) => {
    await wait();
    const url = new URL(request.url);
    const search = (url.searchParams.get('search') ?? '').trim().toLowerCase();
    const page = queryNumber(url, 'page', 1);
    const limit = queryNumber(url, 'limit', 12);

    const items = CATALOG_CARDS.filter((card) => {
      if (!search) return true;
      return (
        card.name.toLowerCase().includes(search) ||
        (card.setName ?? '').toLowerCase().includes(search) ||
        card.id.toLowerCase().includes(search) ||
        card.number.toLowerCase() === search
      );
    }).sort((a, b) => a.name.localeCompare(b.name));

    const paginated = paginate(items, page, limit);
    return ok({
      items: paginated.data,
      total: paginated.meta.total,
      page: paginated.meta.page,
      totalPages: paginated.meta.totalPages,
    });
  }),

  // -------------------------------------------------------------------------
  // Seller lots
  // -------------------------------------------------------------------------
  http.get(`${env.apiUrl}/catalog/lots/mine/summary`, async ({ request }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    if (!['AUCTIONEER', 'ADMIN'].includes(user.role)) return forbidden();

    const counts = statusCounts();
    const settlements = mockDb.settlements.filter(
      (settlement) =>
        user.role === 'ADMIN' || settlement.sellerId === user.id,
    );
    const totalReceived = settlements
      .filter((settlement) => settlement.status === 'COMPLETED')
      .reduce((total, settlement) => total + settlement.amount, 0);

    return ok({
      ...counts,
      auctioned: settlements.length,
      totalReceived,
      currency: 'BRL',
    });
  }),

  http.get(`${env.apiUrl}/catalog/lots/mine`, async ({ request }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    if (!['AUCTIONEER', 'ADMIN'].includes(user.role)) return forbidden();

    const url = new URL(request.url);
    const status = (url.searchParams.get('status') || undefined) as
      | LotStatus
      | undefined;
    const lots = filterAndSortLots({
      sellerId: user.role === 'ADMIN' ? undefined : user.id,
      includePrivate: true,
      status,
      search: url.searchParams.get('search') ?? undefined,
      sortBy: url.searchParams.get('sortBy') ?? 'createdAt',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'desc',
    });

    const page = queryNumber(url, 'page', 1);
    const limit = queryNumber(url, 'limit', 20);
    const paginated = paginate(lots, page, limit);

    return HttpResponse.json({
      success: true,
      data: paginated.data.map((lot) => serializeLot(lot, 'list')),
      meta: paginated.meta,
    });
  }),

  http.get(`${env.apiUrl}/catalog/lots`, async ({ request }) => {
    await wait();
    const url = new URL(request.url);
    const status = (url.searchParams.get('status') || undefined) as
      | LotStatus
      | undefined;
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');

    const lots = filterAndSortLots({
      includePrivate: false,
      status,
      search: url.searchParams.get('search') ?? undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sortBy: url.searchParams.get('sortBy') ?? 'startsAt',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'asc',
    });

    const paginated = paginate(
      lots,
      queryNumber(url, 'page', 1),
      queryNumber(url, 'limit', 12),
    );

    return HttpResponse.json({
      success: true,
      data: paginated.data.map((lot) => serializeLot(lot, 'list')),
      meta: paginated.meta,
    });
  }),

  http.get(`${env.apiUrl}/catalog/lots/:id`, async ({ params }) => {
    await wait();
    const lot = findLot(String(params.id));
    if (!lot) return notFound('Lot');
    return ok(serializeLot(lot, 'detail'));
  }),

  http.post(`${env.apiUrl}/catalog/lots`, async ({ request }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    if (!['AUCTIONEER', 'ADMIN'].includes(user.role)) return forbidden();

    const body = await readBody(request);
    const errors: FieldError[] = [];
    const title = String(body.title ?? '').trim();
    const productSource = String(body.productSource ?? '').trim();
    const externalProductId = String(body.externalProductId ?? '').trim();
    const startingPrice = Number(body.startingPrice);
    const minimumIncrement = Number(body.minimumIncrement);
    const startsAt = String(body.startsAt ?? '');
    const endsAt = String(body.endsAt ?? '');
    const status = body.status === 'DRAFT' ? 'DRAFT' : 'SCHEDULED';

    if (title.length < 3) {
      errors.push({ field: 'title', message: 'Título deve ter ao menos 3 caracteres.', code: 'too_small' });
    }
    if (!productSource) {
      errors.push({ field: 'productSource', message: 'Origem do produto é obrigatória.', code: 'required' });
    }
    if (!externalProductId) {
      errors.push({ field: 'externalProductId', message: 'Identificador do produto é obrigatório.', code: 'required' });
    }
    if (!Number.isFinite(startingPrice) || startingPrice <= 0) {
      errors.push({ field: 'startingPrice', message: 'Lance inicial deve ser positivo.', code: 'invalid' });
    }
    if (!Number.isFinite(minimumIncrement) || minimumIncrement <= 0) {
      errors.push({ field: 'minimumIncrement', message: 'Incremento deve ser positivo.', code: 'invalid' });
    }
    const startMs = Date.parse(startsAt);
    const endMs = Date.parse(endsAt);
    if (!Number.isFinite(startMs)) {
      errors.push({ field: 'startsAt', message: 'Data de início inválida.', code: 'invalid' });
    }
    if (!Number.isFinite(endMs)) {
      errors.push({ field: 'endsAt', message: 'Data de encerramento inválida.', code: 'invalid' });
    }
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && startMs >= endMs) {
      return fail(400, 'INVALID_DATE_RANGE', 'A data de encerramento precisa ser posterior à de início.');
    }
    if (errors.length > 0) return validation(errors);

    const now = new Date().toISOString();
    const id = nextMockId('lot');
    mockDb.lots.push({
      id,
      sellerId: user.id,
      productSource,
      externalProductId,
      title,
      description: body.description ? String(body.description) : null,
      imageUrl: body.imageUrl ? String(body.imageUrl) : null,
      productData: asRecord(body.productData),
      startingPrice: round2(startingPrice),
      minimumIncrement: round2(minimumIncrement),
      startsAt: new Date(startMs).toISOString(),
      endsAt: new Date(endMs).toISOString(),
      status,
      createdAt: now,
      updatedAt: now,
    });

    return HttpResponse.json(
      {
        success: true,
        message: 'Lot created successfully',
        data: serializeLot(findLot(id)!, 'detail'),
      },
      { status: 201 },
    );
  }),

  http.put(`${env.apiUrl}/catalog/lots/:id`, async ({ request, params }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    const lot = findLot(String(params.id));
    if (!lot) return notFound('Lot');
    if (user.role !== 'ADMIN' && lot.sellerId !== user.id) return forbidden();
    if (['ACTIVE', 'ENDED', 'SETTLED', 'CANCELLED'].includes(lot.status)) {
      return fail(409, 'CONFLICT', 'Cannot update a lot that is active or finished');
    }

    const body = await readBody(request);
    if (body.title !== undefined) lot.title = String(body.title);
    if (body.description !== undefined) {
      lot.description = body.description ? String(body.description) : null;
    }
    if (body.imageUrl !== undefined) {
      lot.imageUrl = body.imageUrl ? String(body.imageUrl) : null;
    }
    if (body.productData !== undefined) {
      lot.productData = asRecord(body.productData);
    }
    if (body.startingPrice !== undefined) {
      lot.startingPrice = round2(Number(body.startingPrice));
    }
    if (body.minimumIncrement !== undefined) {
      lot.minimumIncrement = round2(Number(body.minimumIncrement));
    }
    if (body.startsAt !== undefined) {
      lot.startsAt = new Date(String(body.startsAt)).toISOString();
    }
    if (body.endsAt !== undefined) {
      lot.endsAt = new Date(String(body.endsAt)).toISOString();
    }
    if (body.status === 'DRAFT' || body.status === 'SCHEDULED') {
      lot.status = body.status;
    }

    if (new Date(lot.startsAt) >= new Date(lot.endsAt)) {
      return fail(400, 'INVALID_DATE_RANGE', 'A data de encerramento precisa ser posterior à de início.');
    }

    lot.updatedAt = new Date().toISOString();
    return ok(serializeLot(lot, 'detail'), 'Lot updated successfully');
  }),

  http.delete(`${env.apiUrl}/catalog/lots/:id`, async ({ request, params }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    const lot = findLot(String(params.id));
    if (!lot) return notFound('Lot');
    if (user.role !== 'ADMIN' && lot.sellerId !== user.id) return forbidden();
    if (lot.status !== 'DRAFT') {
      return fail(409, 'CONFLICT', 'Only draft lots can be deleted');
    }

    mockDb.lots = mockDb.lots.filter((item) => item.id !== lot.id);
    return ok(null, 'Lot deleted successfully');
  }),

  // -------------------------------------------------------------------------
  // Auction lifecycle
  // -------------------------------------------------------------------------
  http.post(`${env.apiUrl}/auctions/:id/publish`, async ({ request, params }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    const lot = findLot(String(params.id));
    if (!lot) return notFound('Lot');
    if (user.role !== 'ADMIN' && lot.sellerId !== user.id) return forbidden();
    if (!['DRAFT', 'SCHEDULED'].includes(lot.status)) {
      return fail(409, 'CONFLICT', 'Only draft or scheduled lots can be published');
    }
    if (new Date(lot.endsAt).getTime() <= Date.now()) {
      return fail(400, 'INVALID_DATE_RANGE', 'Lot end date is in the past');
    }

    lot.status =
      new Date(lot.startsAt).getTime() <= Date.now() ? 'ACTIVE' : 'SCHEDULED';
    lot.updatedAt = new Date().toISOString();
    publishMockStatusChange(lot.id);

    return ok(
      serializeLot(lot, 'detail'),
      lot.status === 'ACTIVE' ? 'Lot is now active' : 'Lot scheduled',
    );
  }),

  http.post(`${env.apiUrl}/auctions/:id/cancel`, async ({ request, params }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    const lot = findLot(String(params.id));
    if (!lot) return notFound('Lot');
    if (user.role !== 'ADMIN' && lot.sellerId !== user.id) return forbidden();
    if (['ENDED', 'SETTLED', 'CANCELLED'].includes(lot.status)) {
      return fail(409, 'CONFLICT', 'Cannot cancel a finished lot');
    }

    releaseLotReservations(lot.id);
    lot.status = 'CANCELLED';
    lot.updatedAt = new Date().toISOString();
    publishMockStatusChange(lot.id);

    return ok(serializeLot(lot, 'detail'), 'Lot cancelled successfully');
  }),

  http.post(`${env.apiUrl}/auctions/:id/end`, async ({ request, params }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    const lot = findLot(String(params.id));
    if (!lot) return notFound('Lot');
    if (user.role !== 'ADMIN' && lot.sellerId !== user.id) return forbidden();
    if (lot.status !== 'ACTIVE') {
      return fail(409, 'CONFLICT', 'Only active lots can be ended');
    }

    const highest = lotBids(lot.id)[0] ?? null;
    lot.status = 'ENDED';
    lot.updatedAt = new Date().toISOString();

    releaseLotReservations(lot.id, highest?.bidderId);

    let settlement = settlementForLot(lot.id);
    if (!settlement && highest) {
      const now = new Date().toISOString();
      settlement = {
        id: nextMockId('settlement'),
        lotId: lot.id,
        winningBidId: highest.id,
        buyerId: highest.bidderId,
        sellerId: lot.sellerId,
        amount: highest.amount,
        receiptNumber: `REC-${new Date().getFullYear()}-${String(
          mockDb.settlements.length + 1,
        ).padStart(4, '0')}`,
        publicToken: nextMockId('public'),
        status: 'PENDING',
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      mockDb.settlements.push(settlement);
    }

    publishMockEnded(lot.id);

    return ok({
      lot: serializeLot(lot, 'detail'),
      settlement: settlement ? serializeSettlement(settlement) : null,
    });
  }),

  http.get(`${env.apiUrl}/auctions/:id/audit/verify`, async ({ params }) => {
    await wait();
    const lot = findLot(String(params.id));
    if (!lot) return notFound('Lot');
    const entries = lotBids(lot.id).length;
    return ok({
      lotId: lot.id,
      valid: true,
      entries,
      checkedAt: new Date().toISOString(),
    });
  }),

  http.get(`${env.apiUrl}/auctions/:id/bids`, async ({ request, params }) => {
    await wait();
    const lot = findLot(String(params.id));
    if (!lot) return notFound('Lot');
    const url = new URL(request.url);
    const bids = lotBids(lot.id).map(serializeBid).map(publicBid);
    const paginated = paginate(
      bids,
      queryNumber(url, 'page', 1),
      queryNumber(url, 'limit', 20),
    );
    return HttpResponse.json({
      success: true,
      data: paginated.data,
      meta: paginated.meta,
    });
  }),

  http.post(`${env.apiUrl}/auctions/:id/bids`, async ({ request, params }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    const lot = findLot(String(params.id));
    if (!lot) return notFound('Lot');

    if (lot.sellerId === user.id) {
      return fail(400, 'CANNOT_BID_OWN_LOT', 'Cannot bid on your own lot');
    }

    if (lot.status === 'CANCELLED') {
      return fail(400, 'AUCTION_CANCELLED', 'Lot was cancelled');
    }
    if (lot.status === 'ENDED' || lot.status === 'SETTLED') {
      return fail(400, 'AUCTION_ENDED', 'Lot has ended');
    }
    if (lot.status === 'DRAFT') {
      return fail(400, 'LOT_NOT_ACTIVE', 'Lot is not active');
    }

    const now = Date.now();
    if (now < new Date(lot.startsAt).getTime()) {
      return fail(400, 'AUCTION_NOT_STARTED', 'Lot has not started yet');
    }
    if (now > new Date(lot.endsAt).getTime()) {
      return fail(400, 'AUCTION_ENDED', 'Lot has ended');
    }
    if (lot.status !== 'ACTIVE') {
      return fail(400, 'LOT_NOT_ACTIVE', 'Lot is not active');
    }

    const body = await readBody(request);
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return fail(400, 'INVALID_BID_AMOUNT', 'Bid amount must be positive');
    }

    const highest = lotBids(lot.id)[0] ?? null;
    const minimum = highest
      ? round2(highest.amount + lot.minimumIncrement)
      : lot.startingPrice;

    if (round2(amount) < minimum) {
      return fail(
        400,
        'INVALID_BID_AMOUNT',
        `O lance mínimo para este lote é R$ ${minimum.toFixed(2).replace('.', ',')}.`,
      );
    }

    const wallet = walletFor(user.id);
    if (!wallet) {
      return fail(400, 'WALLET_NOT_FOUND', 'Wallet not found');
    }

    if (availableForBid(user.id, lot.id) < round2(amount)) {
      return fail(400, 'INSUFFICIENT_FUNDS', 'Insufficient available balance');
    }

    const bid = appendMockBid(lot.id, user.id, round2(amount));

    const existing = wallet.reservations.find(
      (reservation) => reservation.lotId === lot.id,
    );
    if (existing) {
      existing.amount = round2(amount);
      existing.bidId = bid.id;
      existing.status = 'ACTIVE';
      existing.updatedAt = new Date().toISOString();
    } else {
      const createdAt = new Date().toISOString();
      wallet.reservations.push({
        id: nextMockId('res'),
        walletId: `wallet-${wallet.userId}`,
        lotId: lot.id,
        bidId: bid.id,
        amount: round2(amount),
        status: 'ACTIVE',
        createdAt,
        updatedAt: createdAt,
      });
    }

    publishMockBid(lot.id, bid.id);

    return HttpResponse.json(
      {
        success: true,
        message: 'Bid placed successfully',
        data: publicBid(serializeBid(bid)),
      },
      { status: 201 },
    );
  }),

  http.get(`${env.apiUrl}/auctions/:id`, async ({ params }) => {
    await wait();
    const lot = findLot(String(params.id));
    if (!lot) return notFound('Lot');
    return ok(serializeLot(lot, 'detail'));
  }),

  // -------------------------------------------------------------------------
  // User bids
  // -------------------------------------------------------------------------
  http.get(`${env.apiUrl}/bids`, async ({ request }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    const url = new URL(request.url);
    const lotId = url.searchParams.get('lotId');
    const bids = mockDb.bids
      .filter(
        (bid) => bid.bidderId === user.id && (!lotId || bid.lotId === lotId),
      )
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map((bid) => {
        const serialized = serializeBid(bid);
        const lot = findLot(bid.lotId);
        const seller = lot ? findUser(lot.sellerId) : undefined;
        return {
          ...serialized,
          lot: lot
            ? {
                id: lot.id,
                title: lot.title,
                status: lot.status,
                startingPrice: lot.startingPrice,
                minimumIncrement: lot.minimumIncrement,
                startsAt: lot.startsAt,
                endsAt: lot.endsAt,
                imageUrl: lot.imageUrl,
                seller: seller
                  ? { id: seller.id, name: seller.name }
                  : { id: lot.sellerId, name: 'Leiloeiro' },
              }
            : undefined,
        };
      });

    const paginated = paginate(
      bids,
      queryNumber(url, 'page', 1),
      queryNumber(url, 'limit', 50),
    );
    return HttpResponse.json({
      success: true,
      data: paginated.data,
      meta: paginated.meta,
    });
  }),

  // -------------------------------------------------------------------------
  // Wallet
  // -------------------------------------------------------------------------
  http.get(`${env.apiUrl}/wallets/transactions`, async ({ request }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    const wallet = walletFor(user.id);
    if (!wallet) return notFound('Wallet');
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const transactions = [...wallet.transactions]
      .filter((transaction) => !type || transaction.type === type)
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const paginated = paginate(
      transactions,
      queryNumber(url, 'page', 1),
      queryNumber(url, 'limit', 20),
    );
    return HttpResponse.json({
      success: true,
      data: paginated.data,
      meta: paginated.meta,
    });
  }),

  http.get(`${env.apiUrl}/wallets`, async ({ request }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    const wallet = walletFor(user.id);
    if (!wallet) return notFound('Wallet');
    return ok(serializeWallet(wallet));
  }),

  http.post(`${env.apiUrl}/wallets/deposit`, async ({ request }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    const wallet = walletFor(user.id);
    if (!wallet) return notFound('Wallet');
    const body = await readBody(request);
    const amount = Number(body.amount);
    const method = String(body.method ?? 'PIX');

    if (!Number.isFinite(amount) || amount <= 0) {
      return validation([
        { field: 'amount', message: 'Informe um valor de depósito positivo.', code: 'invalid' },
      ]);
    }
    if (!['PIX', 'BANK_TRANSFER'].includes(method)) {
      return validation([
        { field: 'method', message: 'Método de depósito inválido.', code: 'invalid' },
      ]);
    }

    const transaction: WalletTransaction = {
      id: nextMockId('tx'),
      walletId: `wallet-${wallet.userId}`,
      settlementId: null,
      type: 'DEPOSIT',
      amount: round2(amount),
      description: `Depósito simulado via ${method === 'PIX' ? 'PIX' : 'transferência'}`,
      createdAt: new Date().toISOString(),
      settlement: null,
    };
    wallet.transactions.unshift(transaction);
    wallet.balance = round2(wallet.balance + amount);

    return HttpResponse.json(
      {
        success: true,
        message: 'Deposit successful',
        data: {
          transaction,
          wallet: serializeWallet(wallet),
        },
      },
      { status: 201 },
    );
  }),

  // -------------------------------------------------------------------------
  // Settlements
  // -------------------------------------------------------------------------
  http.get(`${env.apiUrl}/settlements/public/:token`, async ({ params }) => {
    await wait();
    const settlement = mockDb.settlements.find(
      (item) => item.publicToken === String(params.token),
    );
    if (!settlement) return notFound('Settlement');
    return ok(serializeSettlement(settlement));
  }),

  http.get(`${env.apiUrl}/settlements`, async ({ request }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    const url = new URL(request.url);
    const status = url.searchParams.get('status') as SettlementStatus | null;
    const lotId = url.searchParams.get('lotId');
    const settlements = mockDb.settlements
      .filter(
        (settlement) =>
          (settlement.buyerId === user.id ||
            settlement.sellerId === user.id ||
            user.role === 'ADMIN') &&
          (!status || settlement.status === status) &&
          (!lotId || settlement.lotId === lotId),
      )
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map(serializeSettlement);

    const paginated = paginate(
      settlements,
      queryNumber(url, 'page', 1),
      queryNumber(url, 'limit', 50),
    );
    return HttpResponse.json({
      success: true,
      data: paginated.data,
      meta: paginated.meta,
    });
  }),

  http.post(`${env.apiUrl}/settlements/:id/process`, async ({ request, params }) => {
    await wait();
    const user = currentUser(request);
    if (!user) return unauthorized();
    const settlement = mockDb.settlements.find(
      (item) => item.id === String(params.id),
    );
    if (!settlement) return notFound('Settlement');
    if (
      user.role !== 'ADMIN' &&
      settlement.buyerId !== user.id &&
      settlement.sellerId !== user.id
    ) {
      return forbidden();
    }
    if (settlement.status !== 'PENDING') {
      return fail(400, 'SETTLEMENT_ERROR', 'Settlement is not pending');
    }
    settlement.status = 'PROCESSING';
    settlement.updatedAt = new Date().toISOString();
    return ok(serializeSettlement(settlement), 'Settlement processing started');
  }),
];

export type MockLot = Lot;
export type MockUserResponse = User;
