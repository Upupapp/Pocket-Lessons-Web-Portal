import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DEMO_ADMIN } from './admin-demo';
import { adminDemo, adminError } from './admin.service';
import { ApiError, ApiSession, ApiUser, OFFLINE_MESSAGE, api, apiMode, onSessionEnded, request, tokens } from './api';
import { User, uid } from './models';
import { local, media } from './storage';

/** Sample staff account: created in the browser for the pilot preview, and by the API's seed script. */
export const DEMO_ACCOUNT = { email: 'ana.reyes@aha.example', password: 'pocket2027' };

/** Sample AHA-wide administrator (pilot preview and the API's seed). */
export const DEMO_ADMIN_ACCOUNT = { email: DEMO_ADMIN.email, password: DEMO_ADMIN.password };

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
  /** The AHA-wide administrator works in /admin; everyone else in /app. */
  readonly isAdmin = computed(() => this.user()?.role === 'Admin');

  /** Where this person's work starts after signing in. */
  home(): '/admin' | '/app' {
    return this.isAdmin() ? '/admin' : '/app';
  }

  constructor() {
    if (apiMode) {
      onSessionEnded(() => {
        this.apiUser.set(null);
        // Bring the teacher back to the page they were on after they sign in again.
        // The address bar is used because the router may still be finishing its first navigation.
        const here = location.pathname + location.search;
        void this.router.navigate(['/sign-in'], here.startsWith('/app') || here.startsWith('/admin') ? { queryParams: { next: here } } : {});
      });
    }
  }

  async ensureDemoAccount(): Promise<void> {
    if (apiMode) return;
    const add: User[] = [];
    if (!this.users().some((u) => u.email === DEMO_ACCOUNT.email)) {
      add.push({
        id: 'usr_demo_ana',
        name: 'Ana Reyes',
        email: DEMO_ACCOUNT.email,
        passwordHash: await hash(DEMO_ACCOUNT.password),
        center: 'Better World Tondo',
        centerId: 'ctr_tondo',
        role: 'Teacher',
      });
    }
    if (!this.users().some((u) => u.email === DEMO_ADMIN.email)) {
      add.push({
        id: DEMO_ADMIN.id,
        name: DEMO_ADMIN.name,
        email: DEMO_ADMIN.email,
        passwordHash: await hash(DEMO_ADMIN.password),
        center: DEMO_ADMIN.center,
        role: 'Admin',
      });
    }
    if (add.length) this.saveUsers([...this.users(), ...add]);
  }

  /** Returns null when signed in, otherwise a message for the teacher. */
  async signIn(email: string, password: string): Promise<string | null> {
    if (apiMode) {
      return this.startApiSession(() => api.post<ApiSession>('/auth/login', { email: email.trim(), password }, false));
    }
    await this.ensureDemoAccount();
    const found = this.users().find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found || found.passwordHash !== (await hash(password))) return 'That email and password do not match an account in this browser.';
    if (found.role !== 'Admin' && !adminDemo().isActive(found.email)) return 'This account is turned off. Ask your administrator.';
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
    const found = adminDemo().centerForCode(input.code);
    if (!found) return 'That invitation code is not valid. Ask your center coordinator for a new one.';
    if (!found.invitationActive) return 'This invitation code is turned off. Ask your administrator for a setup link.';
    const center = found.name;
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
      centerId: found.id,
      role: 'Teacher',
    };
    this.saveUsers([...this.users(), user]);
    adminDemo().addJoinedStaff(user.name, user.email, found.id);
    this.setSession(user.id);
    return null;
  }

  /** Who an administrator's setup link is for. Throws a readable message when it is used or expired. */
  async setupInfo(token: string): Promise<{ name: string; email: string; center: string }> {
    try {
      if (apiMode) return await request<{ name: string; email: string; center: string }>('GET', `/auth/setup/${encodeURIComponent(token)}`, { auth: false });
      return adminDemo().setupInfo(token);
    } catch (err) {
      throw new Error(adminError(err));
    }
  }

  /** The new teacher chooses a password with the setup link and is signed in. Returns null or a message. */
  async completeSetup(token: string, password: string): Promise<string | null> {
    if (password.length < 8) return 'Use at least 8 characters for your password.';
    if (apiMode) return this.startApiSession(() => api.post<ApiSession>('/auth/setup', { token, password }, false));
    try {
      const info = adminDemo().completeSetup(token);
      const passwordHash = await hash(password);
      const existing = this.users().find((u) => u.email.toLowerCase() === info.email);
      const user: User = existing
        ? { ...existing, passwordHash }
        : { id: info.id, name: info.name, email: info.email, passwordHash, center: info.center, role: info.role as User['role'] };
      this.saveUsers([...this.users().filter((u) => u.id !== user.id), user]);
      this.setSession(user.id);
      return null;
    } catch (err) {
      return adminError(err);
    }
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
