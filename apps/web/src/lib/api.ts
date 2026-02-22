// apps/web/lib/api.ts

/**
 * Minimal, robust API client for M Practice Manager
 * - Directly targets the API on port 3001
 * - Handles access token, refresh, 204, JSON/text responses
 * - Exposes axios-like get/post/put/delete for convenience
 */

export const DEFAULT_API = 'http://localhost:3001/api/v1';
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_API).replace(/\/+$/, '');
export const AUTH_BYPASS_ENABLED = (process.env.NEXT_PUBLIC_DISABLE_AUTH ?? 'true') === 'true';

import type { Client, ClientContext, Service, Task } from './types';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    portfolios: Array<number | '*'>;
    isActive: boolean;
    emailVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AxiosLikeClient {
  get(url: string, config?: { params?: any; [key: string]: any }): Promise<any>;
  post(url: string, data?: any, config?: any): Promise<any>;
  put(url: string, data?: any, config?: any): Promise<any>;
  patch(url: string, data?: any, config?: any): Promise<any>;
  delete(url: string, config?: any): Promise<any>;
}

class ApiClient {
  private baseUrl: string = API_BASE_URL;
  private accessToken: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
    }
  }

  private buildUrl(endpoint: string): string {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${path}`;
  }

  private getBypassUser(): AuthResponse['user'] {
    return {
      id: 'local-dev-user',
      email: 'local-dev@example.com',
      firstName: 'Local',
      lastName: 'Dev',
      role: 'SUPER_ADMIN',
      portfolios: ['*'],
      isActive: true,
      emailVerified: true,
    };
  }

  private getBypassAuthResponse(): AuthResponse {
    return {
      user: this.getBypassUser(),
      accessToken: 'local-dev-bypass-access',
      refreshToken: 'local-dev-bypass-refresh',
      expiresIn: 24 * 60 * 60,
    };
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit & { suppressErrorLog?: boolean } = {},
    retry = true
  ): Promise<T> {
    if (AUTH_BYPASS_ENABLED && endpoint.startsWith('/auth/')) {
      if (endpoint === '/auth/logout') {
        return { message: 'Logged out successfully' } as T;
      }
      if (endpoint === '/auth/forgot-password' || endpoint === '/auth/reset-password') {
        return { message: 'Auth bypass enabled' } as T;
      }
      if (endpoint === '/auth/me') {
        return this.getBypassUser() as T;
      }
      return this.getBypassAuthResponse() as T;
    }

    const url = this.buildUrl(endpoint);
    const suppressErrorLog = (options as any).suppressErrorLog;
    
    // Remove suppressErrorLog from RequestInit before passing to fetch
    const fetchOptions = { ...options };
    delete (fetchOptions as any).suppressErrorLog;

    const token =
      this.accessToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string> | undefined),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config: RequestInit = { cache: 'no-store', ...fetchOptions, headers };

    try {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[API] ${config.method || 'GET'} ${url}`);
      }

      const response = await fetch(url, config);

      if (
        response.status === 401 &&
        retry &&
        endpoint !== '/auth/refresh' &&
        endpoint !== '/auth/login' &&
        endpoint !== '/auth/register'
      ) {
        try {
          await this.refreshToken();
          return this.request<T>(endpoint, options, false);
        } catch {
          this.clearSession();
          throw new Error('Unauthorized');
        }
      }

      if (!response.ok) {
        // Try to capture and expose the response body for better diagnostics.
        let bodyText = '';
        try {
          bodyText = await response.text();
        } catch (e) {
          // ignore
        }

        // Attempt to parse JSON body for structured error message
        let message = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errJson = bodyText ? JSON.parse(bodyText) : null;
          if (errJson && errJson.message) {
            message = Array.isArray(errJson.message) ? errJson.message.join(', ') : errJson.message;
          } else if (errJson && errJson.error) {
            message = typeof errJson.error === 'string' ? errJson.error : JSON.stringify(errJson.error);
          } else if (bodyText) {
            // fallback to raw body text
            message = bodyText;
          }
        } catch {
          if (bodyText) message = bodyText;
        }

        // Log full diagnostic info in non-production for easier debugging
        if (process.env.NODE_ENV !== 'production' && !suppressErrorLog) {
          console.error('[API ERROR RESPONSE]', endpoint, {
            method: config.method || 'GET',
            status: response.status,
            statusText: response.statusText,
            body: bodyText,
          });
        }

        throw new Error(message);
      }

      if (response.status === 204) return null as T;

      const ct = response.headers.get('content-type') || '';
      if (ct.includes('json')) {
        const txt = await response.text();
        return (txt.trim() ? JSON.parse(txt) : null) as T;
      }
      if (ct.startsWith('text/') || ct.includes('text/')) {
        return (await response.text()) as unknown as T;
      }
      return (await response.arrayBuffer()) as unknown as T;
    } catch (err: any) {
      // Distinguish between connection errors and HTTP errors
      // Connection errors occur when the server is not running or unreachable
      if (err instanceof TypeError && (
        err.message.includes('fetch') || 
        err.message.includes('Load failed') ||
        err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError') ||
        err.message.includes('Network request failed')
      )) {
        const connectionError = new Error(
          'Unable to connect to server. Please ensure the API server is running on port 3001.'
        );
        if (!suppressErrorLog) {
          console.error('[API CONNECTION ERROR]', endpoint, connectionError.message);
        }
        throw connectionError;
      }

      // If it's already an Error with a message, re-throw it
      if (err instanceof Error) {
        if (!suppressErrorLog) {
          console.error('[API ERROR]', endpoint, err.message);
        }
        throw err;
      }

      // Fallback for unknown error types
      if (!suppressErrorLog) {
        console.error('[API ERROR]', endpoint, err);
      }
      throw new Error('An unexpected error occurred. Please try again.');
    }
  }

  // ---- Token helpers ----
  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (typeof window === 'undefined') return;
    if (token) localStorage.setItem('accessToken', token);
    else localStorage.removeItem('accessToken');
  }

  private persistSession(res: AuthResponse) {
    this.setAccessToken(res.accessToken);
    if (typeof window === 'undefined') return;
    localStorage.setItem('refreshToken', res.refreshToken);
    localStorage.setItem('user', JSON.stringify(res.user));
  }

  private clearSession() {
    this.setAccessToken(null);
    if (typeof window === 'undefined') return;
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('demoMode');
    sessionStorage.removeItem('demoUser');
  }

  // ---- Auth endpoints ----
  async login(data: LoginRequest): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.persistSession(res);
    return res;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.persistSession(res);
    return res;
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<{ message: string }> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    if (!refreshToken) throw new Error('No refresh token available');

    const res = await this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    this.persistSession(res);
    return res;
  }

  async logout(): Promise<{ message: string }> {
    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } catch (e) {
      console.warn('Logout call failed:', e);
    }
    this.clearSession();
    return { message: 'Logged out successfully' };
  }

  async getProfile(): Promise<AuthResponse['user']> {
    return this.request('/auth/me');
  }

  async getDemoUser(): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/demo');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('demoMode', 'true');
      sessionStorage.setItem('demoUser', JSON.stringify(res.user));
    }
    return res;
  }

  // ---- Generic helpers ----
  async get<T = any>(endpoint: string, options?: any): Promise<T> {
    return this.request<T>(endpoint, options);
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ---- Example domain calls (typed) ----
  async getClients(params?: Record<string, any>): Promise<ClientContext[]> {
    const query = new URLSearchParams({
      ...(params || {}),
      includeContext: 'true',
    }).toString();
    return this.request<ClientContext[]>(`/clients${query ? `?${query}` : ''}`);
  }

  async getClient(id: string): Promise<Client> {
    return this.request<Client>(`/clients/${id}`);
  }

  async getServices(params?: Record<string, any>): Promise<Service[]> {
    const query = new URLSearchParams(params || {}).toString();
    return this.request<Service[]>(`/services${query ? `?${query}` : ''}`);
  }

  async getTasks(params?: Record<string, any>): Promise<Task[]> {
    const query = new URLSearchParams(params || {}).toString();
    return this.request<Task[]>(`/tasks${query ? `?${query}` : ''}`);
  }
}

// Single instance + axios-like facade for compatibility
const apiClientInstance = new ApiClient();

export const api = new Proxy(apiClientInstance, {
  get(target, prop) {
    if (prop === 'get') {
      return (url: string, config?: { params?: any; [key: string]: any }) => {
        const params = config?.params || {};
        const query = new URLSearchParams(params).toString();
        const separator = url.includes('?') ? '&' : '?';
        const endpoint = `${url}${query ? `${separator}${query}` : ''}`;
        const options = { ...(config || {}) };
        delete (options as any).params;
        return target.get(endpoint, options);
      };
    }
    const val = (target as any)[prop];
    return typeof val === 'function' ? val.bind(target) : val;
  },
}) as ApiClient & AxiosLikeClient;

export const apiClient = api; // alias
export default api;
