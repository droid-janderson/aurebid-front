import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { env } from '@/utils/env';
import { AppRoutes } from '@/router/AppRoutes';
import { authenticateAs, renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/server';
import { realtimeTestClient } from '@/test/fake-realtime';

const api = env.apiUrl;

const meta = {
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

describe('tempo real na carteira', () => {
  it('atualiza saldo reservado e disponível quando a reserva é liberada', async () => {
    const wallet = {
      id: 'wallet-001',
      balance: 2000,
      reservedAmount: 1500,
      availableAmount: 500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reservations: [],
      recentTransactions: [],
    };

    server.use(
      http.get(`${api}/wallets`, () =>
        HttpResponse.json(
          { success: true, data: wallet },
          { headers: { 'X-Server-Time': new Date().toISOString() } },
        ),
      ),
      http.get(`${api}/wallets/transactions`, () =>
        HttpResponse.json(
          { success: true, data: [], meta },
          { headers: { 'X-Server-Time': new Date().toISOString() } },
        ),
      ),
    );

    authenticateAs('user-bidder');
    renderWithProviders(<AppRoutes />, '/carteira');

    expect(await screen.findByText(/R\$\s?500,00/)).toBeInTheDocument();

    await waitFor(() =>
      expect(realtimeTestClient.authToken).toBe('mock.access.user-bidder'),
    );

    wallet.reservedAmount = 0;
    wallet.availableAmount = 2000;

    realtimeTestClient.emit('wallet:changed', {
      reason: 'RESERVATION_RELEASED',
      batchId: 'batch-001',
      serverTime: new Date().toISOString(),
    });

    await waitFor(() =>
      expect(screen.queryByText(/R\$\s?500,00/)).not.toBeInTheDocument(),
    );
    expect((await screen.findAllByText(/2\.000,00/)).length).toBeGreaterThan(0);
  });

  it('atualiza a carteira quando um depósito é confirmado', async () => {
    const wallet = {
      id: 'wallet-001',
      balance: 2000,
      reservedAmount: 0,
      availableAmount: 2000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reservations: [],
      recentTransactions: [],
    };

    server.use(
      http.get(`${api}/wallets`, () =>
        HttpResponse.json(
          { success: true, data: wallet },
          { headers: { 'X-Server-Time': new Date().toISOString() } },
        ),
      ),
      http.get(`${api}/wallets/transactions`, () =>
        HttpResponse.json(
          { success: true, data: [], meta },
          { headers: { 'X-Server-Time': new Date().toISOString() } },
        ),
      ),
    );

    authenticateAs('user-bidder');
    renderWithProviders(<AppRoutes />, '/carteira');

    await waitFor(() =>
      expect(realtimeTestClient.authToken).toBe('mock.access.user-bidder'),
    );

    wallet.balance = 2750;
    wallet.availableAmount = 2750;

    realtimeTestClient.emit('wallet:changed', {
      reason: 'DEPOSIT',
      serverTime: new Date().toISOString(),
    });

    expect((await screen.findAllByText(/2\.750,00/)).length).toBeGreaterThan(0);
  });
});
