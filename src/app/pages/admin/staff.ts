import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminCenter, AdminStaff, SetupLinkInfo, STAFF_ROLES, StaffPatch, StaffRoleKey, fmtDate } from '../../core/admin-models';
import { AdminService, adminError } from '../../core/admin.service';
import { Processing } from '../../core/processing';
import { CopyButton } from '../../shared/copy-button';
import { Qr } from '../../shared/qr';
import { FormDialog } from '../../shared/form-dialog';

/** A-05/A-06/W-01 Teachers and staff: add with a one-time setup link, change role, turn off or on. */
@Component({
  selector: 'pl-admin-staff',
  imports: [FormsModule, CopyButton, Qr, FormDialog],
  template: `
    <div class="page-head">
      <div>
        <h1>Teachers and staff</h1>
        <p>Add a teacher and send them a one-time setup link, or let them join with their center's invitation code.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="openAdd()">+ Add a teacher</button>
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

    @if (dialog(); as d) {
      <pl-form-dialog
        #fd
        [title]="d === 'add' ? 'Add a teacher' : 'Change ' + editName"
        [lead]="d === 'add' ? 'You get a one-time setup link to send them. They choose their own password.' : 'Their lessons and records stay with them.'"
        (closed)="dialog.set(null)"
      >
        <form (ngSubmit)="d === 'add' ? add($event) : saveEdit($event)" novalidate>
          <div class="dlg-grid">
            <label class="field"><span>Full name</span><input class="input" name="n" [(ngModel)]="form.name" maxlength="120" placeholder="e.g. Nora Lim" autocomplete="off" /></label>
            <label class="field"><span>Email</span><input class="input" type="email" name="e" [(ngModel)]="form.email" maxlength="200" placeholder="nora.lim@aha.example" autocomplete="off" /></label>
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
          @if (d === 'edit' && movingCenter()) { <p class="hint dlg-note">Moving to another center: their classes at {{ editCenter }} keep their children but will need a new teacher.</p> }
          @if (formError()) { <p class="dlg-error" role="alert">{{ formError() }}</p> }
          <div class="dlg-actions">
            <button type="button" class="btn btn-ghost" (click)="fd.close()">Cancel</button>
            <button class="btn btn-primary" type="submit" [disabled]="busy()">{{ d === 'add' ? 'Add and make a setup link' : 'Save changes' }}</button>
          </div>
        </form>
      </pl-form-dialog>
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
        <table class="table stack-xs">
          <thead><tr><th>Name</th><th class="hide-xs">Center</th><th>Role</th><th class="hide-xs">Classes</th><th class="hide-xs">Status</th><th></th></tr></thead>
          <tbody>
            @for (s of rows(); track s.id) {
              <tr [class.dim]="!s.active">
                <td><strong>{{ s.name }}</strong><span class="adm-sub">{{ s.email }}</span></td>
                <td class="small hide-xs">{{ s.center }}</td>
                <td data-label="Role">{{ s.role }}</td>
                <td class="small hide-xs">{{ s.classes.join(', ') || '—' }}</td>
                <td class="hide-xs">
                  @if (!s.active) { <span class="pill pill-grey">Turned off</span> }
                  @else if (s.setupPending) { <span class="pill pill-sun">Waiting for setup</span> }
                  @else { <span class="pill pill-teal">Active</span> }
                </td>
                <td>
                  <div class="adm-actions">
                    <button type="button" class="btn btn-ghost btn-sm" (click)="openEdit(s)" [disabled]="busy()">Change</button>
                    @if (s.active && s.setupPending) {
                      <button type="button" class="btn btn-ghost btn-sm" (click)="newLink(s, $event)" [disabled]="busy()">New setup link</button>
                    }
                    @if (s.active) {
                      <button type="button" class="btn btn-danger btn-sm" (click)="setActive(s, false, $event)" [disabled]="busy()">Turn off</button>
                    } @else {
                      <button type="button" class="btn btn-ghost btn-sm" (click)="setActive(s, true, $event)" [disabled]="busy()">Turn on</button>
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
    tr.dim td { opacity: .6; }
  `,
})
export class AdminStaffPage {
  private readonly admin = inject(AdminService);
  private readonly processing = inject(Processing);
  readonly roles = STAFF_ROLES;
  readonly fmt = fmtDate;
  readonly centers = signal<AdminCenter[]>([]);
  readonly staff = signal<AdminStaff[]>([]);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly dialog = signal<'add' | 'edit' | null>(null);
  readonly formError = signal('');
  editId = '';
  editName = '';
  editCenter = '';
  private editCenterId = '';
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
    if (params.get('add')) this.dialog.set('add');
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

  movingCenter(): boolean {
    return this.form.centerId !== this.editCenterId && !!this.staff().find((s) => s.id === this.editId)?.classes.length;
  }

  openAdd(): void {
    this.form = { name: '', email: '', centerId: this.center() || this.form.centerId || this.centers()[0]?.id || '', role: 'TEACHER' };
    this.link.set(null);
    this.formError.set('');
    this.dialog.set('add');
  }

  openEdit(s: AdminStaff): void {
    this.editId = s.id;
    this.editName = s.name;
    this.editCenter = s.center;
    this.editCenterId = s.centerId;
    this.form = { name: s.name, email: s.email, centerId: s.centerId, role: s.roleKey };
    this.formError.set('');
    this.dialog.set('edit');
  }

  async add(event?: Event): Promise<void> {
    this.formError.set('');
    const name = this.form.name.trim();
    const email = this.form.email.trim();
    if (!name || !email || !this.form.centerId) return this.formError.set('Fill in the name, email and center.');
    const center = this.centers().find((c) => c.id === this.form.centerId)?.name ?? '';
    this.busy.set(true);
    const r = await this.processing.run({
      title: `Adding ${name}`,
      detail: `${center} · making a one-time setup link`,
      from: event,
      errorText: adminError,
      run: async () => {
        const res = await this.admin.createStaff({ ...this.form, name, email });
        this.linkFor.set(res.staff.name);
        this.link.set(res.setupLink);
        this.staff.set(await this.admin.staff());
        this.dialog.set(null);
      },
      done: { title: `${name} added`, detail: 'The setup link is ready to share' },
    });
    this.busy.set(false);
    if (!r.ok) return this.formError.set(r.error);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async saveEdit(event?: Event): Promise<void> {
    this.formError.set('');
    const before = this.staff().find((s) => s.id === this.editId);
    if (!before) return this.formError.set('That staff member was not found.');
    const name = this.form.name.trim();
    const email = this.form.email.trim().toLowerCase();
    if (!name || !email || !this.form.centerId) return this.formError.set('Fill in the name, email and center.');
    const patch: StaffPatch = {};
    if (name !== before.name) patch.name = name;
    if (email !== before.email) patch.email = email;
    if (this.form.centerId !== before.centerId) patch.centerId = this.form.centerId;
    if (this.form.role !== before.roleKey) patch.role = this.form.role;
    if (!Object.keys(patch).length) return this.dialog.set(null);
    const center = this.centers().find((c) => c.id === this.form.centerId)?.name ?? '';
    this.busy.set(true);
    const r = await this.processing.run({
      title: `Saving ${name}'s details`,
      detail: `${STAFF_ROLES.find((x) => x.key === this.form.role)?.label ?? ''} · ${center}`,
      from: event,
      errorText: adminError,
      run: async () => {
        const updated = await this.admin.updateStaff(before.id, patch);
        this.staff.update((list) => list.map((x) => (x.id === before.id ? updated : x)));
        this.dialog.set(null);
      },
      done: { title: 'Details saved', detail: name },
    });
    this.busy.set(false);
    if (!r.ok) this.formError.set(r.error);
  }

  async newLink(s: AdminStaff, event?: Event): Promise<void> {
    if (!confirm(`Make a new setup link for ${s.name}? Any older link stops working.`)) return;
    this.busy.set(true);
    const r = await this.processing.run({
      title: 'Making a new setup link',
      detail: s.name,
      from: event,
      errorText: adminError,
      run: async () => {
        const res = await this.admin.newSetupLink(s.id);
        this.linkFor.set(s.name);
        this.link.set(res.setupLink);
      },
      done: { title: 'New setup link ready', detail: `For ${s.name} · older links stop working` },
    });
    this.busy.set(false);
    if (!r.ok) return this.error.set(r.error);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async setActive(s: AdminStaff, active: boolean, event?: Event): Promise<void> {
    if (!active && !confirm(`Turn off ${s.name}'s account? They are signed out everywhere and cannot sign in until you turn it back on. Their lessons and records are kept.`)) return;
    await this.patch(s, { active }, active ? `Turning on ${s.name}'s account` : `Turning off ${s.name}'s account`, active ? 'Account turned on' : 'Account turned off', event);
  }

  /** Small changes: the loader only shows if the server takes a moment. */
  private async patch(s: AdminStaff, patch: { active: boolean }, title: string, doneTitle: string, event?: Event): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    const r = await this.processing.run({
      title,
      detail: s.email,
      from: event,
      quick: true,
      errorText: adminError,
      run: async () => {
        const updated = await this.admin.updateStaff(s.id, patch);
        this.staff.update((list) => list.map((x) => (x.id === s.id ? updated : x)));
      },
      done: { title: doneTitle, detail: s.name },
    });
    this.busy.set(false);
    if (!r.ok) this.error.set(r.error);
  }
}
