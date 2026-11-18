import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiError, ApiSession, ApiUser, OFFLINE_MESSAGE, api, apiMode, onSessionEnded, tokens } from './api';
import { User, uid } from './models';
import { local, media } from './storage';

/** Sample staff account: created in the browser for the pilot preview, and by the API's seed script. */
export const DEMO_ACCOUNT = { email: 'ana.reyes@aha.example', password: 'pocket2027' };

async function hash(text: string): Promise<string> {
  const data = new TextEncoder().encode('pocket-lessons:' + text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function toUser(u: ApiUser | undefined): User | null {
  return u ? { id: u.id, name: u.name, email: u.email, center: u.center, centerId: u.centerId, role: u.role as User['role'] } : null;
}

/**
 * Staff sign-in.
 * - With the API (apiMode): accounts live on the Pocket Lessons server; staff join with their center's invitation code.
 * - Pilot preview: accounts are kept in this browser only, and the invitation step is a fixed center code.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly users = signal<User[]>(apiMode ? [] : local.get<User[]>('users', []));
  private readonly sessionUserId = signal<string | null>(apiMode ? null : local.get<string | null>('session', null));
  private readonly apiUser = signal<User | null>(apiMode ? toUser(tokens.get()?.user) : null);

  readonly user = computed(() => (apiMode ? this.apiUser() : (this.users().find((u) => u.id === this.sessionUserId()) ?? null)));
  readonly signedIn = computed(() => this.user() !== null);

  /** Invitation codes per center (pilot preview only; the API checks codes itself). */
  readonly invitationCodes: Record<string, string> = {
    'TONDO-2027': 'Better World Tondo',
    'SUNRISE-2027': 'AHA Sunrise',
    'SMOKEY-2027': 'Better World Smokey Mountain',
    'TRIAS-2027': 'Better World General Trias',
  };

  constructor() {
    if (apiMode) {
      onSessionEnded(() => {
        this.apiUser.set(null);
        void this.router.navigateByUrl('/sign-in');
      });
    }
  }

  async ensureDemoAccount(): Promise<void> {
    if (apiMode || this.users().some((u) => u.email === DEMO_ACCOUNT.email)) return;
    const demo: User = {
      id: 'usr_demo_ana',
      name: 'Ana Reyes',
      email: DEMO_ACCOUNT.email,
      passwordHash: await hash(DEMO_ACCOUNT.password),
      center: 'Better World Tondo',
      role: 'Teacher',
    };
    this.saveUsers([...this.users(), demo]);
  }

  /** Returns null when signed in, otherwise a message for the teacher. */
  async signIn(email: string, password: string): Promise<string | null> {
    if (apiMode) {
      return this.startApiSession(() => api.post<ApiSession>('/auth/login', { email: email.trim(), password }, false));
    }
    await this.ensureDemoAccount();
    const found = this.users().find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found || found.passwordHash !== (await hash(password))) return 'That email and password do not match an account in this browser.';
    this.setSession(found.id);
    return null;
  }

  /** Returns null when the account was made, otherwise a message for the teacher. */
  async join(input: { name: string; email: string; password: string; code: string }): Promise<string | null> {
    if (apiMode) {
      return this.startApiSession(() =>
        api.post<ApiSession>('/auth/join', { code: input.code.trim(), name: input.name.trim(), email: input.email.trim(), password: input.password }, false),
      );
    }
    const center = this.invitationCodes[input.code.trim().toUpperCase()];
    if (!center) return 'That invitation code is not valid. Ask your center coordinator for a new one.';
    if (this.users().some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
      return 'An account with this email already exists. Sign in instead.';
    }
    if (input.password.length < 8) return 'Use at least 8 characters for your password.';
    const user: User = {
      id: uid('usr'),
      name: input.name.trim(),
      email: input.email.trim(),
      passwordHash: await hash(input.password),
      center,
      role: 'Teacher',
    };
    this.saveUsers([...this.users(), user]);
    this.setSession(user.id);
    return null;
  }

  signOut(): void {
    if (apiMode) {
      const session = tokens.get();
      tokens.set(null);
      this.apiUser.set(null);
      // Recordings cached in this browser belong to the center; remove them on shared computers.
      media.clearCache().catch(() => undefined);
      if (session) api.post('/auth/logout', { refreshToken: session.refreshToken }, false).catch(() => undefined);
      return;
    }
    this.setSession(null);
  }

  private async startApiSession(call: () => Promise<ApiSession>): Promise<string | null> {
    try {
      const session = await call();
      tokens.set(session);
      this.apiUser.set(toUser(session.user));
      return null;
    } catch (err) {
      return err instanceof ApiError ? err.message : OFFLINE_MESSAGE;
    }
  }

  private setSession(id: string | null): void {
    this.sessionUserId.set(id);
    local.set('session', id);
  }

  private saveUsers(users: User[]): void {
    this.users.set(users);
    local.set('users', users);
  }
}
