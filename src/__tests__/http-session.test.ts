import { beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { request } from '@/services/http';
import { sessionStore } from '@/services/session.store';
import { server } from '@/test/server';
import { env } from '@/utils/env';

function headers() {
  return { 'X-Server-Time': new Date().toISOString() };
}

function unauthorized() {
  return HttpResponse.json(
    {
      success: false,
      error: 'AUTHENTICATION_ERROR',
      message: 'Token expired',
    },
    { status: 401, headers: headers() },
  );
}

describe('renovação de sessão em rotas públicas', () => {
  beforeEach(() => {
    sessionStore.setTokens({
      accessToken: 'stale-token',
      refreshToken: 'mock.refresh.user-bidder',
    });
  });

  it('repete a requisição autenticada depois de renovar o token', async () => {
    server.use(
      http.get(`${env.apiUrl}/auctions/:id`, ({ request: req }) => {
        const authorization = req.headers.get('authorization');
        if (authorization !== 'Bearer mock.access.user-bidder') {
          return unauthorized();
        }
        return HttpResponse.json(
          { success: true, data: { id: 'batch-x' } },
          { headers: headers() },
        );
      }),
    );

    const data = await request<{ id: string }>('/auctions/batch-x');

    expect(data).toEqual({ id: 'batch-x' });
    expect(sessionStore.getAccessToken()).toBe('mock.access.user-bidder');
  });

  it('cai para anônimo quando a renovação falha', async () => {
    server.use(
      http.post(`${env.apiUrl}/auth/refresh`, () => unauthorized()),
      http.get(`${env.apiUrl}/auctions/:id`, ({ request: req }) => {
        if (req.headers.get('authorization')) {
          return unauthorized();
        }
        return HttpResponse.json(
          { success: true, data: { id: 'batch-x' } },
          { headers: headers() },
        );
      }),
    );

    const data = await request<{ id: string }>('/auctions/batch-x');

    expect(data).toEqual({ id: 'batch-x' });
    expect(sessionStore.getAccessToken()).toBeNull();
  });
});
