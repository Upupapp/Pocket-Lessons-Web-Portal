import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminCenter, AdminClass, AdminStudent } from '../../core/admin-models';
import { KidAvatar } from '../../shared/kid-avatar';
import { AdminService, adminError } from '../../core/admin.service';
import { Processing } from '../../core/processing';

/** A-16 Students in every center: move to another class, mark as left (records are kept). */
@Component({
  selector: 'pl-admin-students',
  imports: [FormsModule, KidAvatar],
  template: `
    <div class="page-head">
      <div>
        <h1>Students</h1>
        <p>Every child in the program. Children are added with their family, or by their parent on the phone.</p>
      </div>
    </div>

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
                <td>
                  <select class="select sm" [ngModel]="s.classId" (ngModelChange)="move(s, $event)" [name]="'cls-' + s.id" [attr.aria-label]="'Class of ' + s.name" [disabled]="s.left || busy()">
                    <option [ngValue]="null">No class</option>
                    @for (c of classesFor(s.centerId); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
                  </select>
                </td>
                <td class="small hide-xs">{{ s.parentName || '—' }}</td>
                <td class="small hide-xs hide-md">{{ s.center }}</td>
                <td>
                  <div class="adm-actions">
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
    .select.sm { min-height: 36px; padding: 6px 10px; font-size: 14px; width: auto; }
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

  async move(s: AdminStudent, classId: string | null): Promise<void> {
    if (classId === s.classId) return;
    const to = this.classes().find((c) => c.id === classId)?.name ?? 'no class';
    await this.patch(s, { classId }, `Moving ${s.name}`, `Now in ${to}`);
  }

  async setLeft(s: AdminStudent, left: boolean, event?: Event): Promise<void> {
    if (left && !confirm(`Mark ${s.name} as left the program? Their reading checks and history are kept.`)) return;
    await this.patch(s, { left }, left ? `Marking ${s.name} as left` : `Bringing ${s.name} back`, left ? 'Marked as left' : 'Back in the program', event);
  }

  /** Small changes: the loader only shows if the server takes a moment. */
  private async patch(s: AdminStudent, patch: { classId?: string | null; left?: boolean }, title: string, doneTitle: string, event?: Event): Promise<void> {
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
