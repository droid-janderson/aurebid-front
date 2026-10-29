import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { env } from '@/utils/env';
import { AppRoutes } from '@/router/AppRoutes';
import { authenticateAs, renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/server';
import { realtimeTestClient } from '@/test/fake-realtime';
import { activeBatch } from '@/test/fixtures';

const api = env.apiUrl;

function batchHandler(getPrice: () => { currentPrice: number; bidCount: number }) {
  return http.get(`${api}/auctions/:id`, ({ params }) =>
    HttpResponse.json({
      success: true,
      data: {
        ...activeBatch,
        id: String(params.id),
        ...getPrice(),
      },
    }),
  );
}

function newBidEvent(amount: number) {
  return {
    batchId: 'batch-001',
    bid: {
      id: `bid-${amount}`,
      amount,
      createdAt: new Date().toISOString(),
      bidder: { label: 'Licitante 8C1D' },
    },
    serverTime: new Date().toISOString(),
  } as const;
}

describe('tempo real na tela do lote', () => {
  it('atualiza o lance para um visitante anônimo', async () => {
    const state = { currentPrice: 1500, bidCount: 3 };
    server.use(batchHandler(() => state));

    renderWithProviders(<AppRoutes />, '/lotes/batch-001');

    expect((await screen.findAllByText(/1\.500,00/)).length).toBeGreaterThan(0);

    await waitFor(() =>
      expect(realtimeTestClient.watching('batch-001')).toBe(true),
    );
    expect(realtimeTestClient.authToken).toBeNull();

    state.currentPrice = 1900;
    state.bidCount = 4;
    realtimeTestClient.emit('bid:new', newBidEvent(1900));

    expect((await screen.findAllByText(/1\.900,00/)).length).toBeGreaterThan(0);
  });

  it('atualiza o lance para um licitante autenticado', async () => {
    const state = { currentPrice: 1500, bidCount: 3 };
    server.use(batchHandler(() => state));

    authenticateAs('user-bidder');
    renderWithProviders(<AppRoutes />, '/lotes/batch-001');

    expect((await screen.findAllByText(/1\.500,00/)).length).toBeGreaterThan(0);

    await waitFor(() =>
      expect(realtimeTestClient.authToken).toBe('mock.access.user-bidder'),
    );

    state.currentPrice = 2100;
    state.bidCount = 4;
    realtimeTestClient.emit('bid:new', newBidEvent(2100));

    expect((await screen.findAllByText(/2\.100,00/)).length).toBeGreaterThan(0);
  });

  it('sai da sala do lote ao desmontar a página', async () => {
    server.use(batchHandler(() => ({ currentPrice: 1500, bidCount: 3 })));

    const view = renderWithProviders(<AppRoutes />, '/lotes/batch-001');

    await waitFor(() =>
      expect(realtimeTestClient.watching('batch-001')).toBe(true),
    );

    view.unmount();

    await waitFor(() =>
      expect(realtimeTestClient.watching('batch-001')).toBe(false),
    );
  });
});
