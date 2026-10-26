import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppRoutes } from '@/router/AppRoutes';
import { renderWithProviders } from '@/test/test-utils';

describe('validação de formulários', () => {
  it('mostra erros acessíveis ao enviar o cadastro vazio', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, '/cadastro');

    const submit = await screen.findByRole('button', {
      name: 'Criar minha conta',
    });
    await user.click(submit);

    expect(
      await screen.findByText('Informe ao menos 2 caracteres.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Informe seu e-mail.')).toBeInTheDocument();
    expect(
      screen.getByText('A senha precisa ter ao menos 8 caracteres.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Confirme sua senha.')).toBeInTheDocument();
  });

  it('realiza login e redireciona para a vitrine', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, '/login');

    await user.type(
      await screen.findByLabelText(/E-mail/),
      'bidder@aurebid.com',
    );
    await user.type(screen.getByLabelText(/^Senha/), 'bidder123');
    await user.click(screen.getByRole('button', { name: 'Entrar na casa' }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /AureBid — página inicial/i })).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('heading', { name: 'Entrar' }),
    ).not.toBeInTheDocument();
  });

  it('informa credenciais inválidas sem criar sessão', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppRoutes />, '/login');

    await user.type(await screen.findByLabelText(/E-mail/), 'bidder@aurebid.com');
    await user.type(screen.getByLabelText(/^Senha/), 'senha-errada');
    await user.click(screen.getByRole('button', { name: 'Entrar na casa' }));

    expect(
      await screen.findByText(/Confira o e-mail e a senha informados/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });
});
