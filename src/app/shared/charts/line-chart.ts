import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { CHART, CHART_STYLES, labelEvery, niceTicks } from './chart-kit';

export interface LinePoint {
  label: string;
  long: string;
  value: number | null;
}

const PAD = { l: 34, r: 14, t: 22, b: 26 };

/** A single-series line over time: hover or arrow keys show each value; gaps where nothing was recorded. */
@Component({
  selector: 'pl-line-chart',
  template: `
    <figure class="chart">
      <figcaption class="head">
        <div>
          <h2>{{ title() }}</h2>
          @if (caption()) { <p class="cap">{{ caption() }}</p> }
        </div>
        <div class="tools">
          <ng-content select="[aside]" />
          @if (hasData()) {
            <button type="button" class="tbl" (click)="table.set(!table())" [attr.aria-pressed]="table()">{{ table() ? 'Chart' : 'Table' }}</button>
          }
        </div>
      </figcaption>

      @if (!hasData()) {
        <p class="none">{{ empty() }}</p>
      } @else if (table()) {
        <div class="scroll">
          <table class="data">
            <thead><tr><th>{{ period() }}</th><th class="n">{{ valueName() }}</th></tr></thead>
            <tbody>
              @for (p of points(); track $index) {
                <tr><td>{{ p.long }}</td><td class="n">{{ p.value === null ? '—' : p.value }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="plot">
          <svg
            [attr.viewBox]="'0 0 ' + w() + ' ' + height()"
            [attr.height]="height()"
            role="img"
            [attr.aria-label]="summary()"
            tabindex="0"
            (pointermove)="move($event)"
            (pointerleave)="hover.set(-1)"
            (focus)="hover.set(lastIndex())"
            (blur)="hover.set(-1)"
            (keydown)="key($event)"
          >
            @for (t of ticks(); track t) {
              <line [attr.x1]="pad.l" [attr.x2]="w() - pad.r" [attr.y1]="y(t)" [attr.y2]="y(t)" [attr.stroke]="t === 0 ? c.axis : c.grid" stroke-width="1" />
              <text class="tick" [attr.x]="pad.l - 8" [attr.y]="y(t) + 4" text-anchor="end">{{ t }}</text>
            }
            @for (p of points(); track $index) {
              @if (labels().has($index)) {
                <text class="tick" [attr.x]="x($index)" [attr.y]="height() - 6" [attr.text-anchor]="$index === points().length - 1 ? 'end' : 'middle'">{{ p.label }}</text>
              }
            }
            <path [attr.d]="area()" [attr.fill]="c.wash" />
            <path [attr.d]="line()" fill="none" [attr.stroke]="c.accent" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
            @for (s of singles(); track s) {
              <circle [attr.cx]="x(s)" [attr.cy]="y(points()[s].value!)" r="3" [attr.fill]="c.accent" />
            }
            @if (hover() >= 0) {
              <line [attr.x1]="x(hover())" [attr.x2]="x(hover())" [attr.y1]="pad.t - 6" [attr.y2]="height() - pad.b" [attr.stroke]="c.axis" stroke-width="1" />
            }
            @if (end(); as e) {
              <circle [attr.cx]="x(e.i)" [attr.cy]="y(e.v)" r="5" [attr.fill]="c.accent" stroke="#fff" stroke-width="2" />
              @if (hover() < 0) {
                <text class="end" [attr.x]="x(e.i)" [attr.y]="y(e.v) - 12" text-anchor="end">{{ e.v }} {{ unit() }}</text>
              }
            }
            @if (hover() >= 0 && points()[hover()].value !== null) {
              <circle [attr.cx]="x(hover())" [attr.cy]="y(points()[hover()].value!)" r="5" [attr.fill]="c.accent" stroke="#fff" stroke-width="2" />
            }
          </svg>
          @if (hover() >= 0) {
            <div class="tip" [style.left.px]="tipX()" aria-hidden="true">
              <strong>{{ points()[hover()].value === null ? 'No reading' : points()[hover()].value + ' ' + unit() }}</strong>
              {{ points()[hover()].long }}
            </div>
          }
          <p class="sr" aria-live="polite">{{ spoken() }}</p>
        </div>
      }
    </figure>
  `,
  styles: [CHART_STYLES, `.end { font: 700 12.5px var(--font); fill: var(--ink); paint-order: stroke; stroke: #fff; stroke-width: 4px; }`],
})
export class LineChart {
  readonly title = input.required<string>();
  readonly caption = input('');
  readonly points = input.required<LinePoint[]>();
  readonly unit = input('');
  readonly valueName = input('Value');
  readonly period = input('Week');
  readonly height = input(210);
  readonly empty = input('Nothing recorded yet.');

  readonly c = CHART;
  readonly pad = PAD;
  readonly table = signal(false);
  readonly hover = signal(-1);
  readonly w = signal(560);

  readonly hasData = computed(() => this.points().filter((p) => p.value !== null).length > 0);
  readonly ticks = computed(() => niceTicks(Math.max(0, ...this.points().map((p) => p.value ?? 0)) * 1.08));
  readonly top = computed(() => this.ticks()[this.ticks().length - 1] || 1);
  readonly labels = computed(() => labelEvery(this.points().length, Math.max(2, Math.floor(this.w() / 86))));
  readonly lastIndex = computed(() => {
    const p = this.points();
    for (let i = p.length - 1; i >= 0; i--) if (p[i].value !== null) return i;
    return p.length - 1;
  });
  readonly end = computed(() => {
    const i = this.lastIndex();
    const v = this.points()[i]?.value;
    return v === null || v === undefined ? null : { i, v };
  });
  /** Points with no neighbour on either side get a small dot, so a lone reading still shows. */
  readonly singles = computed(() => {
    const p = this.points();
    return p
      .map((pt, i) => (pt.value !== null && (p[i - 1]?.value ?? null) === null && (p[i + 1]?.value ?? null) === null ? i : -1))
      .filter((i) => i >= 0 && i !== this.lastIndex());
  });
  readonly line = computed(() => this.segments().map((seg) => seg.map(([x, y], k) => `${k ? 'L' : 'M'}${x},${y}`).join('')).join(''));
  readonly area = computed(() => {
    const base = this.y(0);
    return this.segments()
      .filter((s) => s.length > 1)
      .map((s) => `M${s[0][0]},${base}` + s.map(([x, y]) => `L${x},${y}`).join('') + `L${s[s.length - 1][0]},${base}Z`)
      .join('');
  });
  readonly tipX = computed(() => Math.min(this.w() - 70, Math.max(70, this.x(Math.max(0, this.hover())))));
  readonly spoken = computed(() => {
    const p = this.points()[this.hover()];
    return p ? `${p.long}: ${p.value === null ? 'no reading' : p.value + ' ' + this.unit()}` : '';
  });
  readonly summary = computed(() => {
    const vals = this.points().filter((p) => p.value !== null).map((p) => p.value!);
    if (!vals.length) return this.title();
    const u = this.unit() ? ` ${this.unit()}` : '';
    return `${this.title()}. Latest ${vals[vals.length - 1]}${u}; highest ${Math.max(...vals)}${u}, lowest ${Math.min(...vals)}${u}. Use the left and right arrow keys to read each value, or open the table.`;
  });

  constructor() {
    const host = inject(ElementRef<HTMLElement>);
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const el = host.nativeElement as HTMLElement;
      const set = () => this.w.set(Math.max(260, Math.round(el.clientWidth)));
      set();
      if (typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(set);
      ro.observe(el);
      destroy.onDestroy(() => ro.disconnect());
    });
  }

  x(i: number): number {
    const n = this.points().length;
    return n <= 1 ? (PAD.l + this.w() - PAD.r) / 2 : PAD.l + (i / (n - 1)) * (this.w() - PAD.l - PAD.r);
  }

  y(v: number): number {
    return PAD.t + (1 - v / this.top()) * (this.height() - PAD.t - PAD.b);
  }

  private segments(): [number, number][][] {
    const out: [number, number][][] = [];
    let cur: [number, number][] = [];
    this.points().forEach((p, i) => {
      if (p.value === null) {
        if (cur.length) out.push(cur);
        cur = [];
      } else cur.push([Math.round(this.x(i) * 10) / 10, Math.round(this.y(p.value) * 10) / 10]);
    });
    if (cur.length) out.push(cur);
    return out;
  }

  move(e: PointerEvent): void {
    const svg = e.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * this.w();
    const n = this.points().length;
    const i = Math.round(((px - PAD.l) / (this.w() - PAD.l - PAD.r)) * (n - 1));
    this.hover.set(Math.min(n - 1, Math.max(0, i)));
  }

  key(e: KeyboardEvent): void {
    const n = this.points().length;
    const at = this.hover() < 0 ? this.lastIndex() : this.hover();
    const next = e.key === 'ArrowLeft' ? at - 1 : e.key === 'ArrowRight' ? at + 1 : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
    if (e.key === 'Escape') return this.hover.set(-1);
    if (next === null) return;
    e.preventDefault();
    this.hover.set(Math.min(n - 1, Math.max(0, next)));
  }
}
