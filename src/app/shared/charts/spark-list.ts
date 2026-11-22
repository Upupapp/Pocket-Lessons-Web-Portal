import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CHART, CHART_STYLES } from './chart-kit';

export interface SparkRow {
  id: string;
  name: string;
  level: string;
  /** One value per week, oldest first; null where there was no timed reading. */
  points: (number | null)[];
  latest: number | null;
  /** Change against about four weeks earlier; null when there is nothing to compare. */
  change: number | null;
}

const SW = 132;
const SH = 34;

/** Each child's reading speed as a small line, with the latest value and how much it moved. */
@Component({
  selector: 'pl-spark-list',
  imports: [RouterLink],
  template: `
    <figure class="chart">
      <figcaption class="head">
        <div>
          <h2>{{ title() }}</h2>
          @if (caption()) { <p class="cap">{{ caption() }}</p> }
        </div>
        <div class="tools">
          @if (rows().length) {
            <button type="button" class="tbl" (click)="table.set(!table())" [attr.aria-pressed]="table()">{{ table() ? 'Chart' : 'Table' }}</button>
          }
        </div>
      </figcaption>
      @if (!rows().length) {
        <p class="none">{{ empty() }}</p>
      } @else if (table()) {
        <div class="scroll">
          <table class="data">
            <thead><tr><th>Child</th><th>Level</th><th class="n">Latest</th><th class="n">Change</th></tr></thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr>
                  <td>{{ r.name }}</td>
                  <td>{{ r.level }}</td>
                  <td class="n">{{ r.latest ?? '—' }}</td>
                  <td class="n">{{ r.change === null ? '—' : (r.change > 0 ? '+' : '') + r.change }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <ul class="rows">
          @for (r of rows(); track r.id) {
            <li>
              <a class="who" [routerLink]="['/app/learners', r.id]">
                <strong>{{ r.name }}</strong>
                <span>{{ r.level }}</span>
              </a>
              <svg class="spark" [attr.viewBox]="'0 0 ' + sw + ' ' + sh" [attr.width]="sw" [attr.height]="sh" role="img" [attr.aria-label]="aria(r)">
                <line x1="0" [attr.x2]="sw" [attr.y1]="sh - 1" [attr.y2]="sh - 1" [attr.stroke]="c.grid" stroke-width="1" />
                <path [attr.d]="path(r.points)" fill="none" [attr.stroke]="c.quiet" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
                @if (last(r.points); as e) {
                  <circle [attr.cx]="e.x" [attr.cy]="e.y" r="4" [attr.fill]="c.accent" stroke="#fff" stroke-width="2" />
                }
              </svg>
              <span class="now">{{ r.latest ?? '—' }} <small>{{ unit() }}</small></span>
              @if (r.change === null) {
                <span class="chg flat">—</span>
              } @else {
                <span class="chg" [class.up]="r.change > 0" [class.down]="r.change < 0" [class.flat]="r.change === 0">
                  @if (r.change > 0) {
                    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 11 9.5H1z" fill="currentColor" /></svg>
                  } @else if (r.change < 0) {
                    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10.5 1 2.5h10z" fill="currentColor" /></svg>
                  }
                  {{ r.change > 0 ? '+' : '' }}{{ r.change }}
                </span>
              }
            </li>
          }
        </ul>
      }
    </figure>
  `,
  styles: [
    CHART_STYLES,
    `
      .rows { list-style: none; margin: 0; padding: 0; display: grid; }
      .rows li {
        display: grid; grid-template-columns: minmax(130px, 210px) minmax(${SW}px, 1fr) 76px 64px; align-items: center; gap: 14px;
        padding: 9px 4px; border-bottom: 1px solid var(--line);
      }
      .rows li:last-child { border-bottom: 0; }
      .who { display: grid; min-width: 0; text-decoration: none; }
      .who strong { color: var(--ink); font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .who:hover strong { color: var(--accent); }
      .who span { font-size: 12.5px; color: var(--muted); }
      .spark { display: block; width: ${SW}px; }
      .now { font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; text-align: right; white-space: nowrap; }
      .now small { font-weight: 400; color: var(--muted); font-size: 12px; }
      .chg {
        justify-self: end; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px;
        font-size: 12.5px; font-weight: 700; font-variant-numeric: tabular-nums;
      }
      .chg.up { background: var(--good-bg); color: var(--good); }
      .chg.down { background: var(--bad-bg); color: var(--bad); }
      .chg.flat { background: #eef1ee; color: var(--muted); }
      @media (max-width: 520px) {
        .rows li { grid-template-columns: minmax(0, 1fr) 84px auto auto; gap: 8px; }
        .spark { width: 84px; height: auto; }
        .now { font-size: 14px; }
      }
    `,
  ],
})
export class SparkList {
  readonly title = input.required<string>();
  readonly caption = input('');
  readonly rows = input.required<SparkRow[]>();
  readonly unit = input('wcpm');
  readonly empty = input('No timed readings yet.');

  readonly c = CHART;
  readonly sw = SW;
  readonly sh = SH;
  readonly table = signal(false);
  /** Each line uses that child's own range, at least 12 words tall, so small wobbles are not blown up. */
  private xy(points: (number | null)[], i: number, v: number): { x: number; y: number } {
    const n = Math.max(2, points.length);
    const vals = points.filter((p): p is number => p !== null);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const span = Math.max(12, hi - lo);
    const floor = (lo + hi) / 2 - span / 2;
    return { x: 4 + (i / (n - 1)) * (SW - 8), y: 4 + (1 - (v - floor) / span) * (SH - 9) };
  }

  path(points: (number | null)[]): string {
    let d = '';
    let pen = false;
    points.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      const { x, y } = this.xy(points, i, v);
      d += `${pen ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      pen = true;
    });
    return d;
  }

  last(points: (number | null)[]): { x: number; y: number } | null {
    for (let i = points.length - 1; i >= 0; i--) {
      const v = points[i];
      if (v !== null) return this.xy(points, i, v);
    }
    return null;
  }

  aria(r: SparkRow): string {
    const change = r.change === null ? '' : r.change > 0 ? `, up ${r.change}` : r.change < 0 ? `, down ${-r.change}` : ', no change';
    return `${r.name}: ${r.latest ?? 'no'} ${this.unit()} now${change} against four weeks ago`;
  }
}
