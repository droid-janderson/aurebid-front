export interface ApiMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface FieldError {
  field: string;
  message: string;
  code: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  errors?: FieldError[];
  details?: Record<string, unknown>;
}

export interface Paginated<T> {
  data: T[];
  meta: ApiMeta;
}

export interface PageParams {
  page?: number;
  limit?: number;
}
