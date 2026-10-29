import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRoutes } from '@/router/AppRoutes';
import { authenticateAs, renderWithProviders } from '@/test/test-utils';

describe('prévia da carta no cadastro de lote', () => {
  it('abre a imagem ampliada e seleciona a carta pelo modal', async () => {
    const user = userEvent.setup();
    authenticateAs('user-auctioneer');
    renderWithProviders(<AppRoutes />, '/painel/lotes/novo');

    await user.click(
      await screen.findByRole('button', {
        name: /Ampliar imagem de Charizard/i,
      }),
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('Rare Holo').length).toBeGreaterThan(0);
    expect(screen.getByText('Fire')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Selecionar esta carta' }),
    );

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(await screen.findByText('Item selecionado')).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Título do lote' }),
    ).toHaveValue('Charizard · Base Set');
    expect(
      screen.getByRole('button', { name: 'Ampliar imagem' }),
    ).toBeInTheDocument();
  });

  it('mostra a prévia ao vivo da URL no modo manual', async () => {
    const user = userEvent.setup();
    authenticateAs('user-auctioneer');
    renderWithProviders(<AppRoutes />, '/painel/lotes/novo');

    await user.click(await screen.findByRole('button', { name: 'Manual' }));
    await user.type(
      screen.getByLabelText('URL da imagem'),
      'https://images.example.com/manual.png',
    );

    const preview = await screen.findByAltText('Prévia da imagem do lote', {}, {
      timeout: 3000,
    });

    expect(preview).toHaveAttribute(
      'src',
      'https://images.example.com/manual.png',
    );
  });
});
