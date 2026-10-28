import type { AuthSession, AuthTokens, User } from '@/types/domain';
import { request } from '@/services/http';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: 'BIDDER' | 'AUCTIONEER';
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  login(input: LoginInput) {
    return request<AuthSession>('/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    });
  },
  register(input: RegisterInput) {
    return request<AuthSession>('/auth/register', {
      method: 'POST',
      body: input,
      auth: false,
    });
  },
  me() {
    return request<User>('/auth/me');
  },
  refresh(refreshToken: string) {
    return request<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    });
  },
  async logout() {
    try {
      await request<undefined>('/auth/logout', { method: 'POST' });
    } catch {
      return;
    }
  },
  refreshRaw(refreshToken: string) {
    return request<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    });
  },
};
