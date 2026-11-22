import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminOverview, ago, describeAudit } from '../../core/admin-models';
import { AdminService, adminError } from '../../core/admin.service';
import { AuthService } from '../../core/auth.service';

/** A-02 Administrator overview: every center at a glance, what needs attention, recent activity. */
@Component({
  selector: 'pl-admin-overview',
  imports: [RouterLink],
  template: `
    <div class="page-head">
      <div>
        <p class="eyebrow">Administrator</p>
        <h1>Good day, {{ firstName() }}</h1>
        <p>Every AHA center in one place: teachers, classes, families and children.</p>
      </div>
    </div>

    @if (error()) { <p class="adm-msg" role="alert">{{ error() }}</p> }

    @if (data(); as o) {
      <div class="adm-stats">
        <a class="adm-stat" routerLink="/admin/centers"><strong>{{ o.counts.centers }}</strong>Centers</a>
        <a class="adm-stat" routerLink="/admin/staff"><strong>{{ o.counts.staff }}</strong>Active teachers and staff</a>
        <a class="adm-stat" routerLink="/admin/classes"><strong>{{ o.counts.classes }}</strong>Classes</a>
        <a class="adm-stat" routerLink="/admin/families"><strong>{{ o.counts.families }}</strong>Families</a>
        <a class="adm-stat" routerLink="/admin/students"><strong>{{ o.counts.children }}</strong>Children learning</a>
      </div>

      @if (o.counts.parentAddedToReview) {
        <div class="adm-callout">
          <p>
            <strong>{{ o.counts.parentAddedToReview }} {{ o.counts.parentAddedToReview === 1 ? 'child was' : 'children were' }} added by parents on their phones.</strong>
            They are approved automatically and can already learn. Have a look and put them in a class.
          </p>
          <a class="btn btn-primary btn-sm" routerLink="/admin/added-by-parents">See who was added</a>
        </div>
      }

      <div class="grid">
        <section class="card">
          <h2 class="adm-card-title">Quick actions</h2>
          <div class="quick">
            <a class="btn btn-primary" routerLink="/admin/staff" [queryParams]="{ add: 1 }">+ Add a teacher</a>
            <a class="btn btn-primary" routerLink="/admin/families" [queryParams]="{ add: 1 }">+ Add a family</a>
            <a class="btn btn-ghost" routerLink="/admin/classes" [queryParams]="{ add: 1 }">+ New class</a>
            <a class="btn btn-ghost" routerLink="/admin/centers">Invitation codes</a>
          </div>
          <p class="small muted note">
            Teachers join with their center's invitation code, or with a one-time setup link you send them.
            Parents link their phone once with a 6-digit activation code and keep their own 3-digit PIN.
          </p>
        </section>

        <section class="card">
          <h2 class="adm-card-title">Recent activity</h2>
          @if (o.recent.length) {
            <ul class="feed">
              @for (e of o.recent; track e.id) {
                <li>
                  <span class="what">{{ describe(e) }}</span>
                  <span class="adm-sub">{{ e.user }}{{ e.center ? ' · ' + e.center : '' }} · {{ ago(e.at) }}</span>
                </li>
              }
            </ul>
            <a class="btn btn-ghost btn-sm" routerLink="/admin/audit">Open the audit log</a>
          } @else {
            <p class="muted small">Nothing yet. Changes you and the teachers make will show here.</p>
          }
        </section>
      </div>
    } @else if (!error()) {
      <p class="muted" role="status">Loading…</p>
    }
  `,
  styles: `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .quick { display: flex; flex-wrap: wrap; gap: 10px; }
    .note { margin-top: 16px; }
    .feed { list-style: none; margin: 0 0 14px; padding: 0; display: grid; gap: 12px; }
    .feed li { display: grid; gap: 2px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
    .feed li:last-child { border-bottom: 0; }
    .what { font-weight: 700; }
    @media (max-width: 960px) { .grid { grid-template-columns: 1fr; } }
  `,
})
export class AdminOverviewPage {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  readonly data = signal<AdminOverview | null>(null);
  readonly error = signal('');
  readonly describe = describeAudit;
  readonly ago = ago;
  readonly firstName = () => (this.auth.user()?.name ?? '').split(' ')[0];

  constructor() {
    this.admin.overview().then(
      (o) => this.data.set(o),
      (e) => this.error.set(adminError(e)),
    );
  }
}
