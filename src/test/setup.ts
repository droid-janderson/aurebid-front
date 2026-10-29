import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { sessionStore } from '@/services/session.store';
import { server } from '@/test/server';
import { realtimeTestClient } from '@/test/fake-realtime';

vi.mock('@/realtime', () => import('@/test/fake-realtime'));

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  sessionStorage.clear();
  sessionStore.clear();
  realtimeTestClient.reset();
});

afterAll(() => {
  server.close();
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => undefined,
});

class MockObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockObserver,
});

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockObserver,
});
