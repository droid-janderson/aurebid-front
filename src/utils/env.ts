const readBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined || value === '') return fallback;
  return value !== 'false' && value !== '0';
};

export const env = {
  apiUrl: (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(
    /\/$/,
    '',
  ),
  socketUrl:
    import.meta.env.VITE_SOCKET_URL ??
    (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(
      /\/api\/v1\/?$/,
      '',
    ),
  useMocks: readBoolean(import.meta.env.VITE_USE_MOCKS, true),
  mockLatencyMs: Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 220),
} as const;

export const isMockMode = env.useMocks;
