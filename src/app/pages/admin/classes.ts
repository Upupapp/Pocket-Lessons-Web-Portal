import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AdminCenter, AdminClass, AdminStaff } from '../../core/admin-models';
import { AdminService, adminError } from '../../core/admin.service';
import { LEVELS, uid } from '../../core/models';
import { Processing } from '../../core/processing';
import { FormDialog } from '../../shared/form-dialog';

/** A-07 Classes per center, each with a teacher from the same center. */
@Component({
  selector: 'pl-admin-classes',
  imports: [FormsModule, RouterLink, FormDialog],
  template: `
    <div class="page-head">
      <div>
        <h1>Classes</h1>
        <p>Groups of children at a center, with their program, level, schedule and teacher.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="startNew()">+ New class</button>
    </div>

    @if (error()) { <p class="adm-msg" role="alert">{{ error() }}</p> }

    @if (editing()) {
      <pl-form-dialog #fd [title]="editId ? 'Change ' + editName : 'New class'" [lead]="editId ? 'Its children stay in the class.' : 'A group of children at one center, with its program, level, schedule and teacher.'" (closed)="editing.set(false)">
        <form (ngSubmit)="save($event)" novalidate>
        <div class="dlg-grid">
          <label class="field"><span>Center</span>
            <select class="select" name="c" [(ngModel)]="form.centerId" (ngModelChange)="form.teacherId = null">
              @for (c of centers(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
            </select>
          </label>
          <label class="field"><span>Class name</span><input class="input" name="n" [(ngModel)]="form.name" placeholder="e.g. Group D" maxlength="60" /></label>
          <label class="field"><span>Program</span><input class="input" name="p" [(ngModel)]="form.program" placeholder="e.g. TaRL Filipino" maxlength="80" /></label>
          <label class="field"><span>Reading level</span>
            <select class="select" name="l" [(ngModel)]="form.level">
              @for (lv of levels; track lv) { <option [value]="lv">{{ lv }}</option> }
            </select>
          </label>
          <label class="field"><span>Schedule</span><input class="input" name="s" [(ngModel)]="form.schedule" placeholder="e.g. Mon to Fri · 3:00 PM" maxlength="80" /></label>
          <label class="field"><span>Teacher</span>
            <select class="select" name="t" [(ngModel)]="form.teacherId">
              <option [ngValue]="null">No teacher yet</option>
              @for (t of teachersFor(form.centerId); track t.id) { <option [ngValue]="t.id">{{ t.name }}</option> }
            </select>
          </label>
        </div>
        @if (formError()) { <p class="dlg-error" role="alert">{{ formError() }}</p> }
        <div class="dlg-actions">
          <button type="button" class="btn btn-ghost" (click)="fd.close()">Cancel</button>
          <button class="btn btn-primary" type="submit" [disabled]="busy()">{{ editId ? 'Save changes' : 'Add class' }}</button>
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
      </div>
      @if (rows().length) {
        <table class="table stack-xs">
          <thead><tr><th>Class</th><th>Level</th><th class="hide-xs">Schedule</th><th class="hide-xs">Teacher</th><th>Children</th><th class="hide-xs">Center</th><th></th></tr></thead>
          <tbody>
            @for (c of rows(); track c.id) {
              <tr>
                <td><strong>{{ c.name }}</strong><span class="adm-sub">{{ c.program }}</span></td>
                <td><span class="lvl" [attr.data-level]="c.level">{{ c.level }}</span></td>
                <td class="small hide-xs">{{ c.schedule || '—' }}</td>
                <td class="small hide-xs">{{ c.teacher || 'No teacher yet' }}</td>
                <td data-label="Children"><a [routerLink]="['/admin/students']" [queryParams]="{ center: c.centerId, class: c.id }">{{ c.children }}</a></td>
                <td class="small hide-xs">{{ c.center }}</td>
                <td>
                  <div class="adm-actions">
                    <button type="button" class="btn btn-ghost btn-sm" (click)="edit(c)" [disabled]="busy()">Change</button>
                    <button type="button" class="btn btn-danger btn-sm" (click)="remove(c, $event)" [disabled]="busy()">Remove</button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <div class="empty">{{ loaded() ? 'No classes yet.' : 'Loading…' }}</div>
      }
    </div>
  `,
})
export class AdminClassesPage {
  private readonly admin = inject(AdminService);
  private readonly processing = inject(Processing);
  readonly levels = LEVELS;
  readonly centers = signal<AdminCenter[]>([]);
  readonly classes = signal<AdminClass[]>([]);
  readonly staff = signal<AdminStaff[]>([]);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly editing = signal(false);
  readonly formError = signal('');
  readonly center = signal('');
  editId = '';
  editName = '';
  form = this.blank();

  readonly rows = computed(() => this.classes().filter((c) => !this.center() || c.centerId === this.center()));

  constructor() {
    const params = inject(ActivatedRoute).snapshot.queryParamMap;
    if (params.get('center')) this.center.set(params.get('center')!);
    void this.load().then(() => {
      if (params.get('add')) this.startNew();
    });
  }

  private blank() {
    return { centerId: '', name: '', program: '', level: 'Word', schedule: '', teacherId: null as string | null };
  }

  teachersFor(centerId: string): AdminStaff[] {
    return this.staff().filter((s) => s.centerId === centerId && s.active);
  }

  async load(): Promise<void> {
    try {
      const [centers, classes, staff] = await Promise.all([this.admin.centers(), this.admin.classes(), this.admin.staff()]);
      this.centers.set(centers);
      this.classes.set(classes);
      this.staff.set(staff);
    } catch (e) {
      this.error.set(adminError(e));
    } finally {
      this.loaded.set(true);
    }
  }

  startNew(): void {
    this.editId = '';
    this.editName = '';
    this.form = { ...this.blank(), centerId: this.center() || this.centers()[0]?.id || '' };
    this.formError.set('');
    this.editing.set(true);
  }

  edit(c: AdminClass): void {
    this.editId = c.id;
    this.editName = c.name;
    this.form = { centerId: c.centerId, name: c.name, program: c.program, level: c.level, schedule: c.schedule, teacherId: c.teacherId };
    this.formError.set('');
    this.editing.set(true);
  }

  async save(event?: Event): Promise<void> {
    this.formError.set('');
    if (!this.form.centerId || !this.form.name.trim() || !this.form.program.trim()) return this.formError.set('Fill in the center, class name and program.');
    const id = this.editId || uid('cls');
    const name = this.form.name.trim();
    const isNew = !this.editId;
    this.busy.set(true);
    const r = await this.processing.run({
      title: isNew ? `Adding ${name}` : `Saving ${name}`,
      detail: this.centers().find((c) => c.id === this.form.centerId)?.name,
      from: event,
      errorText: adminError,
      run: async () => {
        await this.admin.saveClass(id, { ...this.form });
        this.classes.set(await this.admin.classes());
        this.editing.set(false);
      },
      done: { title: isNew ? 'Class added' : 'Class saved', detail: name },
    });
    this.busy.set(false);
    if (!r.ok) this.formError.set(r.error);
  }

  async remove(c: AdminClass, event?: Event): Promise<void> {
    if (!confirm(`Remove ${c.name} (${c.center})? Its ${c.children} children stay in the program without a class.`)) return;
    this.busy.set(true);
    const r = await this.processing.run({
      title: `Removing ${c.name}`,
      detail: `${c.center} · the children stay in the program`,
      from: event,
      errorText: adminError,
      run: async () => {
        await this.admin.deleteClass(c.id);
        this.classes.update((list) => list.filter((x) => x.id !== c.id));
      },
      done: { title: 'Class removed', detail: c.name },
    });
    this.busy.set(false);
    if (!r.ok) this.error.set(r.error);
  }
}
