import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminCenter, AdminFamily, AdminOverview, AdminStaff, AdminStudent, AuditEntry, ago, describeAudit } from '../../core/admin-models';
import { AdminService, adminError } from '../../core/admin.service';
import { AuthService } from '../../core/auth.service';
import { activityByDay, familyPhoneParts, levelsByCenter, staffParts } from '../../core/insights';
import { LEVELS } from '../../core/models';
import { CHART } from '../../shared/charts/chart-kit';
import { DonutChart } from '../../shared/charts/donut';
import { LineChart } from '../../shared/charts/line-chart';
import { StackedBars } from '../../shared/charts/stacked-bars';

interface Everything {
  overview: AdminOverview;
  centers: AdminCenter[];
  students: AdminStudent[];
  families: AdminFamily[];
  staff: AdminStaff[];
  audit: AuditEntry[];
}

/** A-02 Administrator overview: every center at a glance, what needs attention, recent activity. */
@Component({
  selector: 'pl-admin-overview',
  imports: [RouterLink, DatePipe, LineChart, DonutChart, StackedBars],
  template: `
    <div class="page-head">
      <div>
        <h1>Good day, {{ firstName() }}</h1>
        <p>Every AHA center in one place: teachers, classes, families and children.</p>
      </div>
    </div>

    @if (error()) { <p class="adm-msg" role="alert">{{ error() }}</p> }

    @if (all(); as a) {
      <div class="adm-stats">
        <a class="adm-stat" routerLink="/admin/centers"><strong>{{ a.overview.counts.centers }}</strong>Centers</a>
        <a class="adm-stat" routerLink="/admin/staff"><strong>{{ a.overview.counts.staff }}</strong>Active teachers and staff</a>
        <a class="adm-stat" routerLink="/admin/classes"><strong>{{ a.overview.counts.classes }}</strong>Classes</a>
        <a class="adm-stat" routerLink="/admin/families"><strong>{{ a.overview.counts.families }}</strong>Families</a>
        <a class="adm-stat" routerLink="/admin/students"><strong>{{ a.overview.counts.children }}</strong>Children learning</a>
      </div>

      @for (t of a.overview.waitingForClass ?? []; track t.id) {
        <div class="adm-callout">
          <span class="ic" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13M2 19h20M9 9h6M9 13h4" /></svg>
          </span>
          <p>
            <strong>{{ t.name }} ({{ t.center }}) asked for a class{{ t.lessonsWaiting ? ' · ' + t.lessonsWaiting + (t.lessonsWaiting === 1 ? ' lesson is' : ' lessons are') + ' waiting' : '' }}.</strong>
            Teachers can send lessons only to their own classes. Asked {{ t.requestedAt | date: 'd MMM, h:mm a' }}.
          </p>
          <a class="btn btn-primary btn-sm" routerLink="/admin/classes">Give a class</a>
        </div>
      }

      @if (a.overview.counts.parentAddedToReview) {
        <div class="adm-callout">
          <span class="ic" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M19 8v6M16 11h6" /></svg>
          </span>
          <p>
            <strong>{{ a.overview.counts.parentAddedToReview }} {{ a.overview.counts.parentAddedToReview === 1 ? 'child was' : 'children were' }} added by parents on their phones.</strong>
            They are approved automatically and can already learn. Have a look and put them in a class.
          </p>
          <a class="btn btn-primary btn-sm" routerLink="/admin/added-by-parents">See who was added</a>
        </div>
      }

      <div class="grid wide">
        <section class="card">
          <pl-line-chart
            title="Activity"
            caption="Changes recorded in the audit log each day, across every center."
            [points]="activity()"
            unit="changes"
            valueName="Changes"
            period="Day"
            empty="Nothing recorded in the last two weeks."
          />
        </section>
        <section class="card">
          <pl-donut
            title="Family phones"
            caption="Parents link their phone once with a 6-digit code."
            [parts]="phones()"
            unit="families"
            one="family"
            empty="No families yet. Add a family to print their activation code."
          />
        </section>
      </div>

      <div class="grid wide">
        <section class="card">
          <pl-stacked-bars
            title="Reading levels by center"
            caption="Children learning at each center, from Beginner to Story."
            [rows]="levelRows()"
            [partNames]="levelNames"
            [colors]="levelColors"
            rowName="Center"
            zeroText="No children yet"
          />
        </section>
        <section class="card">
          <pl-donut
            title="Teacher accounts"
            caption="Teachers join with an invitation code or a setup link."
            [parts]="accounts()"
            unit="accounts"
            one="account"
            empty="No teacher accounts yet."
          />
        </section>
      </div>

      <div class="grid half">
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
          @if (a.overview.recent.length) {
            <ul class="feed">
              @for (e of a.overview.recent; track e.id) {
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
    .grid { display: grid; gap: 18px; margin-bottom: 18px; align-items: stretch; }
    .grid.wide { grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr); }
    .grid.half { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    .adm-callout .ic { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none; background: var(--accent-tint); color: var(--accent); }
    .quick { display: flex; flex-wrap: wrap; gap: 10px; }
    .note { margin-top: 16px; }
    .feed { list-style: none; margin: 0 0 14px; padding: 0; display: grid; gap: 12px; }
    .feed li { display: grid; gap: 2px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
    .feed li:last-child { border-bottom: 0; }
    .what { font-weight: 700; }
    @media (max-width: 1180px) { .grid.wide, .grid.half { grid-template-columns: 1fr; } }
  `,
})
export class AdminOverviewPage {
  private readonly admin = inject(AdminService);
  private readonly auth = inject(AuthService);
  readonly all = signal<Everything | null>(null);
  readonly error = signal('');
  readonly describe = describeAudit;
  readonly ago = ago;
  readonly firstName = () => (this.auth.user()?.name ?? '').split(' ')[0];
  readonly levelNames = [...LEVELS];
  readonly levelColors = CHART.levels;

  readonly activity = computed(() => activityByDay(this.all()?.audit ?? [], 14));
  readonly phones = computed(() => familyPhoneParts(this.all()?.families ?? []));
  readonly accounts = computed(() => staffParts(this.all()?.staff ?? []));
  readonly levelRows = computed(() => levelsByCenter(this.all()?.centers ?? [], this.all()?.students ?? []));

  constructor() {
    Promise.all([this.admin.overview(), this.admin.centers(), this.admin.students(), this.admin.families(), this.admin.staff(), this.admin.audit(undefined, 500)]).then(
      ([overview, centers, students, families, staff, audit]) => this.all.set({ overview, centers, students, families, staff, audit }),
      (e) => this.error.set(adminError(e)),
    );
  }
}
