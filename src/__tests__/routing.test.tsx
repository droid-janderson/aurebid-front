import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { AppRoutes } from '@/router/AppRoutes';
import {
  authenticateAs,
  renderWithProviders,
} from '@/test/test-utils';

describe('proteção de rotas', () => {
  it('redireciona visitante da carteira para o login', async () => {
    renderWithProviders(<AppRoutes />, '/carteira');

    expect(
      await screen.findByRole('heading', { name: 'Entrar' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Criar conta' }).length,
    ).toBeGreaterThan(0);
  });

  it('bloqueia o painel do leiloeiro para um licitante autenticado', async () => {
    authenticateAs('user-bidder');
    renderWithProviders(<AppRoutes />, '/painel');

    expect(
      await screen.findByRole('heading', {
        name: 'Esta área não é da sua conta',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Acesso restrito')).toBeInTheDocument();
  });

  it('exibe a página 404 para endereço desconhecido', async () => {
    renderWithProviders(<AppRoutes />, '/rota-inexistente');

    expect(
      await screen.findByText(/saiu do catálogo/i),
    ).toBeInTheDocument();
  });
});
