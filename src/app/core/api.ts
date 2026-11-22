/**
 * The Pocket Lessons API client. Adds the sign-in token, renews it once when it expires,
 * and turns server errors into messages that can be shown to teachers as they are.
 */
import { environment } from '../../environments/environment';

export const API_URL = environment.apiUrl.replace(/\/$/, '');

/** True when the portal saves to the Pocket Lessons API; false for the browser-only pilot preview. */
export const apiMode = API_URL !== '';

export const OFFLINE_MESSAGE = 'Could not reach the Pocket Lessons server. Check your connection and try again.';

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: string;
  center: string;
  centerId: string;
}

export interface ApiSession {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
  }
}

const AUTH_KEY = 'pl.v1.auth';

/** The current session, kept in this browser so a reload stays signed in. */
export const tokens = {
  get(): ApiSession | null {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? (JSON.parse(raw) as ApiSession) : null;
    } catch {
      return null;
    }
  },
  set(session: ApiSession | null): void {
    try {
      if (session) localStorage.setItem(AUTH_KEY, JSON.stringify(session));
      else localStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
  },
};

let sessionEnded: () => void = () => undefined;

/** Called when the server no longer accepts this browser's session. */
export function onSessionEnded(fn: () => void): void {
  sessionEnded = fn;
}

let refreshing: Promise<boolean> | null = null;

/** Renews the access token once, even when several requests fail at the same time. */
function refresh(failedToken: string): Promise<boolean> {
  const current = tokens.get();
  if (!current) return Promise.resolve(false);
  // Another tab already renewed it.
  if (current.accessToken !== failedToken) return Promise.resolve(true);
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      });
      if (!res.ok) return false;
      tokens.set((await res.json()) as ApiSession);
      return true;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

interface RequestOptions {
  body?: unknown;
  raw?: Blob;
  /** false for sign-in and joining, which do not send a token. */
  auth?: boolean;
}

export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const useAuth = opts.auth !== false;
  const send = (token?: string) => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    let body: BodyInit | undefined;
    if (opts.raw) {
      headers['Content-Type'] = opts.raw.type || 'application/octet-stream';
      body = opts.raw;
    } else if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
    return fetch(`${API_URL}${path}`, { method, headers, body });
  };

  let res: Response;
  try {
    const token = useAuth ? tokens.get()?.accessToken : undefined;
    res = await send(token);
    if (res.status === 401 && useAuth && token && (await refresh(token))) {
      res = await send(tokens.get()?.accessToken);
    }
  } catch {
    throw new ApiError(0, OFFLINE_MESSAGE);
  }

  if (res.status === 401 && useAuth) {
    tokens.set(null);
    sessionEnded();
    throw new ApiError(401, 'Your session has ended. Sign in again.');
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: unknown };
    const message = typeof data.message === 'string' ? data.message : 'Something went wrong on the server. Try again.';
    throw new ApiError(res.status, message, data);
  }
  if (res.status === 204) return undefined as T;
  const type = res.headers.get('Content-Type') ?? '';
  return (type.includes('application/json') ? await res.json() : await res.blob()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, { body }),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, { body }),
  post: <T>(path: string, body: unknown, auth = true) => request<T>('POST', path, { body, auth }),
  delete: (path: string) => request<void>('DELETE', path),
  upload: (path: string, blob: Blob) => request<unknown>('PUT', path, { raw: blob }),
  download: (path: string) => request<Blob>('GET', path),
};
