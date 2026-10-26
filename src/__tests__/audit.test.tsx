import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen } from '@testing-library/react';
import { AppRoutes } from '@/router/AppRoutes';
import { renderWithProviders } from '@/test/test-utils';
import { server } from '@/test/server';
import { env } from '@/utils/env';

const verifyUrl = `${env.apiUrl}/auctions/:id/audit/verify`;

describe('auditoria pública', () => {
  it('declara a cadeia verificada quando o servidor confirma a integridade', async () => {
    renderWithProviders(<AppRoutes />, '/lotes/lot-001/auditoria');

    expect(
      await screen.findByText('Cadeia verificada pelo servidor'),
    ).toBeInTheDocument();
    expect(screen.getByText(/entradas verificadas/)).toBeInTheDocument();
    expect(screen.getByText('Registros do lote')).toBeInTheDocument();
    expect(
      screen.queryByText('Falha de integridade detectada'),
    ).not.toBeInTheDocument();
  });

  it('expõe a falha quando o servidor detecta quebra na cadeia', async () => {
    server.use(
      http.get(verifyUrl, () =>
        HttpResponse.json({
          success: true,
          data: {
            valid: false,
            entries: 3,
            brokenAtSequence: 2,
            reason: 'Hash anterior divergente',
            checkedAt: new Date().toISOString(),
          },
        }),
      ),
    );

    renderWithProviders(<AppRoutes />, '/lotes/lot-001/auditoria');

    expect(
      await screen.findByText('Falha de integridade detectada'),
    ).toBeInTheDocument();
    expect(screen.getByText(/quebra na sequência 2/)).toBeInTheDocument();
    expect(screen.getByText(/Hash anterior divergente/)).toBeInTheDocument();
    expect(
      screen.queryByText('Cadeia verificada pelo servidor'),
    ).not.toBeInTheDocument();
  });

  it('degrada para verificação indisponível sem atestar integridade', async () => {
    server.use(
      http.get(verifyUrl, () =>
        HttpResponse.json(
          {
            success: false,
            error: { code: 'FORBIDDEN', message: 'Admin only' },
          },
          { status: 403 },
        ),
      ),
    );

    renderWithProviders(<AppRoutes />, '/lotes/lot-001/auditoria');

    expect(
      await screen.findByText('Verificação pública indisponível'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sem atestado de integridade'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Cadeia verificada pelo servidor'),
    ).not.toBeInTheDocument();
  });
});
