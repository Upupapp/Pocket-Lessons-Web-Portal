import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { LEVELS, Lesson, Level, PACK_LIMIT_BYTES, Unit, formatBytes } from '../../core/models';
import { SUBJECTS, subjectIcon, subjectOf } from '../../core/subjects';

type Filter = 'all' | 'draft' | 'published';

/** Lesson library (WEB-05). */
@Component({
  selector: 'pl-lessons',
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    <div class="page-head">
      <div>
        <h1>Lessons</h1>
        <p>Short voice lessons for each reading level. Drafts save as you work.</p>
      </div>
      <div class="head-actions">
        <a class="btn btn-ghost" routerLink="/app/lessons/new">+ New lesson</a>
        <a class="btn btn-primary" routerLink="/app/lessons/import">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M7 9l5-5 5 5M5 15v4h14v-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          Import a lesson file
        </a>
      </div>
    </div>

    @if (justCreated(); as u) {
      <div class="toast" role="status">
        <strong>"{{ u.title }}" is ready as drafts in {{ world(u.subject).childEn }} · {{ world(u.subject).world }}.</strong>
        Next: open Part 1, record your voice on each page, and press <em>Preview as the child</em> to see it in its world.
      </div>
    }

    @if (shownUnits().length) {
      <h2 class="section-title">Story units</h2>
      <div class="units">
        @for (u of shownUnits(); track u.unit.id) {
          <section class="card unit" [class.fresh]="u.unit.id === unit()">
            <div class="unit-head">
              <div>
                <h3>{{ u.unit.title }}</h3>
                @if (u.unit.subject) {
                  <span class="subj" [style.--main]="world(u.unit.subject).main" [style.--tint]="world(u.unit.subject).tint" [style.--deep]="world(u.unit.subject).deep">
                    <img [src]="icon(world(u.unit.subject).hero)" alt="" width="18" height="18" />{{ world(u.unit.subject).childEn }} · {{ world(u.unit.subject).world }}
                  </span>
                } @else {
                  <a class="subj need" [routerLink]="['/app/lessons', u.lessons[0]?.id]">Choose a subject</a>
                }
                <p class="small muted">
                  {{ u.unit.level }} · {{ u.unit.language }}@if (u.unit.sourceLabel) { · {{ u.unit.sourceLabel }} }@if (u.unit.author) { · by {{ u.unit.author }} }
                </p>
                <p class="small muted">{{ u.lessons.length }} circles · {{ u.recorded }} of {{ u.pages }} pages recorded · {{ u.published }} published</p>
              </div>
              <button type="button" class="btn btn-danger btn-sm" (click)="removeUnit(u.unit)">Delete unit</button>
            </div>
            <div class="meter wide"><span [style.width.%]="u.pages ? (u.recorded / u.pages) * 100 : 0"></span></div>
            <ol class="trail">
              @for (l of u.lessons; track l.id; let i = $index) {
                <li [style.--lift.px]="lift(i)">
                  <a [routerLink]="['/app/lessons', l.id]" class="stop" [class.cp]="l.kind === 'checkpoint'" [class.live]="l.status === 'published'" [class.ready]="isRecorded(l)">
                    <span class="disc">
                      @if (l.kind === 'checkpoint') {
                        <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="currentColor" /></svg>
                      } @else {
                        {{ i + 1 }}
                      }
                    </span>
                    <span class="cap">{{ l.kind === 'checkpoint' ? 'Checkpoint' : 'Part ' + (i + 1) }}</span>
                    <span class="state">{{ stateLabel(l) }}</span>
                  </a>
                </li>
              }
            </ol>
          </section>
        }
      </div>
      <h2 class="section-title">Single lessons</h2>
    }

    <div class="bar">
      <div class="seg" role="tablist" aria-label="Filter by status">
        @for (f of filters; track f.id) {
          <button type="button" role="tab" [attr.aria-selected]="filter() === f.id" [class.on]="filter() === f.id" (click)="filter.set(f.id)">
            {{ f.label }} <span>{{ count(f.id) }}</span>
          </button>
        }
      </div>
      <div class="right">
        <select class="select" [ngModel]="subject()" (ngModelChange)="subject.set($event)" aria-label="Filter by subject">
          <option value="">All subjects</option>
          @for (s of subjects; track s.key) { <option [value]="s.key">{{ s.childEn }}</option> }
          <option value="none">No subject yet</option>
        </select>
        <select class="select" [ngModel]="level()" (ngModelChange)="level.set($event)" aria-label="Filter by reading level">
          <option value="">All levels</option>
          @for (lv of levels; track lv) { <option [value]="lv">{{ lv }}</option> }
        </select>
        <input class="input" type="search" placeholder="Search lessons" [ngModel]="q()" (ngModelChange)="q.set($event)" aria-label="Search lessons" />
      </div>
    </div>

    @if (shown().length) {
      <div class="grid">
        @for (l of shown(); track l.id) {
          <a class="card lesson" [routerLink]="['/app/lessons', l.id]">
            <div class="top">
              <span class="pill" [class.pill-teal]="l.status === 'published'" [class.pill-grey]="l.status === 'draft'">
                {{ l.status === 'published' ? 'Published v' + l.version : 'Draft' }}
              </span>
              <span class="small muted">{{ l.language }}</span>
            </div>
            <h2>{{ l.title || 'Untitled lesson' }}</h2>
            <p class="obj">{{ l.objective || 'No learning goal yet' }}</p>
            <div class="meta">
              <span class="lvl" [attr.data-level]="l.level">{{ l.level }}</span>
              @if (l.subject) {
                <span class="subj" [style.--main]="world(l.subject).main" [style.--tint]="world(l.subject).tint" [style.--deep]="world(l.subject).deep">
                  <img [src]="icon(world(l.subject).hero)" alt="" width="16" height="16" />{{ world(l.subject).childEn }}
                </span>
              } @else {
                <span class="subj need">Choose a subject</span>
              }
              <span class="small muted">{{ l.pages.length }} pages · {{ recorded(l.pages) }} recorded · {{ l.activities.length }} activities</span>
            </div>
            <div class="size">
              <div class="meter"><span [style.width.%]="pct(l)" [class.over]="data.packBytes(l) > limit"></span></div>
              <span class="small muted">{{ fmt(data.packBytes(l)) }} of 2 MB · updated {{ l.updatedAt | date: 'd MMM' }}</span>
            </div>
          </a>
        }
      </div>
    } @else {
      <div class="empty">
        <h2 class="serif">No lessons here yet</h2>
        <p>Make your first voice lesson. It takes about 15 minutes.</p>
        <a class="btn btn-primary" routerLink="/app/lessons/new" style="margin-top:14px">Create a lesson</a>
      </div>
    }
  `,
  styles: `
    .head-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .toast { margin-bottom: 18px; padding: 12px 16px; border-radius: var(--r-md); background: var(--mint); color: var(--teal-dark); }
    .section-title { font-family: var(--serif); font-size: 20px; margin: 4px 0 12px; }
    .units { display: grid; gap: 16px; margin-bottom: 28px; }
    .unit { display: grid; gap: 12px; }
    .unit.fresh { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(20, 107, 96, .12), var(--shadow); }
    .unit-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .unit h3 { font-family: var(--serif); font-size: 23px; margin: 0 0 4px; color: var(--title); }
    .trail { list-style: none; margin: 6px 0 0; padding: 22px 4px 6px; display: flex; gap: 6px; overflow-x: auto; border-radius: var(--r-md); }
    .trail li { flex: 1 0 108px; display: flex; justify-content: center; transform: translateY(var(--lift, 0)); position: relative; }
    .trail li:not(:last-child)::after { content: ""; position: absolute; top: 29px; left: calc(50% + 34px); right: calc(-50% + 34px); border-top: 2px dotted var(--line-strong); }
    .stop { display: grid; justify-items: center; gap: 4px; text-decoration: none; color: inherit; text-align: center; }
    .disc {
      width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; font: 700 20px var(--font);
      background: var(--surface); color: var(--muted); border: 2px solid var(--line-strong); transition: transform .15s, border-color .15s;
    }
    .stop:hover .disc { transform: translateY(-2px); border-color: var(--accent); }
    .stop.ready .disc { border-color: var(--accent); color: var(--accent); }
    .stop.live .disc { background: var(--accent); border-color: var(--accent); color: #fff; }
    .stop.cp .disc { color: #b8891f; }
    .stop.cp.live .disc { color: #f6cc59; }

    .cap { font-weight: 700; font-size: 14px; }
    .state { font-size: 12px; color: var(--muted); }
    .meter.wide { height: 8px; }
    @media (max-width: 700px) { .unit-head { flex-direction: column; } }
    .bar { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
    .seg { display: inline-flex; background: var(--white); border: 1px solid var(--line); border-radius: 999px; padding: 4px; }
    .seg button { border: 0; background: none; border-radius: 999px; padding: 8px 14px; font: 700 14px var(--font); color: var(--muted); cursor: pointer; }
    .seg button span { margin-left: 4px; opacity: .7; }
    .seg button.on { background: var(--accent-tint); color: var(--title); }
    .right { display: flex; gap: 10px; }
    .right .select { width: 150px; } .right .input { width: 220px; }
    .subj {
      display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px 2px 4px; border-radius: 999px; font-size: 12.5px; font-weight: 700;
      background: var(--tint); color: var(--deep); border: 1px solid color-mix(in srgb, var(--main) 30%, white); text-decoration: none; white-space: nowrap;
    }
    .subj img { width: 18px; height: 18px; object-fit: contain; }
    .subj.need { padding: 2px 9px; background: var(--warn-bg); color: var(--warn); border-color: #efd99a; }
    .unit-head .subj { margin: 2px 0 6px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .lesson { text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 10px; transition: border-color .15s, box-shadow .15s; }
    .lesson:hover { border-color: var(--accent-tint-2); box-shadow: var(--shadow-raise); }
    .top { display: flex; justify-content: space-between; align-items: center; }
    h2 { font-family: var(--serif); font-size: 22px; }
    .obj { color: var(--ink-2); font-size: 14px; flex: 1; }
    .meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .size { display: grid; gap: 6px; }
    .meter { height: 6px; border-radius: 999px; background: var(--cream-2); overflow: hidden; }
    .meter span { display: block; height: 100%; background: var(--teal); border-radius: inherit; }
    .meter span.over { background: var(--red); }
    @media (max-width: 700px) { .right { width: 100%; } .right .input, .right .select { flex: 1; width: auto; } }
  `,
})
export class Lessons {
  readonly data = inject(DataService);
  /** Set after an import, to highlight the new unit. */
  readonly unit = input<string>();
  readonly levels = LEVELS;
  readonly limit = PACK_LIMIT_BYTES;
  readonly fmt = formatBytes;
  readonly filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Drafts' },
    { id: 'published', label: 'Published' },
  ];
  readonly filter = signal<Filter>('all');
  readonly level = signal<Level | ''>('');
  readonly subject = signal('');
  readonly subjects = SUBJECTS;
  readonly world = subjectOf;
  readonly icon = subjectIcon;
  readonly q = signal('');

  readonly justCreated = computed(() => (this.unit() ? this.data.unit(this.unit()!) : undefined));

  readonly shownUnits = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.data
      .units()
      .filter((u) => !this.level() || u.level === this.level())
      .filter((u) => this.matchesSubject(u.subject))
      .filter((u) => !q || `${u.title} ${u.author ?? ''}`.toLowerCase().includes(q))
      .map((unit) => {
        const lessons = this.data.unitLessons(unit.id);
        return {
          unit,
          lessons,
          pages: lessons.reduce((s, l) => s + l.pages.length, 0),
          recorded: lessons.reduce((s, l) => s + this.recorded(l.pages), 0),
          published: lessons.filter((l) => l.status === 'published').length,
        };
      });
  });

  readonly shown = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.data
      .lessons()
      .filter((l) => !this.inUnit(l))
      .filter((l) => this.filter() === 'all' || l.status === this.filter())
      .filter((l) => !this.level() || l.level === this.level())
      .filter((l) => this.matchesSubject(l.subject))
      .filter((l) => !q || `${l.title} ${l.objective}`.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  });

  count(f: Filter): number {
    return this.data.lessons().filter((l) => !this.inUnit(l) && (f === 'all' || l.status === f)).length;
  }

  private matchesSubject(key: string | undefined): boolean {
    const f = this.subject();
    return !f || (f === 'none' ? !key : key === f);
  }

  private inUnit(l: Lesson): boolean {
    return !!l.unitId && !!this.data.unit(l.unitId);
  }

  /** A gentle zig-zag, like a path of stepping stones. */
  lift(i: number): number {
    return [0, -12, 4, -8][i % 4];
  }

  isRecorded(l: Lesson): boolean {
    return l.pages.length > 0 && l.pages.every((p) => p.audioId);
  }

  stateLabel(l: Lesson): string {
    if (l.status === 'published') return 'Published';
    if (this.isRecorded(l)) return 'Recorded';
    return `${this.recorded(l.pages)}/${l.pages.length} recorded`;
  }

  async removeUnit(u: Unit): Promise<void> {
    if (!confirm(`Delete the unit "${u.title}" and all its lessons and recordings? This cannot be undone.`)) return;
    await this.data.deleteUnit(u.id);
  }

  recorded(pages: { audioId?: string }[]): number {
    return pages.filter((p) => p.audioId).length;
  }

  pct(l: Parameters<DataService['packBytes']>[0]): number {
    return Math.min(100, (this.data.packBytes(l) / PACK_LIMIT_BYTES) * 100);
  }
}
