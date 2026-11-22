import { describe, expect, it } from 'vitest';
import type { AdminFamily, AdminStaff, AuditEntry } from './admin-models';
import { activityByDay, changeOver, checkedWithin, childSpeedRows, classSpeed, familyPhoneParts, levelMoves, levelParts, staffParts, weeklySpeeds } from './insights';
import { Assessment, Learner, LEVELS } from './models';
import { LEVEL_ORDER, baselineLevel, sampleHistory, sampleMove } from './sample-history';

const DAY = 86_400_000;
const now = new Date('2026-11-22T10:00:00Z');
const ago = (d: number) => new Date(now.getTime() - d * DAY).toISOString();
const timed = (learnerId: string, d: number, wcpm: number): Assessment => ({
  id: `a_${learnerId}_${d}`,
  learnerId,
  type: 'fluency',
  date: ago(d),
  level: 'Word',
  previousLevel: 'Word',
  wcpm,
  accuracy: 90,
  note: '',
  by: 'Ana',
});
const move = (learnerId: string, d: number, from: Assessment['level'], to: Assessment['level']): Assessment => ({
  id: `m_${learnerId}_${d}`,
  learnerId,
  type: 'placement',
  date: ago(d),
  level: to,
  previousLevel: from,
  note: '',
  by: 'Ana',
});

describe('teacher chart numbers', () => {
  it('keeps the latest timed reading of each child in each week', () => {
    const speeds = weeklySpeeds([timed('a', 1, 20), timed('a', 3, 18), timed('a', 80, 9), timed('a', 200, 1)], now);
    const a = speeds.get('a')!;
    expect(a).toHaveLength(12);
    expect(a[11]).toBe(20); // the later of the two readings this week
    expect(a[0]).toBe(9);
    expect(a.filter((v) => v !== null)).toHaveLength(2); // the reading 200 days ago is outside the twelve weeks
  });

  it('measures change against about four weeks earlier', () => {
    expect(changeOver([10, null, 12, 13, 14, 15, 18])).toBe(6);
    expect(changeOver([null, null, 30])).toBeNull();
    expect(changeOver([20, null, null, null, null, 17])).toBe(-3);
  });

  it('follows the same children each week when it can', () => {
    const steady = Array.from({ length: 12 }, (_, w) => 20 + w);
    const speeds = new Map<string, (number | null)[]>([
      ['a', steady],
      ['b', steady.map((v) => v + 10)],
      ['c', [null, null, null, null, null, null, null, null, null, null, 60, 61]], // joined late: left out
    ]);
    const s = classSpeed(speeds);
    expect(s.sameChildren).toBe(true);
    expect(s.children).toBe(2);
    expect(s.points[11].value).toBe(36);
    expect(s.change).toBe(4);
  });

  it('counts level moves up and down by week, and children checked in 30 days', () => {
    const checks = [move('a', 2, 'Letter', 'Word'), move('b', 3, 'Paragraph', 'Word'), move('c', 40, 'Beginner', 'Letter'), timed('d', 5, 20)];
    const weeks = levelMoves(checks, undefined, now);
    expect(weeks[11]).toMatchObject({ up: 1, down: 1 });
    expect(weeks.reduce((s, w) => s + w.up + w.down, 0)).toBe(3);
    // "Checked in the last 30 days" counts from today's real date.
    const real = (d: number) => new Date(Date.now() - d * DAY).toISOString();
    const recent = [{ ...move('a', 0, 'Letter', 'Word'), date: real(2) }, { ...timed('b', 0, 20), date: real(29) }, { ...timed('c', 0, 20), date: real(45) }];
    const learners = ['a', 'b', 'c', 'd'].map((id) => ({ id }) as Learner);
    expect(checkedWithin(learners, recent, 30)).toBe(2);
  });

  it('splits learners by level in level order and lists slower children first', () => {
    const learners = [
      { id: 'a', name: 'Ana', level: 'Word' },
      { id: 'b', name: 'Ben', level: 'Word' },
      { id: 'c', name: 'Cora', level: 'Story' },
    ] as Learner[];
    expect(levelParts(learners).map((p) => p.value)).toEqual([0, 0, 2, 0, 1]);
    const speeds = new Map<string, (number | null)[]>([
      ['a', [10, 11, 12, 13, 14, 20]],
      ['b', [30, 30, 30, 30, 28, 25]],
    ]);
    expect(childSpeedRows(learners, speeds).map((r) => r.name)).toEqual(['Ben', 'Ana']);
  });
});

describe('administrator chart numbers', () => {
  it('sorts families and accounts into their states', () => {
    const fam = (activated: boolean, codeWaiting: boolean) => ({ activated, codeWaiting }) as AdminFamily;
    expect(familyPhoneParts([fam(true, false), fam(false, true), fam(false, false), fam(false, true)]).map((p) => p.value)).toEqual([1, 2, 1]);
    const st = (active: boolean, setupPending: boolean) => ({ active, setupPending }) as AdminStaff;
    expect(staffParts([st(true, false), st(true, true), st(false, false), st(false, true)]).map((p) => p.value)).toEqual([1, 1, 2]);
  });

  it('counts audit entries per day for the last two weeks', () => {
    const at = (h: number) => ({ at: new Date(now.getTime() - h * 3_600_000).toISOString() }) as AuditEntry;
    const days = activityByDay([at(1), at(2), at(30), at(24 * 20)], 14, now);
    expect(days).toHaveLength(14);
    expect(days[13].value).toBe(2);
    expect(days.reduce((s, d) => s + (d.value ?? 0), 0)).toBe(3);
  });
});

describe('sample history', () => {
  const learners = ['Word', 'Letter', 'Beginner', 'Paragraph', 'Letter', 'Word', 'Story', 'Beginner', 'Word', 'Paragraph', 'Letter', 'Word'].map((level, i) => ({ id: `lrn_seed_${i + 1}`, level }));
  const history = sampleHistory(learners);

  it('ends every child at their current level, with records that agree with each other', () => {
    learners.forEach((l, i) => {
      const own = history.filter((h) => h.learnerId === l.id).sort((a, b) => a.daysAgo - b.daysAgo);
      if (!own.length) return;
      expect(own[0].level).toBe(l.level);
      const m = sampleMove(i, l.level);
      for (const h of own) {
        const expected = m && h.daysAgo > m.day ? m.from : l.level;
        expect(h.level).toBe(expected);
      }
      expect(LEVEL_ORDER).toContain(baselineLevel(i, l.level) as never);
    });
  });

  it('times only children who read words or more, with matching numbers', () => {
    for (const h of history.filter((x) => x.type === 'fluency')) {
      expect(LEVELS.indexOf(h.level as never)).toBeGreaterThanOrEqual(2);
      const correct = h.wordsTotal! - h.missedIndexes!.length;
      expect(h.wcpm).toBe(Math.round((correct / h.seconds!) * 60));
      expect(h.missedIndexes!.every((i) => i >= 0 && i < h.wordsTotal!)).toBe(true);
    }
    expect(history.length).toBeGreaterThan(60);
  });
});
