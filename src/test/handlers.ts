import { http, HttpResponse } from 'msw';
import { env } from '@/utils/env';
import type { ApiMeta } from '@/types/api';
import type { User } from '@/types/domain';
import {
  batchById,
  bidsFor,
  demoUsers,
  publicSettlement,
} from '@/test/fixtures';

const api = env.apiUrl;

const serverHeaders = {
  'X-Server-Time': new Date().toISOString(),
};

function ok<T>(data: T) {
  return HttpResponse.json(
    { success: true, data },
    { headers: serverHeaders },
  );
}

function fail(status: number, code: string, message: string) {
  return HttpResponse.json(
    { success: false, error: code, message },
    { status, headers: serverHeaders },
  );
}

function meta(total: number, page = 1, limit = 20): ApiMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

function userIdFrom(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice('Bearer '.length);
  const prefix = 'mock.access.';
  if (!token.startsWith(prefix)) return null;

  const id = token.slice(prefix.length);
  return id || null;
}

function userFrom(request: Request): User | null {
  const id = userIdFrom(request);
  if (!id) return null;

  return (
    demoUsers[id] ?? {
      id,
      name: 'Pessoa Teste',
      email: `${id}@aurebid.com`,
      role: id.includes('auctioneer') ? 'AUCTIONEER' : 'BIDDER',
    }
  );
}

function tokensFor(id: string) {
  return {
    accessToken: `mock.access.${id}`,
    refreshToken: `mock.refresh.${id}`,
  };
}

function refreshIdFrom(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const value = (body as { refreshToken?: unknown }).refreshToken;
  if (typeof value !== 'string') return null;
  const prefix = 'mock.refresh.';
  return value.startsWith(prefix) ? value.slice(prefix.length) : null;
}

export const handlers = [
  http.post(`${api}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (
      !body.email ||
      body.password === 'senha-errada' ||
      !body.password
    ) {
      return fail(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const isAuctioneer = body.email.startsWith('auctioneer');
    const isSecondBidder = body.email.startsWith('bidder2');
    const user: User = isAuctioneer
      ? demoUsers['user-auctioneer']
      : isSecondBidder
        ? demoUsers['user-bidder-2']
        : demoUsers['user-bidder'];

    return ok({
      user,
      ...tokensFor(user.id),
    });
  }),

  http.post(`${api}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; role?: string };

    const user: User = {
      id: body.role === 'AUCTIONEER' ? 'user-auctioneer' : 'user-bidder',
      name: 'Nova Conta',
      email: body.email ?? 'nova@aurebid.com',
      role: body.role === 'AUCTIONEER' ? 'AUCTIONEER' : 'BIDDER',
    };

    return ok({ user, ...tokensFor(user.id) });
  }),

  http.post(`${api}/auth/refresh`, async ({ request }) => {
    const id = refreshIdFrom(await request.json());
    if (!id) return fail(401, 'REFRESH_TOKEN_INVALID', 'Invalid refresh');
    return ok(tokensFor(id));
  }),

  http.get(`${api}/auth/me`, ({ request }) => {
    const user = userFrom(request);
    if (!user) return fail(401, 'AUTHENTICATION_ERROR', 'Authentication required');
    return ok(user);
  }),

  http.post(`${api}/auth/logout`, () =>
    HttpResponse.json(
      { success: true },
      { headers: serverHeaders },
    ),
  ),

  http.get(`${api}/catalog/batchs`, () =>
    HttpResponse.json(
      { success: true, data: [], meta: meta(0) },
      { headers: serverHeaders },
    ),
  ),

  http.get(`${api}/catalog/cards`, () =>
    HttpResponse.json({
      items: [
        {
          id: 'card-charizard',
          name: 'Charizard',
          setId: 'base1',
          setName: 'Base Set',
          number: '4',
          imageSmall: 'https://images.example.com/charizard-small.png',
          imageLarge: 'https://images.example.com/charizard-large.png',
          rarity: 'Rare Holo',
          supertype: 'Pokémon',
          subtypes: ['Stage 2'],
          types: ['Fire'],
        },
        {
          id: 'card-pikachu',
          name: 'Pikachu',
          setId: 'base1',
          setName: 'Base Set',
          number: '58',
          imageSmall: null,
          imageLarge: null,
          rarity: 'Common',
          supertype: 'Pokémon',
          subtypes: ['Basic'],
          types: ['Lightning'],
        },
      ],
      page: 1,
      pageSize: 8,
      totalCount: 2,
      totalPages: 1,
    }),
  ),

  http.get(`${api}/auctions/leading`, () =>
    HttpResponse.json(
      { success: true, data: [], meta: meta(0) },
      { headers: serverHeaders },
    ),
  ),

  http.get(`${api}/auctions/:id`, ({ params, request }) => {
    const batch = batchById(String(params.id));
    if (!batch) return fail(404, 'NOT_FOUND', 'Batch not found');

    const viewer = userIdFrom(request);
    return ok({
      ...batch,
      bids: bidsFor(batch.id, viewer),
    });
  }),

  http.get(`${api}/auctions/:id/bids`, ({ params, request }) => {
    const batchId = String(params.id);
    const viewer = userIdFrom(request);
    const bids = bidsFor(batchId, viewer);
    return HttpResponse.json(
      { success: true, data: bids, meta: meta(bids.length, 1, 30) },
      { headers: serverHeaders },
    );
  }),

  http.post(`${api}/auctions/:id/bids`, () =>
    fail(
      400,
      'INSUFFICIENT_FUNDS',
      'Insufficient available balance',
    ),
  ),

  http.get(`${api}/auctions/:id/audit`, ({ params }) => {
    const batchId = String(params.id);
    const entries = bidsFor(batchId, null).map((bid) => ({
      batchId,
      sequence: bid.audit?.sequence ?? 1,
      previousHash: bid.audit?.previousHash ?? null,
      currentHash: bid.audit?.currentHash ?? `hash-${bid.id}`,
      createdAt: bid.createdAt,
      bidId: bid.id,
      amount: bid.amount,
      bidder: { label: bid.bidder.label ?? 'Licitante' },
    }));

    return HttpResponse.json(
      {
        success: true,
        data: entries,
        meta: meta(entries.length, 1, 100),
      },
      { headers: serverHeaders },
    );
  }),

  http.get(`${api}/auctions/:id/audit/verify`, () =>
    ok({ valid: true, entries: 3 }),
  ),

  http.get(`${api}/bids`, ({ request }) => {
    const viewer = userIdFrom(request);
    const bids = viewer ? bidsFor('batch-001', viewer) : [];
    return HttpResponse.json(
      { success: true, data: bids, meta: meta(bids.length, 1, 50) },
      { headers: serverHeaders },
    );
  }),

  http.get(`${api}/wallets`, () =>
    ok({
      id: 'wallet-001',
      balance: 2000,
      reservedAmount: 1500,
      availableAmount: 500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reservations: [],
      recentTransactions: [],
    }),
  ),

  http.get(`${api}/settlements/public/:token`, ({ params }) => {
    if (params.token !== 'rec-demo-2026') {
      return fail(404, 'NOT_FOUND', 'Settlement not found');
    }
    return ok(publicSettlement);
  }),

  http.get(`${api}/settlements`, () =>
    HttpResponse.json(
      { success: true, data: [], meta: meta(0) },
      { headers: serverHeaders },
    ),
  ),
];
