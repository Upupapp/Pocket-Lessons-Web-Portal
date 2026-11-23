import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AVATARS, AdminCenter, AdminClass, AdminStudent, StudentPatch } from '../../core/admin-models';
import { KidAvatar, avatarLabel } from '../../shared/kid-avatar';
import { FormDialog } from '../../shared/form-dialog';
import { AdminService, adminError } from '../../core/admin.service';
import { Processing } from '../../core/processing';

/** A-16 Students in every center: move to another class, mark as left (records are kept). */
@Component({
  selector: 'pl-admin-students',
  imports: [FormsModule, KidAvatar, RouterLink, FormDialog],
  template: `
    <div class="page-head">
      <div>
        <h1>Students</h1>
        <p>Every child in the program. Children are added with their family, or by their parent on the phone.</p>
      </div>
      <a class="btn btn-primary" routerLink="/admin/families" [queryParams]="{ add: 1 }">+ Add a family</a>
    </div>

    @if (editing(); as e) {
      <pl-form-dialog #fd [title]="'Change ' + e.name" [lead]="e.center + (e.parentName ? ' · parent: ' + e.parentName : '')" (closed)="editing.set(null)">
        <form (ngSubmit)="saveEdit($event)" novalidate>
          <div class="dlg-grid">
            <label class="field"><span>First name</span><input class="input" name="n" [(ngModel)]="form.name" maxlength="60" autocomplete="off" /></label>
            <label class="field"><span>Grade</span>
              <select class="select" name="g" [(ngModel)]="form.grade">
                @for (g of [1, 2, 3, 4]; track g) { <option [ngValue]="g">Grade {{ g }}</option> }
              </select>
            </label>
            <label class="field"><span>Class</span>
              <select class="select" name="c" [(ngModel)]="form.classId">
                <option [ngValue]="null">No class</option>
                @for (c of classesFor(e.centerId); track c.id) { <option [ngValue]="c.id">{{ c.name }} · {{ c.program }}</option> }
              </select>
            </label>
            <label class="field"><span>Avatar</span>
              <select class="select" name="a" [(ngModel)]="form.avatar">
                <option [ngValue]="null">The child picks on the phone</option>
                @for (a of avatars; track a) { <option [ngValue]="a">{{ avatarName(a) }}</option> }
              </select>
            </label>
          </div>
          <p class="hint dlg-note">Reading level: <span class="lvl" [attr.data-level]="e.level">{{ e.level }}</span> · it changes with the teacher's reading checks.</p>
          @if (formError()) { <p class="dlg-error" role="alert">{{ formError() }}</p> }
          <div class="dlg-actions">
            <button type="button" class="btn btn-ghost" (click)="fd.close()">Cancel</button>
            <button class="btn btn-primary" type="submit" [disabled]="busy()">Save changes</button>
          </div>
        </form>
      </pl-form-dialog>
    }

    @if (error()) { <p class="adm-msg" role="alert">{{ error() }}</p> }

    <div class="card adm-table">
      <div class="adm-tools">
        <label class="field"><span>Center</span>
          <select class="select" [ngModel]="center()" (ngModelChange)="center.set($event); klass.set('')" name="fc">
            <option value="">All centers</option>
            @for (c of centers(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
          </select>
        </label>
        <label class="field"><span>Class</span>
          <select class="select" [ngModel]="klass()" (ngModelChange)="klass.set($event)" name="fk">
            <option value="">All classes</option>
            @for (c of classesFor(center()); track c.id) { <option [value]="c.id">{{ c.name }}{{ center() ? '' : ' · ' + c.center }}</option> }
          </select>
        </label>
        <label class="field"><span>Search</span><input class="input" type="search" [ngModel]="q()" (ngModelChange)="q.set($event)" name="q" placeholder="Child or parent" /></label>
        <label class="adm-check"><input type="checkbox" [ngModel]="showLeft()" (ngModelChange)="showLeft.set($event)" name="sl" /> Show children who left</label>
      </div>
      <p class="small muted count">{{ rows().length }} {{ rows().length === 1 ? 'child' : 'children' }}</p>
      @if (rows().length) {
        <table class="table stack-xs">
          <thead><tr><th>Child</th><th class="hide-xs">Grade</th><th>Level</th><th>Class</th><th class="hide-xs">Parent</th><th class="hide-xs hide-md">Center</th><th></th></tr></thead>
          <tbody>
            @for (s of rows(); track s.id) {
              <tr [class.dim]="s.left">
                <td>
                  <pl-kid class="adm-avatar" [avatar]="s.avatar" [name]="s.name" aria-hidden="true" />
                  <strong>{{ s.name }}</strong>
                  @if (s.addedBy === 'parent') { <span class="pill pill-grey by">Added by parent</span> }
                  @if (s.left) { <span class="pill pill-grey by">Left</span> }
                </td>
                <td class="hide-xs">{{ s.grade }}</td>
                <td><span class="lvl" [attr.data-level]="s.level">{{ s.level }}</span></td>
                <td data-label="Class">{{ s.className || 'No class' }}</td>
                <td class="small hide-xs">{{ s.parentName || '—' }}</td>
                <td class="small hide-xs hide-md">{{ s.center }}</td>
                <td>
                  <div class="adm-actions">
                    @if (!s.left) {
                      <button type="button" class="btn btn-ghost btn-sm" (click)="openEdit(s)" [disabled]="busy()">Change</button>
                    }
                    @if (s.left) {
                      <button type="button" class="btn btn-ghost btn-sm" (click)="setLeft(s, false, $event)" [disabled]="busy()">Back in the program</button>
                    } @else {
                      <button type="button" class="btn btn-ghost btn-sm" (click)="setLeft(s, true, $event)" [disabled]="busy()">Mark as left</button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <div class="empty">{{ loaded() ? 'No children match.' : 'Loading…' }}</div>
      }
    </div>
  `,
  styles: `
    .count { padding: 0 12px 6px; }
    .by { margin-left: 6px; }
    .adm-avatar { margin-right: 6px; }
    tr.dim td { opacity: .6; }
  `,
})
export class AdminStudentsPage {
  private readonly admin = inject(AdminService);
  private readonly processing = inject(Processing);
  readonly centers = signal<AdminCenter[]>([]);
  readonly classes = signal<AdminClass[]>([]);
  readonly students = signal<AdminStudent[]>([]);
  readonly loaded = signal(false);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly center = signal('');
  readonly klass = signal('');
  readonly q = signal('');
  readonly showLeft = signal(false);
  readonly editing = signal<AdminStudent | null>(null);
  readonly formError = signal('');
  readonly avatars = AVATARS;
  readonly avatarName = avatarLabel;
  form = { name: '', grade: 1, classId: null as string | null, avatar: null as string | null };

  readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.students().filter(
      (s) =>
        (!this.center() || s.centerId === this.center()) &&
        (!this.klass() || s.classId === this.klass()) &&
        (this.showLeft() || !s.left) &&
        (!q || s.name.toLowerCase().includes(q) || (s.parentName ?? '').toLowerCase().includes(q)),
    );
  });

  constructor() {
    const params = inject(ActivatedRoute).snapshot.queryParamMap;
    if (params.get('center')) this.center.set(params.get('center')!);
    if (params.get('class')) this.klass.set(params.get('class')!);
    void this.load();
  }

  classesFor(centerId: string): AdminClass[] {
    return this.classes().filter((c) => !centerId || c.centerId === centerId);
  }

  async load(): Promise<void> {
    try {
      const [centers, classes, students] = await Promise.all([this.admin.centers(), this.admin.classes(), this.admin.students({ includeLeft: true })]);
      this.centers.set(centers);
      this.classes.set(classes);
      this.students.set(students);
    } catch (e) {
      this.error.set(adminError(e));
    } finally {
      this.loaded.set(true);
    }
  }

  openEdit(s: AdminStudent): void {
    this.form = { name: s.name, grade: s.grade, classId: s.classId, avatar: s.avatar };
    this.formError.set('');
    this.editing.set(s);
  }

  async saveEdit(event?: Event): Promise<void> {
    const s = this.editing();
    if (!s) return;
    this.formError.set('');
    const name = this.form.name.trim();
    if (!name) return this.formError.set("Enter the child's first name.");
    const patch: StudentPatch = {};
    if (name !== s.name) patch.name = name;
    if (this.form.grade !== s.grade) patch.grade = this.form.grade;
    if (this.form.classId !== s.classId) patch.classId = this.form.classId;
    if (this.form.avatar !== s.avatar) patch.avatar = this.form.avatar;
    if (!Object.keys(patch).length) return this.editing.set(null);
    const klass = this.classes().find((c) => c.id === this.form.classId)?.name ?? 'No class';
    this.busy.set(true);
    const r = await this.processing.run({
      title: `Saving ${name}'s details`,
      detail: `Grade ${this.form.grade} · ${klass} · ${s.center}`,
      from: event,
      errorText: adminError,
      run: async () => {
        const updated = await this.admin.updateStudent(s.id, patch);
        this.students.update((list) => list.map((x) => (x.id === s.id ? updated : x)));
        this.editing.set(null);
      },
      done: { title: 'Details saved', detail: patch.classId !== undefined ? `${name} · now in ${klass}` : name },
    });
    this.busy.set(false);
    if (!r.ok) this.formError.set(r.error);
  }

  async setLeft(s: AdminStudent, left: boolean, event?: Event): Promise<void> {
    if (left && !confirm(`Mark ${s.name} as left the program? Their reading checks and history are kept.`)) return;
    await this.patch(s, { left }, left ? `Marking ${s.name} as left` : `Bringing ${s.name} back`, left ? 'Marked as left' : 'Back in the program', event);
  }

  /** Small changes: the loader only shows if the server takes a moment. */
  private async patch(s: AdminStudent, patch: { left: boolean }, title: string, doneTitle: string, event?: Event): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    const r = await this.processing.run({
      title,
      detail: s.center,
      from: event,
      quick: true,
      errorText: adminError,
      run: async () => {
        const updated = await this.admin.updateStudent(s.id, patch);
        this.students.update((list) => list.map((x) => (x.id === s.id ? updated : x)));
      },
      done: { title: doneTitle, detail: s.name },
    });
    this.busy.set(false);
    if (!r.ok) this.error.set(r.error);
  }
}
