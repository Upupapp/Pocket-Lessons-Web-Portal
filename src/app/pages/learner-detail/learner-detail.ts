import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { LEVELS, Learner, levelIndex } from '../../core/models';
import { LineChart, LinePoint } from '../../shared/charts/line-chart';

/** Learner profile with reading-level path, reading speed and check history (WEB-03). */
@Component({
  selector: 'pl-learner-detail',
  imports: [RouterLink, DatePipe, FormsModule, LineChart],
  template: `
    @if (learner(); as l) {
      <a routerLink="/app/learners" class="back">← All learners</a>
      <div class="page-head">
        <div class="who">
          <span class="avatar" aria-hidden="true">{{ l.name.charAt(0) }}</span>
          <div>
            <h1>{{ l.name }}</h1>
            <p>Grade {{ l.grade }} · {{ l.caregiver || 'No caregiver recorded' }}</p>
          </div>
        </div>
        <div class="row">
          <button type="button" class="btn btn-ghost" (click)="startEdit(l)">Edit</button>
          <a class="btn btn-primary" routerLink="/app/assess" [queryParams]="{ learner: l.id }">Check reading</a>
        </div>
      </div>

      @if (editing(); as e) {
        <form class="card edit" (ngSubmit)="saveEdit()">
          <label class="field"><span>Name</span><input class="input" name="n" [(ngModel)]="e.name" required /></label>
          <label class="field"><span>Grade</span>
            <select class="select" name="g" [(ngModel)]="e.grade">@for (g of [1, 2, 3, 4]; track g) { <option [ngValue]="g">Grade {{ g }}</option> }</select>
          </label>
          <label class="field"><span>Caregiver</span><input class="input" name="c" [(ngModel)]="e.caregiver" /></label>
          <div class="row end">
            <button type="button" class="btn btn-danger btn-sm" (click)="remove(l)">Remove learner</button>
            <button type="button" class="btn btn-ghost" (click)="editing.set(null)">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      }

      <section class="card">
        <h2>Reading level path</h2>
        <ol class="path">
          @for (lv of levels; track lv; let i = $index) {
            <li [class.reached]="i <= current()" [class.now]="i === current()" [class.base]="i === baseline()">
              <span class="dot">{{ i + 1 }}</span>
              <span class="lv">{{ lv }}</span>
              @if (i === current()) { <span class="tag now-tag">Now</span> }
              @if (i === baseline() && baseline() !== current()) { <span class="tag">Baseline</span> }
            </li>
          }
        </ol>
      </section>

      <section class="card">
        <pl-line-chart
          title="Reading speed"
          [caption]="speedCaption()"
          [points]="speed()"
          unit="wcpm"
          valueName="Words correct per minute"
          period="Timed reading"
          [height]="190"
          empty="No timed readings yet. A one-minute timed reading starts this line."
        />
      </section>

      <section class="card">
        <h2>Checks</h2>
        @if (history().length) {
          <div class="table-scroll">
          <table class="table">
            <thead><tr><th>Date</th><th>Check</th><th>Level</th><th>Result</th><th>Note</th></tr></thead>
            <tbody>
              @for (a of history(); track a.id) {
                <tr>
                  <td>{{ a.date | date: 'd MMM y' }}</td>
                  <td>{{ a.type === 'placement' ? 'Reading level' : 'Timed reading' }}</td>
                  <td>
                    @if (a.previousLevel && a.previousLevel !== a.level) { <span class="small muted">{{ a.previousLevel }} → </span> }
                    <span class="lvl" [attr.data-level]="a.level">{{ a.level }}</span>
                  </td>
                  <td class="small">
                    @if (a.type === 'fluency') { {{ a.wcpm }} wcpm · {{ a.accuracy }}% } @else { — }
                  </td>
                  <td class="small muted">{{ a.note || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
          </div>
        } @else {
          <div class="empty">No checks yet. Start with a reading-level check to set a baseline.</div>
        }
      </section>
    } @else {
      <div class="empty"><h2>Learner not found</h2><a routerLink="/app/learners">Back to learners</a></div>
    }
  `,
  styles: `
    .back { font-weight: 700; text-decoration: none; font-size: 14px; display: inline-block; margin-bottom: 10px; }
    .who { display: flex; gap: 14px; align-items: center; }
    .avatar { width: 60px; height: 60px; border-radius: 50%; background: var(--accent-tint); border: 1px solid var(--accent-tint-2); color: var(--title); display: grid; place-items: center; font: 700 26px var(--serif); }
    .row { display: flex; gap: 10px; flex-wrap: wrap; }
    .table-scroll { overflow-x: auto; margin: 0 -4px; padding: 0 4px; }
    .table-scroll td:first-child { white-space: nowrap; }
    .end { justify-content: flex-end; grid-column: 1 / -1; }
    .edit { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; }
    section { margin-bottom: 20px; }
    h2 { font-family: var(--serif); font-size: 20px; margin-bottom: 16px; }
    .path { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, 1fr); position: relative; }
    .path li { display: grid; justify-items: center; align-content: start; gap: 6px; position: relative; text-align: center; }
    .path li::before { content: ''; position: absolute; top: 18px; left: -50%; width: 100%; height: 4px; background: var(--line); z-index: 0; }
    .path li:first-child::before { display: none; }
    .path li.reached::before { background: var(--teal); }
    .dot { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: var(--white); border: 3px solid var(--line); font-weight: 700; z-index: 1; }
    .reached .dot { border-color: var(--teal); background: var(--mint); color: var(--teal-dark); }
    .now .dot { background: var(--teal); color: #fff; box-shadow: 0 0 0 6px rgba(20, 107, 96, .12); }
    .lv { font-weight: 700; font-size: 14px; }
    .tag { font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: var(--cream-2); color: var(--muted); }
    .now-tag { background: var(--accent-tint); color: var(--title); border: 1px solid var(--accent-tint-2); }
    @media (max-width: 700px) { .edit { grid-template-columns: 1fr; } .lv { font-size: 12px; } }
  `,
})
export class LearnerDetail {
  private readonly data = inject(DataService);
  private readonly router = inject(Router);
  readonly id = input.required<string>();
  readonly levels = LEVELS;
  readonly learner = computed(() => this.data.learner(this.id()));
  readonly history = computed(() => this.data.assessmentsFor(this.id()));
  readonly current = computed(() => (this.learner() ? levelIndex(this.learner()!.level) : -1));
  readonly baseline = computed(() => {
    const first = [...this.history()].reverse()[0];
    return first ? levelIndex(first.previousLevel ?? first.level) : -1;
  });
  readonly editing = signal<Learner | null>(null);

  /** This child's timed readings, oldest first. */
  readonly speed = computed<LinePoint[]>(() =>
    this.history()
      .filter((a) => a.type === 'fluency' && typeof a.wcpm === 'number')
      .reverse()
      .map((a) => {
        const d = new Date(a.date);
        const day = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        return { label: day, long: `${day} ${d.getFullYear()} · ${a.accuracy ?? '—'}% correct`, value: a.wcpm! };
      }),
  );
  readonly speedCaption = computed(() => {
    const n = this.speed().length;
    return n ? `Words correct per minute in each of ${this.learner()?.name.split(' ')[0]}'s ${n} timed reading${n === 1 ? '' : 's'}.` : '';
  });

  startEdit(l: Learner): void {
    this.editing.set({ ...l });
  }

  saveEdit(): void {
    const e = this.editing();
    if (!e || !e.name.trim()) return;
    this.data.updateLearner({ ...e, name: e.name.trim() });
    this.editing.set(null);
  }

  remove(l: Learner): void {
    if (!confirm(`Remove ${l.name} and all their checks? This cannot be undone.`)) return;
    this.data.removeLearner(l.id);
    void this.router.navigateByUrl('/app/learners');
  }
}
