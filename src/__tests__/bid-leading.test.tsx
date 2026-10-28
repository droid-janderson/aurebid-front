import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { AppRoutes } from '@/router/AppRoutes';
import {
  authenticateAs,
  renderWithProviders,
} from '@/test/test-utils';
import { server } from '@/test/server';
import { sessionStore } from '@/services/session.store';
import { env } from '@/utils/env';

function serverHeaders() {
  return { 'X-Server-Time': new Date().toISOString() };
}

function acceptedReceipt(amount: number) {
  return {
    id: 'bid-accepted',
    amount,
    createdAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    extended: false,
    status: 'ACTIVE',
  };
}

describe('bloqueio de lance do líder', () => {
  it('mantém o líder bloqueado ao recarregar com sessão restaurada', async () => {
    sessionStore.setRefreshToken('mock.refresh.user-bidder-2');

    renderWithProviders(<AppRoutes />, '/lotes/batch-001');

    expect(
      (await screen.findAllByText('Você está liderando')).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Seu lance')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Confirmar lance/i }),
    ).not.toBeInTheDocument();
  });

  it('bloqueia o líder depois de entrar pelo lote anônimo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, '/lotes/batch-001');

    await user.click(
      await screen.findByRole('link', { name: /Entrar para dar lance/i }),
    );
    await screen.findByLabelText(/E-mail/i);
    await user.click(
      screen.getByRole('button', { name: /Licitante 2/i }),
    );
    await user.click(screen.getByRole('button', { name: /Entrar na casa/i }));

    expect(
      (await screen.findAllByText('Você está liderando')).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Seu lance')).not.toBeInTheDocument();
  });

  it('esconde o formulário imediatamente após um lance aceito', async () => {
    const user = userEvent.setup();
    authenticateAs('user-bidder');
    server.use(
      http.post(`${env.apiUrl}/auctions/:id/bids`, () =>
        HttpResponse.json(
          { success: true, data: acceptedReceipt(1600) },
          { headers: serverHeaders() },
        ),
      ),
    );

    renderWithProviders(<AppRoutes />, '/lotes/batch-001');

    await screen.findByLabelText('Seu lance');
    await user.click(screen.getByRole('button', { name: /Confirmar lance/i }));

    expect(await screen.findByText('Lance registrado')).toBeInTheDocument();
    expect(
      (await screen.findAllByText('Você está liderando')).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Seu lance')).not.toBeInTheDocument();
  });

  it('esconde o formulário quando o servidor responde ALREADY_LEADING', async () => {
    const user = userEvent.setup();
    authenticateAs('user-bidder');
    server.use(
      http.post(`${env.apiUrl}/auctions/:id/bids`, () =>
        HttpResponse.json(
          {
            success: false,
            error: 'ALREADY_LEADING',
            message: 'You are already leading this batch',
          },
          { status: 409, headers: serverHeaders() },
        ),
      ),
    );

    renderWithProviders(<AppRoutes />, '/lotes/batch-001');

    await screen.findByLabelText('Seu lance');
    await user.click(screen.getByRole('button', { name: /Confirmar lance/i }));

    expect(
      (await screen.findAllByText(/já está ganhando/i)).length,
    ).toBeGreaterThan(0);
    expect(
      (await screen.findAllByText('Você está liderando')).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Seu lance')).not.toBeInTheDocument();
  });
});
