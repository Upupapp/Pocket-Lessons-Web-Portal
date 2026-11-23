import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminCenter, AuditEntry, describeAudit, fmtDateTime } from '../../core/admin-models';
import { AdminService, adminError } from '../../core/admin.service';

/** A-21 Audit log: who did what, when, and in which center. Records are named by ID only. */
@Component({
  selector: 'pl-admin-audit',
  imports: [FormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1>Audit log</h1>
        <p>Every change by the administrator and the teachers. Records are named by their ID only, never by children's names.</p>
      </div>
    </div>

    @if (error()) { <p class="adm-msg" role="alert">{{ error() }}</p> }

    <div class="card adm-table">
      <div class="adm-tools">
        <label class="field"><span>Center</span>
          <select class="select" [ngModel]="center()" (ngModelChange)="center.set($event); load()" name="fc">
            <option value="">All centers</option>
            @for (c of centers(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
          </select>
        </label>
      </div>
      @if (rows().length) {
        <table class="table stack-xs">
          <thead><tr><th>When</th><th>Who</th><th>What</th><th class="hide-xs">Center</th><th class="hide-xs">Record</th></tr></thead>
          <tbody>
            @for (e of rows(); track e.id) {
              <tr>
                <td class="small nowrap">{{ when(e.at) }}</td>
                <td><strong>{{ e.user }}</strong></td>
                <td>{{ describe(e) }}</td>
                <td class="small hide-xs">{{ e.center || '—' }}</td>
                <td class="adm-mono hide-xs">{{ e.entity }} · {{ e.entityId }}</td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <div class="empty">{{ loaded() ? 'Nothing recorded yet.' : 'Loading…' }}</div>
      }
    </div>
  `,
  styles: `.nowrap { white-space: nowrap; }`,
})
export class AdminAuditPage {
  private readonly admin = inject(AdminService);
  readonly describe = describeAudit;
  readonly when = fmtDateTime;
  readonly centers = signal<AdminCenter[]>([]);
  readonly rows = signal<AuditEntry[]>([]);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly center = signal('');

  constructor() {
    this.admin.centers().then(
      (c) => this.centers.set(c),
      () => undefined,
    );
    void this.load();
  }

  async load(): Promise<void> {
    try {
      this.rows.set(await this.admin.audit(this.center() || undefined, 200));
    } catch (e) {
      this.error.set(adminError(e));
    } finally {
      this.loaded.set(true);
    }
  }
}
