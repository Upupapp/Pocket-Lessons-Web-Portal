import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminService } from '../core/admin.service';
import { apiMode } from '../core/api';
import { AuthService } from '../core/auth.service';
import { Logo } from '../shared/logo';

interface NavItem {
  link: string;
  label: string;
  icon: string;
  exact?: boolean;
  badge?: boolean;
}

const NAV: NavItem[] = [
  { link: '/admin', label: 'Overview', exact: true, icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { link: '/admin/centers', label: 'Centers', icon: 'M4 21V8l8-5 8 5v13M9 21v-6h6v6M3 21h18' },
  { link: '/admin/staff', label: 'Teachers and staff', icon: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M19 8v6M16 11h6' },
  { link: '/admin/classes', label: 'Classes', icon: 'M4 5h16v11H4zM8 20h8M12 16v4M8 9h8M8 12h5' },
  { link: '/admin/families', label: 'Parents and families', icon: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20a6 6 0 0 1 12 0M12 20a6 6 0 0 1 10 0' },
  { link: '/admin/students', label: 'Students', icon: 'M12 3l9 5-9 5-9-5zM7 10.5V15c0 1.7 2.2 3 5 3s5-1.3 5-3v-4.5' },
  { link: '/admin/added-by-parents', label: 'Added by parents', badge: true, icon: 'M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10zM12 8v6M9 11h6' },
  { link: '/admin/audit', label: 'Audit log', icon: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7' },
];

/** The administrator's workspace: one AHA-wide administrator, every center. */
@Component({
  selector: 'pl-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo],
  template: `
    <div class="layout" [class.open]="menuOpen()">
      <aside class="side">
        <a routerLink="/admin" class="brand" (click)="menuOpen.set(false)"><pl-logo [light]="true" /></a>
        <p class="area">Administrator</p>
        <nav aria-label="Administrator">
          @for (item of nav; track item.link) {
            <a class="item" [routerLink]="item.link" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: !!item.exact }" (click)="menuOpen.set(false)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="item.icon" /></svg>
              {{ item.label }}
              @if (item.badge && admin.toReview()) {
                <span class="badge" [attr.aria-label]="admin.toReview() + ' new'">{{ admin.toReview() }}</span>
              }
            </a>
          }
        </nav>
        <div class="me">
          <span class="avatar" aria-hidden="true">{{ initials() }}</span>
          <div>
            <strong>{{ auth.user()?.name }}</strong>
            <span>Administrator · {{ auth.user()?.center }}</span>
          </div>
        </div>
        <button type="button" class="out" (click)="signOut()">Sign out</button>
      </aside>

      <div class="main">
        <header class="top">
          <button type="button" class="burger" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
          <span class="scope">All centers</span>
          <span class="preview">
            <span class="dot"></span>
            {{ apiMode ? 'Saved on the server' : 'Pilot preview · saved in this browser · sample data' }}
          </span>
        </header>
        <main class="content"><router-outlet /></main>
      </div>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 270px minmax(0, 1fr); min-height: 100vh; }
    .side {
      position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: 6px; overflow-y: auto;
      background: linear-gradient(180deg, #163C3B, #10302F 60%, #0B2524); color: #D2E6DF; padding: 22px 16px;
    }
    .brand { text-decoration: none; padding: 4px 10px 8px; }
    .area { margin: 0 10px 14px; font-size: 11.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--sun); }
    nav { display: grid; gap: 3px; }
    .item {
      position: relative; display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 0 14px;
      border-radius: 12px; color: #D2E6DF; text-decoration: none; font-weight: 700; font-size: 14.5px;
    }
    .item:hover { background: rgba(255, 249, 237, .08); color: #FFF9ED; }
    .item.on { background: rgba(255, 249, 237, .12); color: #FFF9ED; }
    .item.on::before { content: ""; position: absolute; left: -16px; top: 11px; bottom: 11px; width: 4px; border-radius: 0 4px 4px 0; background: var(--sun); }
    .badge { margin-left: auto; min-width: 22px; height: 22px; padding: 0 7px; border-radius: 999px; background: var(--sun); color: #3d2e00; font-size: 12px; display: inline-grid; place-items: center; }
    .me { margin-top: auto; display: flex; gap: 10px; align-items: center; padding: 12px 10px; border-top: 1px solid rgba(210, 230, 223, .15); }
    .me div { display: grid; min-width: 0; }
    .me strong { color: #FFF9ED; }
    .me span:not(.avatar) { font-size: 12.5px; color: #9FC3B9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .avatar { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: var(--sun); color: #3d2e00; font-weight: 700; flex: none; }
    .out { background: none; border: 1px solid rgba(210, 230, 223, .25); color: #D2E6DF; border-radius: 999px; min-height: 38px; font: 700 13px var(--font); cursor: pointer; margin: 0 6px; }
    .out:hover { background: rgba(255, 249, 237, .08); }
    .main { min-width: 0; display: flex; flex-direction: column; }
    .top { display: flex; align-items: center; gap: 12px; padding: 14px clamp(16px, 4vw, 40px); }
    .burger { display: none; background: none; border: 0; color: var(--ink); cursor: pointer; padding: 6px; }
    .scope { font-size: 12.5px; font-weight: 700; color: var(--teal-dark); background: var(--mint); padding: 6px 12px; border-radius: 999px; }
    .preview { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--muted); background: var(--white); border: 1px solid var(--line); padding: 6px 12px; border-radius: 999px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--sun); }
    .content { padding: 8px clamp(16px, 4vw, 40px) 48px; max-width: 1320px; width: 100%; }
    @media (max-width: 960px) {
      .layout { grid-template-columns: 1fr; }
      .side { position: fixed; z-index: 50; width: 280px; left: 0; transform: translateX(-100%); transition: transform .2s; }
      .open .side { transform: none; box-shadow: 0 0 0 100vmax rgba(6, 35, 31, .45); }
      .burger { display: inline-flex; }
      .scope { display: none; }
    }
    @media print { .side, .top { display: none; } .layout { display: block; } .content { padding: 0; } }
  `,
})
export class AdminShell {
  readonly auth = inject(AuthService);
  readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  readonly nav = NAV;
  readonly apiMode = apiMode;
  readonly menuOpen = signal(false);
  readonly initials = computed(() =>
    (this.auth.user()?.name ?? '')
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join(''),
  );

  constructor() {
    void this.admin.refreshBadge();
  }

  signOut(): void {
    this.auth.signOut();
    void this.router.navigateByUrl('/sign-in');
  }
}
