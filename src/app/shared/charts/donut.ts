import { Component, computed, input, signal } from '@angular/core';
import { CHART_STYLES, pct } from './chart-kit';

export interface DonutPart {
  name: string;
  value: number;
  color: string;
}

const C = 84;
const R1 = 70;
const R0 = 50;

/** A whole split into a few parts. Hover or focus a part to read it in the middle; the legend lists every number. */
@Component({
  selector: 'pl-donut',
  template: `
    <figure class="chart">
      <figcaption class="head">
        <div>
          <h2>{{ title() }}</h2>
          @if (caption()) { <p class="cap">{{ caption() }}</p> }
        </div>
      </figcaption>
      @if (total() === 0) {
        <p class="none">{{ empty() }}</p>
      } @else {
        <div class="body">
          <svg viewBox="0 0 168 168" width="168" height="168" role="group" [attr.aria-label]="title() + ': ' + total() + ' ' + unitFor(total())">
            @for (s of sectors(); track s.i) {
              <path
                [attr.d]="s.d"
                [attr.fill]="s.color"
                [class.dim]="active() >= 0 && active() !== s.i"
                tabindex="0"
                role="img"
                [attr.aria-label]="s.aria"
                (pointerenter)="active.set(s.i)"
                (pointerleave)="active.set(-1)"
                (focus)="active.set(s.i)"
                (blur)="active.set(-1)"
              />
            }
            <text x="84" y="84" text-anchor="middle" class="big">{{ centerValue() }}</text>
            <text x="84" y="104" text-anchor="middle" class="small">{{ centerLabel() }}</text>
          </svg>
          <ul class="list">
            @for (p of parts(); track p.name; let i = $index) {
              <li [class.on]="active() === i" (pointerenter)="active.set(i)" (pointerleave)="active.set(-1)">
                <span class="sw" [style.background]="p.color"></span>
                <span class="nm">{{ p.name }}</span>
                <span class="v">{{ p.value }}</span>
                <span class="pc">{{ share(p.value) }}%</span>
              </li>
            }
          </ul>
        </div>
      }
    </figure>
  `,
  styles: [
    CHART_STYLES,
    `
      .body { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
      svg { width: 168px; flex: none; }
      path { transition: opacity .15s; outline: none; cursor: default; }
      path:focus-visible { stroke: var(--ink); stroke-width: 2; }
      path.dim { opacity: .3; }
      .big { font: 600 28px var(--font); fill: var(--ink); }
      .small { font: 12.5px var(--font); fill: var(--muted); }
      .list { flex: 1 1 150px; min-width: 0; list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
      .list li { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto 44px; align-items: center; gap: 10px; padding: 5px 8px; border-radius: 8px; font-size: 13.5px; transition: background .12s; }
      .list li.on { background: var(--surface-2); }
      .nm { color: var(--ink-2); line-height: 1.3; }
      .v { font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; text-align: right; }
      .pc { color: var(--muted); font-variant-numeric: tabular-nums; text-align: right; }
    `,
  ],
})
export class DonutChart {
  readonly title = input.required<string>();
  readonly caption = input('');
  readonly parts = input.required<DonutPart[]>();
  /** What the parts count, e.g. "learners", and the word for just one ("learner"). */
  readonly unit = input('');
  readonly one = input('');
  readonly empty = input('Nothing to show yet.');

  readonly active = signal(-1);
  readonly total = computed(() => this.parts().reduce((s, p) => s + p.value, 0));
  readonly centerValue = computed(() => (this.active() >= 0 ? this.parts()[this.active()].value : this.total()));
  readonly centerLabel = computed(() => (this.active() >= 0 ? this.parts()[this.active()].name : this.unitFor(this.total())));

  readonly sectors = computed(() => {
    const parts = this.parts();
    const total = this.total();
    const live = parts.filter((p) => p.value > 0).length;
    const gap = live > 1 ? 1 / ((R0 + R1) / 2) : 0; // 1px each side: a 2px surface gap between parts
    let a = 0;
    return parts
      .map((p, i) => {
        const span = (p.value / total) * Math.PI * 2;
        const a0 = a;
        a += span;
        if (p.value <= 0) return null;
        return {
          i,
          color: p.color,
          d: live === 1 ? ring() : sector(a0 + gap, a0 + span - gap),
          aria: `${p.name}: ${p.value} ${this.unitFor(p.value)} (${pct(p.value, total)}%)`,
        };
      })
      .filter((s): s is { i: number; color: string; d: string; aria: string } => s !== null);
  });

  share(v: number): number {
    return pct(v, this.total());
  }

  unitFor(n: number): string {
    return n === 1 && this.one() ? this.one() : this.unit();
  }
}

const pt = (r: number, a: number) => `${(C + r * Math.sin(a)).toFixed(2)},${(C - r * Math.cos(a)).toFixed(2)}`;

/** An annular sector from angle a0 to a1 (radians, 0 at the top, clockwise). */
function sector(a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${pt(R1, a0)}A${R1},${R1} 0 ${large} 1 ${pt(R1, a1)}L${pt(R0, a1)}A${R0},${R0} 0 ${large} 0 ${pt(R0, a0)}Z`;
}

/** The whole ring, for a single part. */
function ring(): string {
  return `M${C},${C - R1}A${R1},${R1} 0 1 1 ${C - 0.01},${C - R1}ZM${C},${C - R0}A${R0},${R0} 0 1 0 ${C + 0.01},${C - R0}Z`;
}
