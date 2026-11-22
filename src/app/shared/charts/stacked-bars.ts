import { Component, computed, input, signal } from '@angular/core';
import { CHART_STYLES, pct } from './chart-kit';

export interface StackRow {
  name: string;
  parts: number[];
}

/** Several wholes on one scale, each split into the same ordered parts (e.g. reading levels per center). */
@Component({
  selector: 'pl-stacked-bars',
  template: `
    <figure class="chart">
      <figcaption class="head">
        <div>
          <h2>{{ title() }}</h2>
          @if (caption()) { <p class="cap">{{ caption() }}</p> }
        </div>
        <div class="tools">
          <button type="button" class="tbl" (click)="table.set(!table())" [attr.aria-pressed]="table()">{{ table() ? 'Chart' : 'Table' }}</button>
        </div>
      </figcaption>

      <ul class="legend">
        @for (n of partNames(); track n; let i = $index) {
          <li><span class="sw" [style.background]="colors()[i]"></span>{{ n }}</li>
        }
      </ul>

      @if (table()) {
        <div class="scroll">
          <table class="data">
            <thead>
              <tr>
                <th>{{ rowName() }}</th>
                @for (n of partNames(); track n) { <th class="n">{{ n }}</th> }
                <th class="n">Total</th>
              </tr>
            </thead>
            <tbody>
              @for (r of rows(); track r.name) {
                <tr>
                  <td>{{ r.name }}</td>
                  @for (v of r.parts; track $index) { <td class="n">{{ v }}</td> }
                  <td class="n"><strong>{{ sum(r) }}</strong></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <ul class="rows">
          @for (r of rows(); track r.name; let ri = $index) {
            <li>
              <span class="nm">{{ r.name }}</span>
              @if (sum(r) === 0) {
                <span class="zero">{{ zeroText() }}</span>
              } @else {
                <div class="track">
                  <div class="bar" [style.width.%]="(sum(r) / max()) * 100">
                    @for (v of r.parts; track $index; let pi = $index) {
                      @if (v > 0) {
                        <span
                          class="seg"
                          tabindex="0"
                          [style.flex-grow]="v"
                          [style.background]="colors()[pi]"
                          [class.dim]="hot() && (hot()!.r !== ri || hot()!.p !== pi)"
                          [attr.aria-label]="r.name + ', ' + partNames()[pi] + ': ' + v + ' (' + share(v, r) + '%)'"
                          (pointerenter)="hot.set({ r: ri, p: pi })"
                          (pointerleave)="hot.set(null)"
                          (focus)="hot.set({ r: ri, p: pi })"
                          (blur)="hot.set(null)"
                        ></span>
                      }
                    }
                  </div>
                  <span class="tot">{{ sum(r) }}</span>
                </div>
                @if (hot()?.r === ri) {
                  <span class="peek" aria-hidden="true">
                    <span class="sw" [style.background]="colors()[hot()!.p]"></span>
                    <strong>{{ r.parts[hot()!.p] }}</strong> {{ partNames()[hot()!.p] }} · {{ share(r.parts[hot()!.p], r) }}%
                  </span>
                }
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
      .rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
      .rows li { display: grid; grid-template-columns: minmax(130px, 200px) minmax(0, 1fr); align-items: center; gap: 4px 14px; }
      .nm { font-size: 13.5px; font-weight: 700; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .track { display: flex; align-items: center; gap: 10px; min-width: 0; }
      .bar { display: flex; gap: 2px; height: 18px; min-width: 8px; }
      .seg { min-width: 4px; height: 100%; transition: opacity .15s; outline: none; }
      .seg:first-child { border-radius: 4px 0 0 4px; }
      .seg:last-child { border-radius: 0 4px 4px 0; }
      .seg:only-child { border-radius: 4px; }
      .seg:focus-visible { box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--ink); }
      .seg.dim { opacity: .3; }
      .tot { font-size: 13px; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
      .zero { font-size: 13px; color: var(--muted); }
      .peek { grid-column: 2; display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--muted); }
      .peek strong { color: var(--ink); }
      @media (max-width: 520px) { .rows li { grid-template-columns: 1fr; } .peek { grid-column: 1; } }
    `,
  ],
})
export class StackedBars {
  readonly title = input.required<string>();
  readonly caption = input('');
  readonly rows = input.required<StackRow[]>();
  readonly partNames = input.required<string[]>();
  readonly colors = input.required<readonly string[]>();
  readonly rowName = input('Name');
  readonly zeroText = input('None yet');

  readonly table = signal(false);
  readonly hot = signal<{ r: number; p: number } | null>(null);
  readonly max = computed(() => Math.max(1, ...this.rows().map((r) => this.sum(r))));

  sum(r: StackRow): number {
    return r.parts.reduce((s, v) => s + v, 0);
  }

  share(v: number, r: StackRow): number {
    return pct(v, this.sum(r));
  }
}
