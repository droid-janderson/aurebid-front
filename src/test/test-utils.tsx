import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { sessionStore } from '@/services/session.store';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

export function Providers({
  children,
  route = '/',
}: {
  children: ReactNode;
  route?: string;
}) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      <TooltipProvider>
        <ToastProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
          </AuthProvider>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export function renderWithProviders(ui: ReactNode, route = '/') {
  return render(
    <Providers route={route}>{ui}</Providers>,
  );
}

export function authenticateAs(userId: string) {
  sessionStore.setTokens({
    accessToken: `mock.access.${userId}`,
    refreshToken: `mock.refresh.${userId}`,
  });
}
