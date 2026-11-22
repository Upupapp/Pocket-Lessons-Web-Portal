import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ActivationCodeInfo, AdminCenter, AdminClass, AdminFamily, AVATARS, avatarEmoji, fmtDate } from '../../core/admin-models';
import { AdminService, adminError } from '../../core/admin.service';
import { CopyButton } from '../../shared/copy-button';

interface ChildRow {
  name: string;
  grade: number;
  classId: string | null;
  avatar: string | null;
}

/** A-10/A-11/A-12 Parents and families: add a parent with children, print the activation code, new code, reset PIN. */
@Component({
  selector: 'pl-admin-families',
  imports: [FormsModule, CopyButton],
  template: `
    <div class="page-head no-print">
      <div>
        <p class="eyebrow">Parents and families</p>
        <h1>Parents and families</h1>
        <p>One account per family. The parent links the phone once with a 6-digit code, then keeps their own 3-digit PIN.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="toggleAdd()">{{ adding() ? 'Close' : '+ Add a family' }}</button>
    </div>

    @if (error()) { <p class="adm-msg no-print" role="alert">{{ error() }}</p> }

    @if (code(); as c) {
      <section class="card adm-result adm-gap code-card" aria-live="polite">
        <p class="eyebrow">Activation code for the {{ codeFamily() }} family</p>
        <p class="adm-code">{{ c.code.slice(0, 3) }} {{ c.code.slice(3) }}</p>
        <p class="small">The parent opens Pocket Lessons, chooses <strong>Parent and child</strong> and types this code once. It works one time and is valid until <strong>{{ fmt(c.expiresAt) }}</strong>.</p>
        <p class="adm-print-only small">AHA Learning Center × UpUp Technologies · Pocket Lessons · Keep this paper safe until the phone is linked.</p>
        <div class="row-actions no-print">
          <button type="button" class="btn btn-primary btn-sm" (click)="print()">Print for the parent</button>
          <pl-copy [text]="c.code" label="Copy code" what="activation code" />
          <button type="button" class="btn btn-ghost btn-sm" (click)="code.set(null)">Done</button>
        </div>
      </section>
    }

    @if (adding()) {
      <form class="card adm-gap no-print" (ngSubmit)="add()">
        <h2 class="adm-card-title">Add a family</h2>
        <div class="adm-form-grid">
          <label class="field"><span>Center</span>
            <select class="select" name="c" [(ngModel)]="form.centerId" (ngModelChange)="clearClasses()">
              @for (c of centers(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
            </select>
          </label>
          <label class="field"><span>Parent's name</span><input class="input" name="p" [(ngModel)]="form.parentName" placeholder="e.g. Mercy Santos" maxlength="120" /></label>
          <label class="field"><span>Phone number (optional)</span><input class="input" name="ph" [(ngModel)]="form.phone" placeholder="0917 …" maxlength="40" /></label>
        </div>
        <h3 class="kids-title">Children</h3>
        <div class="kids">
          @for (k of form.children; track $index; let i = $index) {
            <div class="kid">
              <label class="field"><span>First name</span><input class="input" [name]="'kn' + i" [(ngModel)]="k.name" maxlength="60" /></label>
              <label class="field"><span>Grade</span>
                <select class="select" [name]="'kg' + i" [(ngModel)]="k.grade">
                  @for (g of [1, 2, 3, 4]; track g) { <option [ngValue]="g">Grade {{ g }}</option> }
                </select>
              </label>
              <label class="field"><span>Class</span>
                <select class="select" [name]="'kc' + i" [(ngModel)]="k.classId">
                  <option [ngValue]="null">No class yet</option>
                  @for (cl of classesFor(form.centerId); track cl.id) { <option [ngValue]="cl.id">{{ cl.name }} · {{ cl.program }}</option> }
                </select>
              </label>
              <label class="field"><span>Avatar</span>
                <select class="select" [name]="'ka' + i" [(ngModel)]="k.avatar">
                  <option [ngValue]="null">The child picks on the phone</option>
                  @for (a of avatars; track a) { <option [ngValue]="a">{{ emoji(a) }} {{ a }}</option> }
                </select>
              </label>
              @if (form.children.length > 1) {
                <button type="button" class="btn btn-ghost btn-sm remove" (click)="form.children.splice(i, 1)" [attr.aria-label]="'Remove child ' + (i + 1)">Remove</button>
              }
            </div>
          }
        </div>
        @if (form.children.length < 8) {
          <button type="button" class="btn btn-ghost btn-sm" (click)="form.children.push(blankChild())">+ Add another child</button>
        }
        <p class="hint">Parents can also add more children themselves on the phone, even without signal. Those children are approved automatically.</p>
        <div class="submit"><button class="btn btn-primary" type="submit" [disabled]="busy()">Add family and make the code</button></div>
      </form>
    }

    <div class="card adm-table no-print">
      <div class="adm-tools">
        <label class="field"><span>Center</span>
          <select class="select" [ngModel]="center()" (ngModelChange)="center.set($event)" name="fc">
            <option value="">All centers</option>
            @for (c of centers(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
          </select>
        </label>
        <label class="field"><span>Search</span><input class="input" type="search" [ngModel]="q()" (ngModelChange)="q.set($event)" name="q" placeholder="Parent or child" /></label>
      </div>
      @if (rows().length) {
        <table class="table">
          <thead><tr><th>Parent</th><th>Children</th><th>Phone</th><th>PIN</th><th>Center</th><th></th></tr></thead>
          <tbody>
            @for (f of rows(); track f.id) {
              <tr>
                <td><strong>{{ f.parentName }}</strong><span class="adm-sub">{{ f.phone || 'No phone number' }}</span></td>
                <td>
                  <div class="chips">
                    @for (k of f.children; track k.id) {
                      <span class="adm-chip" [title]="k.addedBy === 'parent' ? 'Added by the parent on the phone' : ''">
                        <span class="adm-avatar" aria-hidden="true">{{ emoji(k.avatar) }}</span>{{ k.name }}
                        @if (k.addedBy === 'parent') { <span class="tag">by parent</span> }
                      </span>
                    }
                  </div>
                </td>
                <td>
                  @if (f.activated) { <span class="pill pill-teal">Linked {{ fmt(f.activatedAt) }}</span> }
                  @else if (f.codeWaiting) { <span class="pill pill-sun">Code waiting · until {{ fmt(f.codeExpiresAt) }}</span> }
                  @else { <span class="pill pill-grey">No active code</span> }
                </td>
                <td>
                  @if (f.pinSet) { <span class="pill pill-teal">Set</span> }
                  @else if (f.pinResetAt) { <span class="pill pill-sun">Reset {{ fmt(f.pinResetAt) }}</span><span class="adm-sub">New PIN chosen on the phone</span> }
                  @else { <span class="pill pill-grey">Not set yet</span> }
                </td>
                <td class="small">{{ f.center }}</td>
                <td>
                  <div class="adm-actions">
                    <button type="button" class="btn btn-ghost btn-sm" (click)="newCode(f)" [disabled]="busy()">New code</button>
                    @if (f.pinSet) {
                      <button type="button" class="btn btn-danger btn-sm" (click)="resetPin(f)" [disabled]="busy()">Reset PIN</button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <div class="empty">{{ loaded() ? 'No families match.' : 'Loading…' }}</div>
      }
    </div>
  `,
  styles: `
    .code-card { text-align: center; display: grid; gap: 10px; justify-items: center; }
    .row-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    .kids-title { font-size: 15px; margin: 18px 0 8px; }
    .kids { display: grid; gap: 10px; margin-bottom: 10px; }
    .kid { display: grid; grid-template-columns: 1.4fr .8fr 1.4fr 1.4fr auto; gap: 10px; align-items: end; background: var(--cream); border-radius: var(--r-md); padding: 10px; }
    .remove { align-self: end; }
    .submit { margin-top: 14px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag { font-size: 11px; font-weight: 700; color: var(--amber); background: var(--sun-soft); border-radius: 999px; padding: 1px 6px; }
    @media (max-width: 960px) { .kid { grid-template-columns: 1fr 1fr; } }
    @media print { .code-card { border: 2px solid #000; box-shadow: none; margin: 40px auto; max-width: 520px; } }
  `,
})
export class AdminFamiliesPage {
  private readonly admin = inject(AdminService);
  readonly avatars = AVATARS;
  readonly emoji = avatarEmoji;
  readonly fmt = fmtDate;
  readonly centers = signal<AdminCenter[]>([]);
  readonly classes = signal<AdminClass[]>([]);
  readonly families = signal<AdminFamily[]>([]);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly adding = signal(false);
  readonly code = signal<ActivationCodeInfo | null>(null);
  readonly codeFamily = signal('');
  readonly center = signal('');
  readonly q = signal('');
  form = { centerId: '', parentName: '', phone: '', children: [this.blankChild()] as ChildRow[] };

  readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.families().filter(
      (f) =>
        (!this.center() || f.centerId === this.center()) &&
        (!q || f.parentName.toLowerCase().includes(q) || f.children.some((k) => k.name.toLowerCase().includes(q))),
    );
  });

  constructor() {
    const params = inject(ActivatedRoute).snapshot.queryParamMap;
    if (params.get('add')) this.adding.set(true);
    if (params.get('center')) this.center.set(params.get('center')!);
    void this.load();
  }

  blankChild(): ChildRow {
    return { name: '', grade: 1, classId: null, avatar: null };
  }

  classesFor(centerId: string): AdminClass[] {
    return this.classes().filter((c) => c.centerId === centerId);
  }

  clearClasses(): void {
    for (const k of this.form.children) k.classId = null;
  }

  async load(): Promise<void> {
    try {
      const [centers, classes, families] = await Promise.all([this.admin.centers(), this.admin.classes(), this.admin.families()]);
      this.centers.set(centers);
      this.classes.set(classes);
      this.families.set(families);
      if (!this.form.centerId) this.form.centerId = this.center() || centers.find((c) => c.id === 'ctr_tondo')?.id || centers[0]?.id || '';
    } catch (e) {
      this.error.set(adminError(e));
    } finally {
      this.loaded.set(true);
    }
  }

  toggleAdd(): void {
    this.adding.set(!this.adding());
    this.code.set(null);
  }

  async add(): Promise<void> {
    this.error.set('');
    const children = this.form.children.filter((k) => k.name.trim()).map((k) => ({ ...k, name: k.name.trim() }));
    if (!this.form.centerId || !this.form.parentName.trim()) return this.error.set("Fill in the center and the parent's name.");
    if (!children.length) return this.error.set("Add at least one child's first name.");
    this.busy.set(true);
    try {
      const res = await this.admin.createFamily({ centerId: this.form.centerId, parentName: this.form.parentName.trim(), phone: this.form.phone.trim(), children });
      this.codeFamily.set(res.family.parentName);
      this.code.set(res.code);
      this.form = { centerId: this.form.centerId, parentName: '', phone: '', children: [this.blankChild()] };
      this.adding.set(false);
      this.families.set(await this.admin.families());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      this.error.set(adminError(e));
    } finally {
      this.busy.set(false);
    }
  }

  async newCode(f: AdminFamily): Promise<void> {
    if (f.activated && !confirm(`${f.parentName}'s phone is already linked. Make a new code anyway (for example for a new phone)?`)) return;
    this.busy.set(true);
    try {
      const res = await this.admin.newCode(f.id);
      this.codeFamily.set(f.parentName);
      this.code.set(res.code);
      this.families.set(await this.admin.families());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      this.error.set(adminError(e));
    } finally {
      this.busy.set(false);
    }
  }

  async resetPin(f: AdminFamily): Promise<void> {
    if (!confirm(`Reset ${f.parentName}'s 3-digit PIN? The parent chooses a new PIN on the phone the next time it connects.`)) return;
    this.busy.set(true);
    try {
      const updated = await this.admin.resetPin(f.id);
      this.families.update((list) => list.map((x) => (x.id === f.id ? updated : x)));
    } catch (e) {
      this.error.set(adminError(e));
    } finally {
      this.busy.set(false);
    }
  }

  print(): void {
    window.print();
  }
}
