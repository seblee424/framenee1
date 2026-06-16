import { env } from '@/config/env';

type Primitive = string | number | boolean;
type QueryValue = Primitive | null | undefined;
type QueryParams = Record<string, QueryValue>;

const TOKEN_KEY = 'framene.auth_token';

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
  if (!query) return '';

  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : '';
};

function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export class ApiClient {
  constructor(private readonly baseUrl: string) {}

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

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    // 自动附加 JWT token（如果已登录）
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...init,
      headers: {
        ...headers,
        ...(init.headers as Record<string, string> | undefined),
      },
    });

    // 后端直接返回 JSON body，没有 status/data 包装
    const payload = await response.json();

    if (!response.ok) {
      throw new ApiClientError(
        payload.error || `请求失败 (${response.status})`,
        'HTTP_ERROR',
        response.status,
      );
    }

    return payload as T;
  }
}

export const apiClient = new ApiClient(env.apiBaseUrl);
