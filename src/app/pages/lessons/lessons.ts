import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { LEVELS, Level, PACK_LIMIT_BYTES, formatBytes } from '../../core/models';

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
      <a class="btn btn-primary" routerLink="/app/lessons/new">+ New lesson</a>
    </div>

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

  readonly shown = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.data
      .lessons()
      .filter((l) => this.filter() === 'all' || l.status === this.filter())
      .filter((l) => !this.level() || l.level === this.level())
      .filter((l) => !q || `${l.title} ${l.objective}`.toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  });

  count(f: Filter): number {
    return this.data.lessons().filter((l) => f === 'all' || l.status === f).length;
  }

  recorded(pages: { audioId?: string }[]): number {
    return pages.filter((p) => p.audioId).length;
  }

  pct(l: Parameters<DataService['packBytes']>[0]): number {
    return Math.min(100, (this.data.packBytes(l) / PACK_LIMIT_BYTES) * 100);
  }
}
