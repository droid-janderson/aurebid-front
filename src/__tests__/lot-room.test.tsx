import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRoutes } from '@/router/AppRoutes';
import {
  authenticateAs,
  renderWithProviders,
} from '@/test/test-utils';

describe('sala do lote', () => {
  it('exibe o resultado e o recibo de um lote encerrado', async () => {
    renderWithProviders(<AppRoutes />, '/lotes/batch-005');

    expect(
      await screen.findByRole('heading', { name: 'Blastoise · Base Set' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Lance vencedor')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Abrir recibo público/i }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Seu lance')).not.toBeInTheDocument();
  });

  it('avisa que um lote agendado ainda não recebe lances', async () => {
    authenticateAs('user-bidder');
    renderWithProviders(<AppRoutes />, '/lotes/batch-003');

    expect(
      await screen.findByText('Lances abrem em breve'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Seu lance')).not.toBeInTheDocument();
  });

  it('impede novo lance de quem já lidera o lote', async () => {
    authenticateAs('user-bidder-2');
    renderWithProviders(<AppRoutes />, '/lotes/batch-001');

    expect(
      (await screen.findAllByText('Você está liderando')).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByLabelText('Seu lance')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Confirmar lance/i }),
    ).not.toBeInTheDocument();
  });

  it('exibe o erro do servidor quando o saldo é insuficiente', async () => {
    const user = userEvent.setup();
    authenticateAs('user-bidder');
    renderWithProviders(<AppRoutes />, '/lotes/batch-001');

    const input = await screen.findByLabelText('Seu lance');
    await user.clear(input);
    await user.type(input, '9999900');
    await user.click(screen.getByRole('button', { name: /Confirmar lance/i }));

    const messages = await screen.findAllByText(
      /Seu saldo disponível não é suficiente para este lance/i,
    );
    expect(messages.length).toBeGreaterThan(0);
    expect(screen.queryByText('Lance registrado')).not.toBeInTheDocument();
  });
});
