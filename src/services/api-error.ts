import type { FieldError } from '@/types/api';

interface ApiErrorOptions {
  status: number;
  code: string;
  message: string;
  fields?: FieldError[];
  details?: Record<string, unknown>;
  retryAfterSeconds?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: FieldError[];
  readonly details?: Record<string, unknown>;
  readonly retryAfterSeconds?: number;

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.fields = options.fields ?? [];
    this.details = options.details;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isConflict() {
    return this.status === 409;
  }

  get isRateLimited() {
    return this.status === 429;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError({
      status: 0,
      code: 'REQUEST_ABORTED',
      message: 'A solicitação foi cancelada.',
    });
  }

  return new ApiError({
    status: 0,
    code: 'NETWORK_ERROR',
    message:
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
  });
}

export function apiErrorFromResponse(
  status: number,
  payload: unknown,
): ApiError {
  const body =
    typeof payload === 'object' && payload !== null
      ? (payload as {
          message?: unknown;
          error?: unknown;
          errors?: unknown;
          details?: unknown;
        })
      : {};

  const code =
    typeof body.error === 'string' && body.error
      ? body.error
      : status === 401
        ? 'AUTHENTICATION_ERROR'
        : status === 403
          ? 'AUTHORIZATION_ERROR'
          : status === 404
            ? 'NOT_FOUND'
            : status === 429
              ? 'RATE_LIMIT_EXCEEDED'
              : 'UNKNOWN_ERROR';

  const message =
    typeof body.message === 'string' && body.message
      ? body.message
      : 'Não foi possível concluir a operação.';

  const fields = Array.isArray(body.errors)
    ? (body.errors as FieldError[]).filter(
        (item) =>
          item &&
          typeof item.field === 'string' &&
          typeof item.message === 'string',
      )
    : [];

  const details =
    typeof body.details === 'object' && body.details !== null
      ? (body.details as Record<string, unknown>)
      : undefined;

  return new ApiError({ status, code, message, fields, details });
}
