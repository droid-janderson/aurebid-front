import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { AppRoutes } from '@/router/AppRoutes';
import { renderWithProviders } from '@/test/test-utils';

describe('recibo público', () => {
  it('mostra recibo concluído sem expor e-mails ou IDs internos', async () => {
    renderWithProviders(<AppRoutes />, '/recibo/rec-demo-2026');

    expect(
      await screen.findByText('REC-2026-0001'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('Liquidação concluída').length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('Venusaur · Base Set')).toBeInTheDocument();

    const receipt = within(screen.getByRole('main'));
    expect(receipt.queryByText(/@aurebid\.com/i)).not.toBeInTheDocument();
    expect(receipt.queryByText(/user-bidder/i)).not.toBeInTheDocument();
    expect(receipt.queryByText(/settlement-006/i)).not.toBeInTheDocument();
  });

  it('informa quando o token não existe', async () => {
    renderWithProviders(<AppRoutes />, '/recibo/token-inexistente');

    expect(
      await screen.findByRole('heading', { name: 'Recibo não encontrado' }),
    ).toBeInTheDocument();
  });
});
