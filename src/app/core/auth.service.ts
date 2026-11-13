import { Injectable, computed, signal } from '@angular/core';
import { User, uid } from './models';
import { local } from './storage';

/** Demo staff account created on first run. Sample data only. */
export const DEMO_ACCOUNT = { email: 'ana.reyes@aha.example', password: 'pocket2027' };

async function hash(text: string): Promise<string> {
  const data = new TextEncoder().encode('pocket-lessons:' + text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sign-in for the pilot preview. Accounts are kept in this browser only.
 * Staff join by invitation in the real portal; here the invitation step is a fixed center code.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly users = signal<User[]>(local.get<User[]>('users', []));
  private readonly sessionUserId = signal<string | null>(local.get<string | null>('session', null));

  readonly user = computed(() => this.users().find((u) => u.id === this.sessionUserId()) ?? null);
  readonly signedIn = computed(() => this.user() !== null);

  /** Invitation codes per center (stand-in for real staff invitations). */
  readonly invitationCodes: Record<string, string> = {
    'TONDO-2027': 'Better World Tondo',
    'SUNRISE-2027': 'AHA Sunrise',
    'SMOKEY-2027': 'Better World Smokey Mountain',
    'TRIAS-2027': 'Better World General Trias',
  };

  async ensureDemoAccount(): Promise<void> {
    if (this.users().some((u) => u.email === DEMO_ACCOUNT.email)) return;
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

  async signIn(email: string, password: string): Promise<boolean> {
    await this.ensureDemoAccount();
    const found = this.users().find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found || found.passwordHash !== (await hash(password))) return false;
    this.setSession(found.id);
    return true;
  }

  async join(input: { name: string; email: string; password: string; code: string }): Promise<string | null> {
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
    this.setSession(null);
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
