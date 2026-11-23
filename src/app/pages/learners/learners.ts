import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { LEVELS, LEVEL_HINT, Level, daysSince } from '../../core/models';
import { Processing } from '../../core/processing';

/** Learners and reading-level groups (WEB-02). */
@Component({
  selector: 'pl-learners',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Learners and reading groups</h1>
        <p>Children are grouped by reading level, not by grade. Lessons go to the group.</p>
      </div>
      <button type="button" class="btn btn-primary" (click)="adding.set(!adding())">{{ adding() ? 'Close' : '+ Add learner' }}</button>
    </div>

    @if (adding()) {
      <form class="card add" (ngSubmit)="add($event)">
        <h2>Add a learner</h2>
        <div class="add-grid">
          <label class="field"><span>Child's name</span><input class="input" name="n" [(ngModel)]="form.name" required maxlength="60" /></label>
          <label class="field"><span>Grade</span>
            <select class="select" name="g" [(ngModel)]="form.grade">
              @for (g of [1, 2, 3, 4]; track g) { <option [ngValue]="g">Grade {{ g }}</option> }
            </select>
          </label>
          <label class="field"><span>Reading level</span>
            <select class="select" name="l" [(ngModel)]="form.level">
              @for (lv of levels; track lv) { <option [value]="lv">{{ lv }}</option> }
            </select>
            <span class="hint">Not sure? Choose Beginner, then do a reading-level check.</span>
          </label>
          <label class="field"><span>Caregiver who holds the phone</span><input class="input" name="c" [(ngModel)]="form.caregiver" placeholder="e.g. Lorna Santos (mother)" maxlength="80" /></label>
        </div>
        @if (formError()) { <p class="error-text">{{ formError() }}</p> }
        <div class="row"><button class="btn btn-primary" type="submit">Save learner</button></div>
      </form>
    }

    <div class="groups" role="tablist" aria-label="Reading level groups">
      <button type="button" role="tab" class="group" [class.on]="level() === ''" (click)="level.set('')">
        <strong>{{ data.learners().length }}</strong><span>All learners</span>
      </button>
      @for (g of data.levelCounts(); track g.level) {
        <button type="button" role="tab" class="group" [class.on]="level() === g.level" (click)="level.set(g.level)" [title]="levelHint[g.level]">
          <strong>{{ g.count }}</strong><span>{{ g.level }}</span>
        </button>
      }
    </div>

    <div class="card table-card">
      <div class="tools">
        <input class="input" type="search" placeholder="Search by name" [ngModel]="q()" (ngModelChange)="q.set($event)" aria-label="Search learners" />
      </div>
      @if (rows().length) {
        <table class="table">
          <thead><tr><th>Learner</th><th class="hide-xs">Grade</th><th>Reading level</th><th>Last check</th><th class="hide-sm">Caregiver</th><th class="hide-xs"></th></tr></thead>
          <tbody>
            @for (r of rows(); track r.l.id) {
              <tr>
                <td><a class="name" [routerLink]="['/app/learners', r.l.id]">{{ r.l.name }}</a></td>
                <td class="hide-xs">{{ r.l.grade }}</td>
                <td><span class="lvl" [attr.data-level]="r.l.level">{{ r.l.level }}</span></td>
                <td>
                  @if (r.days === null) { <span class="pill pill-red">Never checked</span> }
                  @else if (r.days > 30) { <span class="pill pill-red">{{ r.days }} days ago</span> }
                  @else { <span class="small">{{ r.days === 0 ? 'Today' : r.days + ' days ago' }}</span> }
                </td>
                <td class="hide-sm small muted">{{ r.l.caregiver || '—' }}</td>
                <td class="end hide-xs"><a class="btn btn-ghost btn-sm" routerLink="/app/assess" [queryParams]="{ learner: r.l.id }">Check reading</a></td>
              </tr>
            }
          </tbody>
        </table>
      } @else {
        <div class="empty">No learners match.</div>
      }
    </div>
  `,
  styles: `
    h2 { font-family: var(--serif); font-size: 20px; margin-bottom: 14px; }
    .add { margin-bottom: 20px; }
    .add-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .row { margin-top: 14px; }
    .groups { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin-bottom: 18px; }
    .group { border: 1px solid var(--line); background: var(--white); border-radius: var(--r-md); padding: 12px; text-align: left; cursor: pointer; display: grid; font: 400 13px var(--font); color: var(--muted); }
    .group strong { font: 600 24px var(--font); color: var(--ink); }
    .group.on { border-color: var(--accent); background: var(--accent-tint); color: var(--title); }
    .group.on strong { color: var(--title); }
    .table-card { padding: 8px 8px 4px; overflow-x: auto; }
    .tools { padding: 8px 8px 12px; }
    .tools .input { max-width: 280px; }
    .name { font-weight: 700; text-decoration: none; }
    .end { text-align: right; }
    @media (max-width: 960px) { .add-grid { grid-template-columns: 1fr 1fr; } .groups { grid-template-columns: repeat(3, 1fr); } .hide-sm { display: none; } }
  `,
})
export class Learners {
  readonly data = inject(DataService);
  private readonly processing = inject(Processing);
  readonly levels = LEVELS;
  readonly levelHint = LEVEL_HINT;
  readonly level = signal<Level | ''>('');
  readonly q = signal('');
  readonly adding = signal(false);
  readonly formError = signal('');
  form = { name: '', grade: 1 as 1 | 2 | 3 | 4, level: 'Beginner' as Level, caregiver: '' };

  readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.data
      .learners()
      .filter((l) => !this.level() || l.level === this.level())
      .filter((l) => !q || l.name.toLowerCase().includes(q))
      .map((l) => {
        const last = this.data.lastCheck().get(l.id);
        return { l, days: last ? daysSince(last.date) : null };
      })
      .sort((a, b) => a.l.name.localeCompare(b.l.name));
  });

  async add(event?: Event): Promise<void> {
    if (!this.form.name.trim()) {
      this.formError.set('Enter the child’s name.');
      return;
    }
    const child = { ...this.form, name: this.form.name.trim(), caregiver: this.form.caregiver.trim() };
    this.data.addLearner(child);
    this.formError.set('');
    await this.processing.run({
      title: `Adding ${child.name}`,
      detail: `Grade ${child.grade} · ${child.level} level`,
      from: event,
      run: () => this.data.flush(),
      done: { title: `${child.name} added`, detail: `${child.level} level · Grade ${child.grade}` },
    });
    this.form = { name: '', grade: 1, level: 'Beginner', caregiver: '' };
    this.adding.set(false);
  }
}
