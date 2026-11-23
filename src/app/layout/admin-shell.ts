import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AdminService } from '../core/admin.service';
import { apiMode } from '../core/api';
import { AuthService } from '../core/auth.service';
import { Processing } from '../core/processing';
import { Logo } from '../shared/logo';
import { WaveBg } from '../shared/wave-bg';

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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo, WaveBg],
  template: `
    <div class="layout ws" [class.open]="menuOpen()">
      <aside class="side">
        <a routerLink="/admin" class="brand" (click)="menuOpen.set(false)"><pl-logo /></a>
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
        <button type="button" class="out" (click)="signOut($event)">Sign out</button>
      </aside>

      <div class="main">
        <!-- A soft green essence behind the content: still, in the corners, never behind the cards' text. -->
        <pl-wave-bg class="waves" [fixed]="true" />
        <header class="top">
          <button type="button" class="burger" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
          <span class="where">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-5h6v5M9 11h.01M15 11h.01" /></svg>
            All centers
          </span>
          <span class="status" [class.local]="!apiMode">
            <span class="dot"></span>
            <span class="status-text">{{ apiMode ? 'Saved on the server' : 'Pilot preview · saved in this browser · sample data' }}</span>
          </span>
        </header>
        <main class="content"><router-outlet /></main>
        <footer class="foot">
          <span>Pocket Lessons · Administrator</span>
          <span>AHA Learning Center × UpUp Technologies</span>
        </footer>
      </div>
    </div>
  `,
  styles: `
    /* The white sidebar column runs the full height of long pages. */
    .layout {
      display: grid; grid-template-columns: 264px minmax(0, 1fr); min-height: 100vh;
      background: linear-gradient(90deg, var(--surface) 263px, var(--line) 263px 264px, var(--ground) 264px);
    }
    .side {
      position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: 2px; overflow-y: auto;
      background: var(--surface); border-right: 1px solid var(--line); padding: 18px 14px 14px;
    }
    .brand { text-decoration: none; padding: 2px 8px 10px; }
    .area {
      align-self: flex-start; margin: 0 8px 16px; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700;
      letter-spacing: .06em; text-transform: uppercase; color: var(--title); background: var(--accent-tint); border: 1px solid var(--accent-tint-2);
    }
    nav { display: grid; gap: 2px; }
    .item {
      display: flex; align-items: center; gap: 12px; min-height: 42px; padding: 0 12px;
      border-radius: 10px; color: var(--ink-2); text-decoration: none; font-weight: 700; font-size: 14.5px;
      transition: background .15s, color .15s;
    }
    .item svg { color: var(--icon); flex: none; }
    .item:hover { background: var(--surface-2); color: var(--ink); }
    .item.on { background: var(--accent-tint); color: var(--title); }
    .item.on svg { color: var(--accent); }
    .badge { margin-left: auto; min-width: 22px; height: 22px; padding: 0 7px; border-radius: 999px; background: var(--accent); color: #fff; font-size: 12px; display: inline-grid; place-items: center; }
    .me { margin-top: auto; display: flex; gap: 10px; align-items: center; padding: 14px 8px 12px; border-top: 1px solid var(--line); }
    .me div { display: grid; min-width: 0; }
    .me strong { color: var(--ink); font-size: 14px; }
    .me span:not(.avatar) { font-size: 12.5px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--accent-tint); border: 1px solid var(--accent-tint-2); color: var(--title); font-weight: 700; font-size: 13px; flex: none; }
    .out { background: var(--surface); border: 1px solid var(--line-strong); color: var(--ink-2); border-radius: 10px; min-height: 36px; font: 700 13px var(--font); cursor: pointer; margin: 0 4px; transition: border-color .15s, color .15s; }
    .out:hover { border-color: var(--accent); color: var(--accent); }
    .main { min-width: 0; display: flex; flex-direction: column; background: var(--ground); }
    /* The waves fill the content area beside the sidebar and under the header; the page sits above them. */
    .waves { --wave-left: 264px; --wave-top: 60px; }
    .content, .foot, .sync { position: relative; z-index: 1; }
    .top {
      position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 12px; min-height: 60px;
      padding: 0 clamp(16px, 4vw, 40px); background: var(--surface); border-bottom: 1px solid var(--line);
    }
    .burger { display: none; background: none; border: 0; color: var(--ink); cursor: pointer; padding: 6px; border-radius: 8px; }
    .where { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; color: var(--ink); }
    .where svg { color: var(--icon); flex: none; }
    .status { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--muted); border: 1px solid var(--line); padding: 5px 12px; border-radius: 999px; white-space: nowrap; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #2e9e6b; box-shadow: 0 0 0 3px rgba(46, 158, 107, .15); }
    .local .dot { background: #8a958f; box-shadow: none; }
    .content { flex: 1; padding: 28px clamp(16px, 4vw, 40px) 48px; max-width: 1320px; width: 100%; }
    .foot {
      display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 16px; padding: 14px clamp(16px, 4vw, 40px);
      background: var(--surface); border-top: 1px solid var(--line); font-size: 12.5px; color: var(--muted);
    }
    @media (max-width: 960px) {
      .waves { --wave-left: 0px; }
      .layout { grid-template-columns: 1fr; background: var(--ground); }
      .side { position: fixed; z-index: 50; width: 280px; left: 0; transform: translateX(-100%); transition: transform .2s; }
      .open .side { transform: none; box-shadow: 0 0 0 100vmax rgba(20, 27, 24, .32); }
      .burger { display: inline-flex; }
    }
    @media (max-width: 560px) {
      .status { padding: 7px; }
      .status-text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    }
    @media print { .side, .top, .foot { display: none; } .layout { display: block; } .content { padding: 0; } .main { background: none; } }
  `,
})
export class AdminShell {
  readonly auth = inject(AuthService);
  readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  private readonly processing = inject(Processing);
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

  async signOut(event: Event): Promise<void> {
    await this.processing.run({
      title: 'Signing you out',
      detail: this.auth.user()?.name,
      from: event,
      run: () => {
        this.auth.signOut();
        return this.router.navigateByUrl('/sign-in');
      },
      done: { title: 'Signed out', detail: 'See you next time. Tuloy ang aral!' },
    });
  }
}
