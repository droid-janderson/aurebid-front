import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { env } from '@/utils/env';
import { AppRoutes } from '@/router/AppRoutes';
import { authenticateAs, renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/server';
import { activeBatch, publicSettlement } from '@/test/fixtures';
import type { Settlement } from '@/types/domain';
import { formatCountdown, type CountdownParts } from '@/utils/datetime';
import { maskMoneyInput } from '@/utils/money';

const api = env.apiUrl;

const meta = {
  total: 1,
  page: 1,
  limit: 50,
  totalPages: 1,
  hasNext: false,
  hasPrev: false,
};

const completedSettlement: Settlement = {
  ...publicSettlement,
  id: 'settlement-completed',
  batchId: 'batch-completed',
  buyerId: 'user-bidder',
  sellerId: 'user-auctioneer',
  amount: 1500,
  receiptNumber: 'REC-COMP-1',
  status: 'COMPLETED',
  failureReason: null,
  batch: {
    id: 'batch-completed',
    title: 'Mewtwo · Base Set',
    status: 'SETTLED',
    imageUrl: null,
    endsAt: activeBatch.endsAt,
  },
  buyer: { name: 'Ana Licitante' },
  seller: { name: 'Carla Leiloeira' },
  publicToken: 'rec-demo-2026',
};

const failedSettlement: Settlement = {
  ...completedSettlement,
  id: 'settlement-failed',
  batchId: 'batch-failed',
  receiptNumber: 'REC-FAIL-1',
  status: 'FAILED',
  completedAt: null,
  failureReason: 'Saldo insuficiente',
  batch: {
    id: 'batch-failed',
    title: 'Gengar · Base Set',
    status: 'ENDED',
    imageUrl: null,
    endsAt: activeBatch.endsAt,
  },
  publicToken: undefined,
};

function settlementsResponse(items: Settlement[]) {
  return HttpResponse.json({
    success: true,
    data: items,
    meta: { ...meta, total: items.length },
  });
}

function leadingResponse(items = [activeBatch]) {
  return HttpResponse.json({
    success: true,
    data: items,
    meta: { ...meta, total: items.length },
  });
}

function parts(overrides: Partial<CountdownParts>): CountdownParts {
  return {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalMs: 1000,
    expired: false,
    ...overrides,
  };
}

describe('máscara monetária', () => {
  it('interpreta dígitos como centavos e separa milhares', () => {
    expect(maskMoneyInput('450000')).toBe('4.500,00');
    expect(maskMoneyInput('R$ 1.234.567,89')).toBe('1.234.567,89');
    expect(maskMoneyInput('')).toBe('');
  });
});

describe('cronômetro', () => {
  it('omite dias e horas zerados quando restam minutos', () => {
    expect(formatCountdown(parts({ minutes: 10, seconds: 0 }))).toBe('10:00');
    expect(
      formatCountdown(parts({ minutes: 5, seconds: 9, totalMs: 309_000 })),
    ).toBe('05:09');
  });

  it('mantém horas e dias quando existem', () => {
    expect(formatCountdown(parts({ hours: 2, minutes: 3, seconds: 4 }))).toBe(
      '02:03:04',
    );
    expect(
      formatCountdown(parts({ days: 1, hours: 2, minutes: 3, seconds: 4 })),
    ).toBe('1d 02h 03m');
  });
});

describe('navegação do leiloeiro', () => {
  it('mantém apenas o link da rota atual como ativo', async () => {
    authenticateAs('user-auctioneer');
    renderWithProviders(<AppRoutes />, '/painel/resultados');

    expect(
      await screen.findByRole('heading', { name: /Arremates liquidados/i }),
    ).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Resultados' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByRole('link', { name: 'Painel do leiloeiro' }),
    ).not.toHaveAttribute('aria-current');
  });
});

describe('meus arremates', () => {
  it('abre na liderança e lista os lotes em que o licitante está vencendo', async () => {
    authenticateAs('user-bidder');
    server.use(
      http.get(`${api}/auctions/leading`, () => leadingResponse()),
    );

    renderWithProviders(<AppRoutes />, '/arremates');

    const leadingTab = await screen.findByRole('button', {
      name: /Na liderança/i,
    });
    expect(leadingTab).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('Charizard · Base Set')).toBeInTheDocument();
    expect(screen.getByText('Liderando')).toBeInTheDocument();
  });

  it('alterna para a aba de arremates concluídos', async () => {
    const user = userEvent.setup();
    authenticateAs('user-bidder');
    server.use(
      http.get(`${api}/auctions/leading`, () => leadingResponse()),
      http.get(`${api}/settlements`, () =>
        settlementsResponse([completedSettlement]),
      ),
    );

    renderWithProviders(<AppRoutes />, '/arremates');

    await user.click(
      await screen.findByRole('button', { name: /Arremates/i }),
    );

    expect(await screen.findByText('Mewtwo · Base Set')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Recibo/i })).toBeInTheDocument();
  });

  it('filtra a aba ativa pela busca e permite limpar', async () => {
    const user = userEvent.setup();
    authenticateAs('user-bidder');
    server.use(
      http.get(`${api}/auctions/leading`, () => leadingResponse()),
    );

    renderWithProviders(<AppRoutes />, '/arremates');

    expect(await screen.findByText('Charizard · Base Set')).toBeInTheDocument();

    await user.type(
      screen.getByRole('searchbox', {
        name: /Buscar nos lotes em que estou liderando/i,
      }),
      'pikachu',
    );

    expect(
      await screen.findByText('Nenhum resultado na busca'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpar busca' }));

    expect(await screen.findByText('Charizard · Base Set')).toBeInTheDocument();
  });
});

describe('resultados do leiloeiro', () => {
  it('alterna entre concluídos e falhas e filtra por busca', async () => {
    const user = userEvent.setup();
    authenticateAs('user-auctioneer');
    server.use(
      http.get(`${api}/settlements`, () =>
        settlementsResponse([completedSettlement, failedSettlement]),
      ),
    );

    renderWithProviders(<AppRoutes />, '/painel/resultados');

    expect(await screen.findByText('Mewtwo · Base Set')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Concluídos/i }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /Falhas/i }));

    expect(await screen.findByText('Gengar · Base Set')).toBeInTheDocument();
    expect(
      screen.getByText(/Motivo: Saldo insuficiente/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Falhas exigem atuação do administrador/i),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole('searchbox', {
        name: /Buscar nas liquidações com falha/i,
      }),
      'mewtwo',
    );

    expect(
      await screen.findByText('Nenhum resultado na busca'),
    ).toBeInTheDocument();
  });
});
