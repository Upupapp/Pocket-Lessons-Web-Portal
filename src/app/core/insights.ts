/**
 * The numbers behind the workspace charts, worked out from the records the portal already has
 * (reading checks, learners, families, staff and the audit log). Pure functions, so they can be tested.
 */
import { CHART, WeekBucket, dayBuckets, dayIndex, weekBuckets, weekIndex } from '../shared/charts/chart-kit';
import type { DonutPart } from '../shared/charts/donut';
import type { LinePoint } from '../shared/charts/line-chart';
import type { SparkRow } from '../shared/charts/spark-list';
import type { StackRow } from '../shared/charts/stacked-bars';
import type { UpDownWeek } from '../shared/charts/updown-chart';
import type { AdminCenter, AdminFamily, AdminStaff, AdminStudent, AuditEntry } from './admin-models';
import { Assessment, LEVELS, Learner, daysSince, levelIndex } from './models';

const WEEKS = 12;

/** Each child's latest timed-reading speed in each of the last twelve weeks (null where there was none). */
export function weeklySpeeds(assessments: Assessment[], now = new Date()): Map<string, (number | null)[]> {
  const per = new Map<string, { at: string; v: number }[]>();
  for (const a of assessments) {
    if (a.type !== 'fluency' || typeof a.wcpm !== 'number') continue;
    const w = weekIndex(a.date, WEEKS, now);
    if (w < 0) continue;
    const slots = per.get(a.learnerId) ?? Array.from({ length: WEEKS }, () => ({ at: '', v: -1 }));
    if (a.date > slots[w].at) slots[w] = { at: a.date, v: a.wcpm };
    per.set(a.learnerId, slots);
  }
  return new Map([...per].map(([id, slots]) => [id, slots.map((s) => (s.v < 0 ? null : s.v))]));
}

/** The latest value minus the one about `back` weeks before it (the nearest earlier one), or null. */
export function changeOver(points: (number | null)[], back = 4): number | null {
  let last = -1;
  for (let i = points.length - 1; i >= 0; i--) if (points[i] !== null) { last = i; break; }
  if (last < 0) return null;
  for (let i = last - back; i >= 0; i--) if (points[i] !== null) return Math.round(points[last]! - points[i]!);
  return null;
}

export interface ClassSpeed {
  points: LinePoint[];
  /** How many children the line averages. */
  children: number;
  /** True when the line follows the same children every week. */
  sameChildren: boolean;
  change: number | null;
}

/**
 * The class's average reading speed per week. To keep the line honest it follows the same children
 * every week (those timed in at least 9 of the 12 weeks); with fewer than two such children it falls
 * back to every timed reading.
 */
export function classSpeed(speeds: Map<string, (number | null)[]>, weeks: WeekBucket[] = weekBuckets(WEEKS)): ClassSpeed {
  const all = [...speeds.values()];
  const steady = all.filter((p) => p.filter((v) => v !== null).length >= 9);
  const group = steady.length >= 2 ? steady : all;
  const values = weeks.map((_, w) => {
    const v = group.map((p) => p[w]).filter((x): x is number => x !== null);
    return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null;
  });
  return {
    points: weeks.map((wk, w) => ({ label: wk.label, long: wk.long, value: values[w] })),
    children: group.length,
    sameChildren: steady.length >= 2,
    change: changeOver(values),
  };
}

/** Level moves up and down in each of the last twelve weeks (reading-level checks that changed the level). */
export function levelMoves(assessments: Assessment[], weeks: WeekBucket[] = weekBuckets(WEEKS), now = new Date()): UpDownWeek[] {
  const out = weeks.map((wk) => ({ label: wk.label, long: wk.long, up: 0, down: 0 }));
  for (const a of assessments) {
    if (!a.previousLevel || a.previousLevel === a.level) continue;
    const w = weekIndex(a.date, weeks.length, now);
    if (w < 0) continue;
    if (levelIndex(a.level) > levelIndex(a.previousLevel)) out[w].up++;
    else out[w].down++;
  }
  return out;
}

/** How many learners had any check in the last `days` days. */
export function checkedWithin(learners: Learner[], assessments: Assessment[], days = 30): number {
  const recent = new Set(assessments.filter((a) => daysSince(a.date) <= days).map((a) => a.learnerId));
  return learners.filter((l) => recent.has(l.id)).length;
}

/** Learners by reading level, Beginner to Story, in the level ramp's colours. */
export function levelParts(learners: Learner[]): DonutPart[] {
  return LEVELS.map((level, i) => ({ name: level, value: learners.filter((l) => l.level === level).length, color: CHART.levels[i] }));
}

/** One row per child with timed readings, those who slowed down first. */
export function childSpeedRows(learners: Learner[], speeds: Map<string, (number | null)[]>): SparkRow[] {
  return learners
    .filter((l) => (speeds.get(l.id) ?? []).filter((v) => v !== null).length >= 2)
    .map((l) => {
      const points = speeds.get(l.id)!;
      const latest = [...points].reverse().find((v) => v !== null) ?? null;
      return { id: l.id, name: l.name, level: l.level, points, latest, change: changeOver(points) };
    })
    .sort((a, b) => (a.change ?? 999) - (b.change ?? 999) || a.name.localeCompare(b.name));
}

// ---------- Administrator ----------

/** Children at each center split by reading level, largest center first; centers with no children last. */
export function levelsByCenter(centers: AdminCenter[], students: AdminStudent[]): StackRow[] {
  return centers
    .map((c) => ({
      name: c.name,
      parts: LEVELS.map((lv) => students.filter((s) => s.centerId === c.id && !s.left && s.level === lv).length),
    }))
    .sort((a, b) => b.parts.reduce((s, v) => s + v, 0) - a.parts.reduce((s, v) => s + v, 0) || a.name.localeCompare(b.name));
}

/** Families whose phone is linked, still waiting with a code, or with no active code. */
export function familyPhoneParts(families: AdminFamily[]): DonutPart[] {
  const linked = families.filter((f) => f.activated).length;
  const waiting = families.filter((f) => !f.activated && f.codeWaiting).length;
  return [
    { name: 'Phone linked', value: linked, color: CHART.good },
    { name: 'Code waiting', value: waiting, color: CHART.waiting },
    { name: 'No active code', value: families.length - linked - waiting, color: CHART.off },
  ];
}

/** Teacher and staff accounts that are active, waiting for setup, or turned off (the list never includes administrators). */
export function staffParts(staff: AdminStaff[]): DonutPart[] {
  const off = staff.filter((s) => !s.active).length;
  const waiting = staff.filter((s) => s.active && s.setupPending).length;
  return [
    { name: 'Active', value: staff.length - off - waiting, color: CHART.good },
    { name: 'Waiting for setup', value: waiting, color: CHART.waiting },
    { name: 'Turned off', value: off, color: CHART.off },
  ];
}

/** Changes recorded in the audit log on each of the last `days` days. */
export function activityByDay(audit: AuditEntry[], days = 14, now = new Date()): LinePoint[] {
  const buckets = dayBuckets(days, now);
  const counts = buckets.map(() => 0);
  for (const e of audit) {
    const i = dayIndex(e.at, days, now);
    if (i >= 0) counts[i]++;
  }
  return buckets.map((b, i) => ({ label: b.label, long: b.long, value: counts[i] }));
}
