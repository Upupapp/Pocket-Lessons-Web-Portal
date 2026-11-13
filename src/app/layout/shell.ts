import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DataService } from '../core/data.service';
import { Logo } from '../shared/logo';

interface NavItem {
  link: string;
  label: string;
  icon: string;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { link: '/app', label: 'Dashboard', exact: true, icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z' },
  { link: '/app/lessons', label: 'Lessons', icon: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11' },
  { link: '/app/learners', label: 'Learners', icon: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-4-5.6' },
  { link: '/app/assess', label: 'Check reading', icon: 'M4 5h16v11H8l-4 4zM8 10h8M8 13h5' },
];

@Component({
  selector: 'pl-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Logo],
  template: `
    <div class="layout" [class.open]="menuOpen()">
      <aside class="side">
        <a routerLink="/app" class="brand" (click)="menuOpen.set(false)"><pl-logo [light]="true" /></a>
        <nav aria-label="Main">
          @for (item of nav; track item.link) {
            <a class="item" [routerLink]="item.link" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: !!item.exact }" (click)="menuOpen.set(false)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="item.icon" /></svg>
              {{ item.label }}
              @if (item.link === '/app/assess' && data.needsCheck().length) {
                <span class="badge" [attr.aria-label]="data.needsCheck().length + ' learners need a check'">{{ data.needsCheck().length }}</span>
              }
            </a>
          }
        </nav>
        <a class="new btn btn-sun" routerLink="/app/lessons/new" (click)="menuOpen.set(false)">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
          New lesson
        </a>
        <div class="me">
          <span class="avatar" aria-hidden="true">{{ initials() }}</span>
          <div>
            <strong>{{ auth.user()?.name }}</strong>
            <span>{{ auth.user()?.role }} · {{ auth.user()?.center }}</span>
          </div>
        </div>
        <button type="button" class="out" (click)="signOut()">Sign out</button>
      </aside>

      <div class="main">
        <header class="top">
          <button type="button" class="burger" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-label="Menu">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
          <span class="preview"><span class="dot"></span>Pilot preview · saved in this browser · sample data</span>
        </header>
        <main class="content"><router-outlet /></main>
      </div>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); min-height: 100vh; }
    .side {
      position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: 6px;
      background: linear-gradient(180deg, #0F4A44, #0B3B37 60%, #082F2B); color: #D2E6DF; padding: 22px 16px;
    }
    .brand { text-decoration: none; padding: 4px 10px 22px; }
    nav { display: grid; gap: 4px; }
    .item {
      position: relative; display: flex; align-items: center; gap: 12px; min-height: 46px; padding: 0 14px;
      border-radius: 12px; color: #D2E6DF; text-decoration: none; font-weight: 700;
    }
    .item:hover { background: rgba(255, 249, 237, .08); color: #FFF9ED; }
    .item.on { background: rgba(255, 249, 237, .12); color: #FFF9ED; }
    .item.on::before { content: ""; position: absolute; left: -16px; top: 12px; bottom: 12px; width: 4px; border-radius: 0 4px 4px 0; background: var(--sun); }
    .badge { margin-left: auto; min-width: 22px; height: 22px; padding: 0 7px; border-radius: 999px; background: var(--sun); color: #3d2e00; font-size: 12px; display: inline-grid; place-items: center; }
    .new { margin: 18px 6px 0; }
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
    .preview { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--muted); background: var(--white); border: 1px solid var(--line); padding: 6px 12px; border-radius: 999px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--sun); }
    .content { padding: 8px clamp(16px, 4vw, 40px) 48px; max-width: 1280px; width: 100%; }
    @media (max-width: 960px) {
      .layout { grid-template-columns: 1fr; }
      .side { position: fixed; z-index: 50; width: 270px; left: 0; transform: translateX(-100%); transition: transform .2s; }
      .open .side { transform: none; box-shadow: 0 0 0 100vmax rgba(6, 35, 31, .45); }
      .burger { display: inline-flex; }
    }
  `,
})
export class Shell {
  readonly auth = inject(AuthService);
  readonly data = inject(DataService);
  private readonly router = inject(Router);
  readonly nav = NAV;
  readonly menuOpen = signal(false);
  readonly initials = computed(() =>
    (this.auth.user()?.name ?? '')
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join(''),
  );

  signOut(): void {
    this.auth.signOut();
    void this.router.navigateByUrl('/sign-in');
  }
}
