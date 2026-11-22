import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminCenter, AdminStaff, SetupLinkInfo, STAFF_ROLES, StaffRoleKey, fmtDate } from '../../core/admin-models';
import { AdminService, adminError } from '../../core/admin.service';
import { CopyButton } from '../../shared/copy-button';
import { Qr } from '../../shared/qr';

/** A-05/A-06/W-01 Teachers and staff: add with a one-time setup link, change role, turn off or on. */
@Component({
  selector: 'pl-admin-staff',
  imports: [FormsModule, CopyButton, Qr],
  template: `
    <div class="page-head">
      <div>
        <p class="eyebrow">Teachers and staff</p>
        <h1>Teachers and staff</h1>
        <p>Add a teacher and send them a one-time setup link, or let them join with their center's invitation code.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="toggleAdd()">{{ adding() ? 'Close' : '+ Add a teacher' }}</button>
    </div>

    @if (error()) { <p class="adm-msg" role="alert">{{ error() }}</p> }

    @if (link(); as l) {
      <section class="card adm-result adm-gap" aria-live="polite">
        <div class="result">
          <div class="text">
            <h2 class="adm-card-title">Send this setup link to {{ linkFor() }}</h2>
            <p class="small">They open it, choose their own password and start right away. It works once and is valid until <strong>{{ fmt(l.expiresAt) }}</strong>.</p>
            <p class="adm-link">{{ l.url }}</p>
            <div class="row-actions">
              <pl-copy [text]="l.url" label="Copy link" what="setup link" />
              <button type="button" class="btn btn-ghost btn-sm" (click)="link.set(null)">Done</button>
            </div>
            <p class="hint">No email is sent from here: share the link by text message or chat, or let them scan the QR code.</p>
          </div>
          <pl-qr [text]="l.url" [size]="164" label="QR code of the setup link" />
        </div>
      </section>
    }

    @if (adding()) {
      <form class="card adm-gap" (ngSubmit)="add()">
        <h2 class="adm-card-title">Add a teacher</h2>
        <div class="adm-form-grid">
          <label class="field"><span>Full name</span><input class="input" name="n" [(ngModel)]="form.name" maxlength="120" placeholder="e.g. Nora Lim" /></label>
          <label class="field"><span>Email</span><input class="input" type="email" name="e" [(ngModel)]="form.email" maxlength="200" placeholder="nora.lim@aha.example" /></label>
          <label class="field"><span>Center</span>
            <select class="select" name="c" [(ngModel)]="form.centerId">
              <option value="" disabled>Choose a center</option>
              @for (c of centers(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
            </select>
          </label>
          <label class="field"><span>Role</span>
            <select class="select" name="r" [(ngModel)]="form.role">
              @for (r of roles; track r.key) { <option [value]="r.key">{{ r.label }}</option> }
            </select>
          </label>
        </div>
        <div class="submit"><button class="btn btn-primary" type="submit" [disabled]="busy()">Add and make a setup link</button></div>
      </form>
    }

    <div class="card adm-table">
      <div class="adm-tools">
        <label class="field"><span>Center</span>
          <select class="select" [ngModel]="center()" (ngModelChange)="center.set($event)" name="fc">
            <option value="">All centers</option>
            @for (c of centers(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
          </select>
        </label>
        <label class="field"><span>Search</span><input class="input" type="search" [ngModel]="q()" (ngModelChange)="q.set($event)" name="q" placeholder="Name or email" /></label>
      </div>
      @if (rows().length) {
        <table class="table">
          <thead><tr><th>Name</th><th>Center</th><th>Role</th><th>Classes</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (s of rows(); track s.id) {
              <tr [class.dim]="!s.active">
                <td><strong>{{ s.name }}</strong><span class="adm-sub">{{ s.email }}</span></td>
                <td class="small">{{ s.center }}</td>
                <td>
                  <select class="select sm" [ngModel]="s.roleKey" (ngModelChange)="setRole(s, $event)" [name]="'role-' + s.id" [attr.aria-label]="'Role of ' + s.name" [disabled]="!s.active">
                    @for (r of roles; track r.key) { <option [value]="r.key">{{ r.label }}</option> }
                  </select>
                </td>
                <td class="small">{{ s.classes.join(', ') || '—' }}</td>
                <td>
                  @if (!s.active) { <span class="pill pill-grey">Turned off</span> }
                  @else if (s.setupPending) { <span class="pill pill-sun">Waiting for setup</span> }
                  @else { <span class="pill pill-teal">Active</span> }
                </td>
                <td>
                  <div class="adm-actions">
                    @if (s.active && s.setupPending) {
                      <button type="button" class="btn btn-ghost btn-sm" (click)="newLink(s)" [disabled]="busy()">New setup link</button>
                    }
                    @if (s.active) {
                      <button type="button" class="btn btn-danger btn-sm" (click)="setActive(s, false)" [disabled]="busy()">Turn off</button>
                    } @else {
                      <button type="button" class="btn btn-ghost btn-sm" (click)="setActive(s, true)" [disabled]="busy()">Turn on</button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <div class="empty">{{ loaded() ? 'No staff match.' : 'Loading…' }}</div>
      }
    </div>
  `,
  styles: `
    .result { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
    .text { flex: 1 1 360px; display: grid; gap: 10px; }
    .row-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .submit { margin-top: 14px; }
    .select.sm { min-height: 36px; padding: 6px 10px; font-size: 14px; width: auto; }
    tr.dim td { opacity: .6; }
  `,
})
export class AdminStaffPage {
  private readonly admin = inject(AdminService);
  readonly roles = STAFF_ROLES;
  readonly fmt = fmtDate;
  readonly centers = signal<AdminCenter[]>([]);
  readonly staff = signal<AdminStaff[]>([]);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly adding = signal(false);
  readonly link = signal<SetupLinkInfo | null>(null);
  readonly linkFor = signal('');
  readonly center = signal('');
  readonly q = signal('');
  form = { name: '', email: '', centerId: '', role: 'TEACHER' as StaffRoleKey };

  readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.staff().filter(
      (s) => (!this.center() || s.centerId === this.center()) && (!q || s.name.toLowerCase().includes(q) || s.email.includes(q)),
    );
  });

  constructor() {
    const params = inject(ActivatedRoute).snapshot.queryParamMap;
    if (params.get('add')) this.adding.set(true);
    if (params.get('center')) this.center.set(params.get('center')!);
    void this.load();
  }

  async load(): Promise<void> {
    try {
      const [centers, staff] = await Promise.all([this.admin.centers(), this.admin.staff()]);
      this.centers.set(centers);
      this.staff.set(staff);
      if (!this.form.centerId && centers.length) this.form.centerId = this.center() || centers[0].id;
    } catch (e) {
      this.error.set(adminError(e));
    } finally {
      this.loaded.set(true);
    }
  }

  toggleAdd(): void {
    this.adding.set(!this.adding());
    this.link.set(null);
  }

  async add(): Promise<void> {
    this.error.set('');
    if (!this.form.name.trim() || !this.form.email.trim() || !this.form.centerId) return this.error.set('Fill in the name, email and center.');
    this.busy.set(true);
    try {
      const res = await this.admin.createStaff({ ...this.form, name: this.form.name.trim(), email: this.form.email.trim() });
      this.linkFor.set(res.staff.name);
      this.link.set(res.setupLink);
      this.form = { name: '', email: '', centerId: this.form.centerId, role: 'TEACHER' };
      this.adding.set(false);
      this.staff.set(await this.admin.staff());
    } catch (e) {
      this.error.set(adminError(e));
    } finally {
      this.busy.set(false);
    }
  }

  async newLink(s: AdminStaff): Promise<void> {
    if (!confirm(`Make a new setup link for ${s.name}? Any older link stops working.`)) return;
    this.busy.set(true);
    try {
      const res = await this.admin.newSetupLink(s.id);
      this.linkFor.set(s.name);
      this.link.set(res.setupLink);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      this.error.set(adminError(e));
    } finally {
      this.busy.set(false);
    }
  }

  async setActive(s: AdminStaff, active: boolean): Promise<void> {
    if (!active && !confirm(`Turn off ${s.name}'s account? They are signed out everywhere and cannot sign in until you turn it back on. Their lessons and records are kept.`)) return;
    await this.patch(s, { active });
  }

  async setRole(s: AdminStaff, role: StaffRoleKey): Promise<void> {
    if (role !== s.roleKey) await this.patch(s, { role });
  }

  private async patch(s: AdminStaff, patch: { role?: StaffRoleKey; active?: boolean }): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      const updated = await this.admin.updateStaff(s.id, patch);
      this.staff.update((list) => list.map((x) => (x.id === s.id ? updated : x)));
    } catch (e) {
      this.error.set(adminError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
