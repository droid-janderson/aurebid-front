import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User, UserRole } from '@/types/domain';
import {
  authService,
  type LoginInput,
  type RegisterInput,
} from '@/services/auth.service';
import {
  SESSION_EXPIRED_EVENT,
  sessionStore,
} from '@/services/session.store';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const refreshToken = sessionStore.getRefreshToken();
      if (!refreshToken) {
        if (!cancelled) setStatus('anonymous');
        return;
      }

      try {
        const tokens = await authService.refresh(refreshToken);
        sessionStore.setTokens(tokens);
        const me = await authService.me();
        if (!cancelled) {
          setUser(me);
          setStatus('authenticated');
        }
      } catch {
        sessionStore.clear();
        if (!cancelled) {
          setUser(null);
          setStatus('anonymous');
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setStatus('anonymous');
      queryClient.clear();
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [queryClient]);

  const login = useCallback(async (input: LoginInput) => {
    const session = await authService.login(input);
    sessionStore.setTokens(session);
    setUser(session.user);
    setStatus('authenticated');
    return session.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const session = await authService.register(input);
    sessionStore.setTokens(session);
    setUser(session.user);
    setStatus('authenticated');
    return session.user;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    sessionStore.clear();
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    const me = await authService.me();
    setUser(me);
    return;
  }, []);

  const hasRole = useCallback(
    (...roles: UserRole[]) => Boolean(user && roles.includes(user.role)),
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated' && Boolean(user),
      login,
      register,
      logout,
      refreshUser,
      hasRole,
    }),
    [user, status, login, register, logout, refreshUser, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de AuthProvider.');
  }
  return context;
}
