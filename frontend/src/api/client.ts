/**
 * Centralized API Client
 * Handles base URLs, standard headers, timeouts, and normalized error throwing.
 */

export interface ApiErrorResponse {
  status: 'error';
  statusCode: number;
  message: string;
  timestamp?: string;
}

export class ApiClientError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const DEFAULT_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  public async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public async post<T>(endpoint: string, body?: unknown, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${cleanEndpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s default timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorPayload: ApiErrorResponse | undefined;
        try {
          errorPayload = await response.json();
        } catch {
          // Non-JSON error body
        }
        throw new ApiClientError(
          errorPayload?.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorPayload
        );
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof ApiClientError) {
        throw err;
      }
      if ((err as Error)?.name === 'AbortError') {
        throw new ApiClientError('Request timed out. The Sentinel API took too long to respond.', 408);
      }
      throw new ApiClientError(
        (err as Error)?.message || 'Failed to communicate with Sentinel API. Check connection.',
        0
      );
    }
  }
}

export const apiClient = new ApiClient();
