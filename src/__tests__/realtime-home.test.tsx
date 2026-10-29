import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { env } from '@/utils/env';
import { AppRoutes } from '@/router/AppRoutes';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/server';
import { realtimeTestClient } from '@/test/fake-realtime';
import { activeBatch } from '@/test/fixtures';
import type { Batch } from '@/types/domain';

const api = env.apiUrl;

const batchA: Batch = {
  ...activeBatch,
  id: 'batch-a',
  title: 'Charizard · Base Set',
  currentPrice: 1000,
  bidCount: 1,
  bids: [],
};

const batchB: Batch = {
  ...activeBatch,
  id: 'batch-b',
  title: 'Pikachu · Base Set',
  currentPrice: 2000,
  bidCount: 9,
  bids: [],
};

const meta = {
  total: 2,
  page: 1,
  limit: 12,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

describe('tempo real na home', () => {
  it('atualiza o card do lote afetado e ignora os demais', async () => {
    let calls = 0;
    const state: Record<string, number> = { 'batch-a': 1000, 'batch-b': 2000 };

    server.use(
      http.get(`${api}/catalog/batchs`, () => {
        calls += 1;
        return HttpResponse.json({
          success: true,
          data: [
            { ...batchA, currentPrice: state['batch-a'] },
            { ...batchB, currentPrice: state['batch-b'] },
          ],
          meta,
        });
      }),
    );

    renderWithProviders(<AppRoutes />, '/');

    expect((await screen.findAllByText(/1\.000,00/)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/2\.000,00/)).length).toBeGreaterThan(0);

    await waitFor(() =>
      expect(realtimeTestClient.watching('batch-a')).toBe(true),
    );
    expect(realtimeTestClient.watching('batch-b')).toBe(true);

    state['batch-a'] = 9999;
    realtimeTestClient.emit('bid:new', {
      batchId: 'batch-a',
      bid: {
        id: 'bid-a-new',
        amount: 9999,
        createdAt: new Date().toISOString(),
        bidder: { label: 'Licitante 8C1D' },
      },
      serverTime: new Date().toISOString(),
    });

    expect((await screen.findAllByText(/9\.999,00/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\.000,00/).length).toBeGreaterThan(0);

    calls = 0;
    realtimeTestClient.emit('bid:new', {
      batchId: 'batch-fora-da-lista',
      bid: {
        id: 'bid-x',
        amount: 500,
        createdAt: new Date().toISOString(),
        bidder: { label: 'Licitante 1A1A' },
      },
      serverTime: new Date().toISOString(),
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toBe(0);
  });

  it('invalida o card quando o lote é prorrogado', async () => {
    let calls = 0;

    server.use(
      http.get(`${api}/catalog/batchs`, () => {
        calls += 1;
        return HttpResponse.json({
          success: true,
          data: [batchA],
          meta: { ...meta, total: 1 },
        });
      }),
    );

    renderWithProviders(<AppRoutes />, '/');

    await waitFor(() =>
      expect(realtimeTestClient.watching('batch-a')).toBe(true),
    );

    calls = 0;
    realtimeTestClient.emit('auction:extended', {
      batchId: 'batch-a',
      endsAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      extendedBy: 120000,
      serverTime: new Date().toISOString(),
    });

    await waitFor(() => expect(calls).toBeGreaterThan(0));
  });
});
