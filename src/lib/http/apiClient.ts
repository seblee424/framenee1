import { env } from '@/config/env';
import type { ApiErrorResponse, ApiResponse } from '@/types/api';

type Primitive = string | number | boolean;
type QueryValue = Primitive | null | undefined;
type QueryParams = Record<string, QueryValue>;

export class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = 'API_ERROR', status = 500) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

const toQueryString = (query?: QueryParams) => {
  if (!query) {
    return '';
  }

  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : '';
};

const isApiErrorResponse = <T>(payload: ApiResponse<T>): payload is ApiErrorResponse =>
  payload.status === 'error';

export class ApiClient {
  constructor(private readonly baseUrl: string, private readonly apiKey?: string) {}

  async get<T>(path: string, query?: QueryParams) {
    return this.request<T>(path, { method: 'GET' }, query);
  }

  async post<T>(path: string, body?: unknown, query?: QueryParams) {
    return this.request<T>(
      path,
      {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
      query,
    );
  }

  async put<T>(path: string, body?: unknown, query?: QueryParams) {
    return this.request<T>(
      path,
      {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      },
      query,
    );
  }

  async delete<T>(path: string, query?: QueryParams) {
    return this.request<T>(path, { method: 'DELETE' }, query);
  }

  private async request<T>(path: string, init: RequestInit, query?: QueryParams) {
    const url = `${this.baseUrl}${path}${toQueryString(query)}`;
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(this.apiKey
          ? {
              Authorization: `Bearer ${this.apiKey}`,
              apikey: this.apiKey,
            }
          : {}),
        ...init.headers,
      },
    });

    const payload = (await response.json()) as ApiResponse<T>;

    if (!response.ok) {
      if (isApiErrorResponse(payload)) {
        throw new ApiClientError(payload.error.message, payload.error.code, response.status);
      }

      throw new ApiClientError(`Request failed with status ${response.status}`, 'HTTP_ERROR', response.status);
    }

    if (isApiErrorResponse(payload)) {
      throw new ApiClientError(payload.error.message, payload.error.code, response.status);
    }

    return payload.data;
  }
}

export const apiClient = new ApiClient(env.apiBaseUrl, env.apiKey);
