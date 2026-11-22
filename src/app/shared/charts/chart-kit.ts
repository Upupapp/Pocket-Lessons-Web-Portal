/**
 * Shared pieces for the workspace charts: the colours (checked with the data-viz palette validator),
 * week buckets, tick maths and the common chart chrome.
 */

/** Chart colours. The ordinal level ramp, the up/down pair and the state set passed the palette checks. */
export const CHART = {
  accent: '#146b60',
  wash: 'rgba(20, 107, 96, 0.10)',
  track: '#e3eee8',
  grid: '#e8ece8',
  axis: '#c9d1cc',
  quiet: '#9aa7a1',
  up: '#08704f',
  down: '#ef8d60',
  good: '#08704f',
  waiting: '#e0a21b',
  off: '#7e8a84',
  /** Beginner → Story, light to dark (one hue, monotone lightness). */
  levels: ['#86bfa9', '#5da58c', '#3b8a70', '#216f57', '#0f5241'],
} as const;

export interface WeekBucket {
  /** Short label for the axis, e.g. "8 Sep" or "This week". */
  label: string;
  /** Long label for tooltips and tables, e.g. "Week of 8 Sep". */
  long: string;
}

const DAY = 86_400_000;
const short = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The last `n` weeks, oldest first. Week 0 ends n weeks ago; the last one is this week (the last 7 days). */
export function weekBuckets(n = 12, now = new Date()): WeekBucket[] {
  return Array.from({ length: n }, (_, i) => {
    const ago = n - 1 - i;
    const start = new Date(now.getTime() - (7 * ago + 6) * DAY);
    return ago === 0 ? { label: 'This week', long: 'This week' } : { label: short(start), long: `Week of ${short(start)}` };
  });
}

/** Which of the last `n` weekly buckets a date falls in (0 = oldest), or -1 when outside. */
export function weekIndex(dateIso: string, n = 12, now = new Date()): number {
  const days = Math.floor((now.getTime() - new Date(dateIso).getTime()) / DAY);
  if (days < 0 || days >= 7 * n) return -1;
  return n - 1 - Math.floor(days / 7);
}

/** Daily buckets for the last `n` days, oldest first (the last one is today). */
export function dayBuckets(n = 14, now = new Date()): WeekBucket[] {
  return Array.from({ length: n }, (_, i) => {
    const ago = n - 1 - i;
    const d = new Date(now.getTime() - ago * DAY);
    const wd = d.toLocaleDateString('en-GB', { weekday: 'short' });
    return ago === 0 ? { label: 'Today', long: `Today, ${short(d)}` } : { label: short(d), long: `${wd}, ${short(d)}` };
  });
}

export function dayIndex(dateIso: string, n = 14, now = new Date()): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const t = new Date(dateIso).getTime();
  const days = Math.floor((start.getTime() + DAY - 1 - t) / DAY);
  if (t > now.getTime() + 60_000 || days < 0 || days >= n) return -1;
  return n - 1 - days;
}

/** Round axis ticks from 0 up past `max` (about four steps of 1, 2 or 5 × 10ⁿ). */
export function niceTicks(max: number, steps = 4): number[] {
  const top = Math.max(1, max);
  const raw = top / steps;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step * 0.001; v += step) ticks.push(Math.round(v * 1000) / 1000);
  if (ticks[ticks.length - 1] < top) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/** Which x positions get a label: about `max` evenly spaced ones, always the last. */
export function labelEvery(count: number, max: number): Set<number> {
  const keep = new Set<number>();
  if (count <= 0) return keep;
  const step = Math.max(1, Math.ceil(count / Math.max(1, max)));
  for (let i = count - 1; i >= 0; i -= step) keep.add(i);
  return keep;
}

export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** Chart chrome shared by every chart component: title row, table toggle, tooltip, legend, table. */
export const CHART_STYLES = `
  :host { display: block; min-width: 0; }
  .chart { margin: 0; display: grid; gap: 14px; }
  .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 8px 12px; }
  .head > div:first-child { flex: 1 1 240px; min-width: 0; }
  .head h2 { font-family: var(--serif); font-size: 19px; line-height: 1.25; color: var(--title); margin: 0; }
  .cap { margin-top: 3px; font-size: 13px; color: var(--muted); max-width: 60ch; }
  .tools { display: flex; align-items: center; gap: 8px; flex: none; }
  .tbl {
    min-height: 30px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface);
    color: var(--muted); font: 700 12.5px var(--font); cursor: pointer; transition: border-color .15s, color .15s;
  }
  .tbl:hover { border-color: var(--accent); color: var(--accent); }
  .plot { position: relative; }
  .plot svg { display: block; width: 100%; overflow: visible; }
  .plot svg:focus { outline: none; }
  .plot svg:focus-visible { outline: 2px solid var(--accent); outline-offset: 4px; border-radius: 6px; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .tick { font: 11.5px var(--font); fill: var(--faint); font-variant-numeric: tabular-nums; }
  .tip {
    position: absolute; top: 0; z-index: 3; pointer-events: none; transform: translateX(-50%);
    min-width: 120px; max-width: 220px; padding: 8px 10px; border-radius: 10px; background: var(--surface);
    border: 1px solid var(--line); box-shadow: 0 8px 24px -10px rgba(20, 27, 24, .28); font-size: 12.5px; color: var(--muted);
  }
  .tip strong { display: block; font-size: 15px; color: var(--ink); font-variant-numeric: tabular-nums; }
  .tip .row { display: flex; align-items: center; gap: 6px; }
  .key { width: 12px; height: 3px; border-radius: 2px; flex: none; }
  .legend { display: flex; flex-wrap: wrap; gap: 6px 16px; margin: 0; padding: 0; list-style: none; font-size: 12.5px; color: var(--ink-2); }
  .legend li { display: inline-flex; align-items: center; gap: 6px; }
  .sw { width: 10px; height: 10px; border-radius: 3px; flex: none; }
  table.data { width: 100%; border-collapse: collapse; font-size: 13px; }
  table.data th { text-align: left; font-size: 12px; color: var(--muted); font-weight: 700; padding: 6px 8px; border-bottom: 1px solid var(--line); }
  table.data td { padding: 6px 8px; border-bottom: 1px solid var(--line); font-variant-numeric: tabular-nums; color: var(--ink); }
  table.data td.n, table.data th.n { text-align: right; }
  .scroll { max-height: 280px; overflow: auto; }
  .none { padding: 28px 12px; text-align: center; color: var(--muted); font-size: 13.5px; border: 1px dashed var(--line-strong); border-radius: 10px; }
`;
