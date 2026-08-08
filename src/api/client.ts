import { readStoredSession, getBackendUrl, clearStoredSession } from '../utils/storage';

export const apiDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** In-memory token cache to avoid reading SecureStore on every request. */
let cachedToken: string | null = null;

export function setCachedToken(token: string | null) {
  cachedToken = token;
}

const getAuthHeaders = async () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Use cached token first, fall back to reading from storage
  if (cachedToken) {
    headers.Authorization = `Bearer ${cachedToken}`;
  } else {
    const session = await readStoredSession();
    if (session?.token) {
      cachedToken = session.token;
      headers.Authorization = `Bearer ${session.token}`;
    }
  }

  return headers;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
};

/** Global session-expired callback. Set by UiStateContext to trigger logout. */
let onSessionExpired: (() => void) | null = null;

export function setOnSessionExpired(callback: (() => void) | null) {
  onSessionExpired = callback;
}

const DEFAULT_TIMEOUT_MS = 30000;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Check your network connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

function handleUnauthorized(response: Response) {
  if (response.status === 401) {
    cachedToken = null;
    clearStoredSession().catch(() => {});
    if (onSessionExpired) {
      onSessionExpired();
    }
    throw new Error('Your session expired. Sign in again.');
  }
}

export const baseClient = {
  get: async <T>(url: string): Promise<T> => {
    const baseUrl = await getBackendUrl();
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${baseUrl}${url}`, {
      method: 'GET',
      headers,
    });

    handleUnauthorized(response);

    if (!response.ok) {
      const errBody = await parseResponse<{ error?: string; message?: string }>(response);
      const msg = errBody?.error || errBody?.message || `GET request to ${url} failed (status ${response.status}).`;
      const error: any = new Error(msg);
      error.status = response.status;
      throw error;
    }

    return parseResponse<T>(response);
  },

  post: async <T>(url: string, data?: unknown): Promise<T> => {
    const baseUrl = await getBackendUrl();
    const headers = await getAuthHeaders();
    const response = await fetchWithTimeout(`${baseUrl}${url}`, {
      method: 'POST',
      headers,
      body: data === undefined ? undefined : JSON.stringify(data),
    });

    handleUnauthorized(response);

    if (!response.ok) {
      const errBody = await parseResponse<{ error?: string; message?: string }>(response);
      const msg = errBody?.error || errBody?.message || `POST request to ${url} failed (status ${response.status}).`;
      const error: any = new Error(msg);
      error.status = response.status;
      throw error;
    }

    return parseResponse<T>(response);
  },
};