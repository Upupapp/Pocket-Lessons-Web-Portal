import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { LEVELS, Lesson, Level, PACK_LIMIT_BYTES, Unit, formatBytes } from '../../core/models';

type Filter = 'all' | 'draft' | 'published';

/** Lesson library (WEB-05). */
@Component({
  selector: 'pl-lessons',
  imports: [RouterLink, FormsModule, DatePipe],
  template: `
    <div class="page-head">
      <div>
        <p class="eyebrow">Create</p>
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
        <strong>"{{ u.title }}" is ready as drafts.</strong> Next: open Part 1 and record your voice on each page.
      </div>
    }

    @if (shownUnits().length) {
      <h2 class="section-title">Story units</h2>
      <div class="units">
        @for (u of shownUnits(); track u.unit.id) {
          <section class="card unit" [class.fresh]="u.unit.id === unit()">
            <div class="unit-head">
              <div>
                <p class="eyebrow">{{ u.unit.level }} · {{ u.unit.language }}@if (u.unit.sourceLabel) { · {{ u.unit.sourceLabel }} }</p>
                <h3>{{ u.unit.title }}</h3>
                <p class="small muted">
                  @if (u.unit.author) { by {{ u.unit.author }} · }
                  {{ u.lessons.length }} circles · {{ u.recorded }} of {{ u.pages }} pages recorded · {{ u.published }} published
                </p>
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
              <span class="pill pill-sun">{{ l.level }}</span>
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
    .unit.fresh { border-color: var(--teal); box-shadow: 0 0 0 3px rgba(20, 107, 96, .15), var(--shadow); }
    .unit-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .unit h3 { font-family: var(--serif); font-size: 24px; margin: 2px 0; }
    .trail { list-style: none; margin: 6px 0 0; padding: 22px 4px 6px; display: flex; gap: 6px; overflow-x: auto; background: linear-gradient(180deg, #f4fbf2, transparent); border-radius: var(--r-md); }
    .trail li { flex: 1 0 108px; display: flex; justify-content: center; transform: translateY(var(--lift, 0)); position: relative; }
    .trail li:not(:last-child)::after { content: ""; position: absolute; top: 30px; left: calc(50% + 36px); right: calc(-50% + 36px); border-top: 4px dotted #c9d6d2; }
    .stop { display: grid; justify-items: center; gap: 4px; text-decoration: none; color: inherit; text-align: center; }
    .disc { width: 62px; height: 62px; border-radius: 50%; display: grid; place-items: center; font: 700 22px var(--font); background: #e8e1d1; color: var(--muted); box-shadow: inset 0 -6px 0 rgba(0,0,0,.12); transition: transform .12s; }
    .stop:hover .disc { transform: translateY(-3px); }
    .stop.ready .disc { background: #1d8577; color: #fff; }
    .stop.live .disc { background: var(--teal); color: #fff; }
    .stop.cp .disc { background: var(--sun-soft); color: #c99b2e; }
    .stop.cp.ready .disc, .stop.cp.live .disc { background: var(--sun); color: #8a5a00; }
    .cap { font-weight: 700; font-size: 14px; }
    .state { font-size: 12px; color: var(--muted); }
    .meter.wide { height: 8px; }
    @media (max-width: 700px) { .unit-head { flex-direction: column; } }
    .bar { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
    .seg { display: inline-flex; background: var(--white); border: 1px solid var(--line); border-radius: 999px; padding: 4px; }
    .seg button { border: 0; background: none; border-radius: 999px; padding: 8px 14px; font: 700 14px var(--font); color: var(--muted); cursor: pointer; }
    .seg button span { margin-left: 4px; opacity: .7; }
    .seg button.on { background: var(--teal); color: #fff; }
    .right { display: flex; gap: 10px; }
    .right .select { width: 150px; } .right .input { width: 220px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .lesson { text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 10px; transition: transform .12s, box-shadow .12s; }
    .lesson:hover { transform: translateY(-2px); box-shadow: 0 14px 30px -16px rgba(22, 60, 59, .45); }
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
  readonly q = signal('');

  readonly justCreated = computed(() => (this.unit() ? this.data.unit(this.unit()!) : undefined));

  readonly shownUnits = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.data
      .units()
      .filter((u) => !this.level() || u.level === this.level())
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
      .filter((l) => !q || `${l.title} ${l.objective}`.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  });

  count(f: Filter): number {
    return this.data.lessons().filter((l) => !this.inUnit(l) && (f === 'all' || l.status === f)).length;
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
