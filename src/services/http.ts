import { env } from '@/utils/env';
import { apiErrorFromResponse, ApiError } from '@/services/api-error';
import type { ApiMeta } from '@/types/api';
import {
  notifySessionExpired,
  sessionStore,
} from '@/services/session.store';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  auth?: boolean;
  headers?: Record<string, string>;
}

let refreshPromise: Promise<string | null> | null = null;

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function performRefresh(): Promise<string | null> {
  const refreshToken = sessionStore.getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${env.apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      notifySessionExpired();
      return null;
    }

    const payload = (await parseBody(response)) as {
      data?: { accessToken?: string; refreshToken?: string };
    } | null;

    const access = payload?.data?.accessToken;
    const refresh = payload?.data?.refreshToken;

    if (!access || !refresh) {
      notifySessionExpired();
      return null;
    }

    sessionStore.setTokens({ accessToken: access, refreshToken: refresh });
    return access;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function send<T>(path: string, options: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const token = sessionStore.getAccessToken();
  if (options.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${env.apiUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
      credentials: 'include',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message:
        'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    });
  }

  if (response.status === 401 && options.auth !== false) {
    const isAuthCall =
      path.startsWith('/auth/login') ||
      path.startsWith('/auth/register') ||
      path.startsWith('/auth/refresh');

    if (!isAuthCall) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return send<T>(path, options);
      }
    }
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    throw apiErrorFromResponse(response.status, payload);
  }

  return payload as T;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const payload = await send<{ success: boolean; data: T }>(path, options);
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    'success' in payload
  ) {
    return payload.data;
  }
  return payload as T;
}

export async function requestWithMeta<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T[]; meta: ApiMeta }> {
  return send<{ data: T[]; meta: ApiMeta }>(path, options);
}

export async function requestRaw<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  return send<T>(path, options);
}

export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}
