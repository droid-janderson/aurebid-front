const REFRESH_KEY = 'aurebid.refreshToken';

let accessToken: string | null = null;

export const sessionStore = {
  getAccessToken(): string | null {
    return accessToken;
  },
  setAccessToken(token: string | null) {
    accessToken = token;
  },
  getRefreshToken(): string | null {
    try {
      return sessionStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  setRefreshToken(token: string | null) {
    try {
      if (token) sessionStorage.setItem(REFRESH_KEY, token);
      else sessionStorage.removeItem(REFRESH_KEY);
    } catch {
      // Storage can be unavailable in private browsing; the session then
      // lasts for the current page only, which is an acceptable fallback.
    }
  },
  setTokens(tokens: { accessToken: string; refreshToken: string } | null) {
    accessToken = tokens?.accessToken ?? null;
    this.setRefreshToken(tokens?.refreshToken ?? null);
  },
  clear() {
    accessToken = null;
    this.setRefreshToken(null);
  },
};

export const SESSION_EXPIRED_EVENT = 'aurebid:session-expired';

export function notifySessionExpired() {
  sessionStore.clear();
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
