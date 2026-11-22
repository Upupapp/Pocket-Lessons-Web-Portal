import { describe, expect, it } from 'vitest';
import { EXTRA, ORBIT, TOTAL_MS, frame, geometry } from './splash-frame';

const measure = (s: string) => s.length * 13;

describe('intro timeline', () => {
  it('lays out the logo, the wordmark and the loading bar without overlapping, on a laptop and on a phone', () => {
    for (const [w, h] of [
      [1280, 800],
      [1366, 650],
      [390, 844],
      [360, 640],
    ]) {
      const g = geometry(w, h, measure(EXTRA));
      expect(g.wordLeft).toBeGreaterThanOrEqual(19);
      expect(g.wordLeft + g.wordW).toBeLessThanOrEqual(w - 19);
      expect(g.wordTop).toBeGreaterThan(g.cy + 78);
      expect(g.wordTop + g.wordH).toBeLessThan(h - 84 - 44 + 1);
    }
  });

  it('starts empty and ends with every letter in place and the yellow line typed out', () => {
    const g = geometry(1280, 800, measure(EXTRA));
    const start = frame(0, 0, g, 0, measure);
    expect(start.wordShow).toBe(false);
    expect(start.icon.show).toBe(false);
    expect(start.orbit.every((o) => o.opacity === 0)).toBe(true);

    const end = frame(TOTAL_MS, 0, g, 0, measure);
    expect(end.extra).toBe(EXTRA);
    expect(end.letters.every((l) => l.opacity === 1 && l.transform.startsWith('translate(0px, 0px)'))).toBe(true);
    expect(end.orbit).toHaveLength(ORBIT.length);
    expect(end.orbit.every((o) => o.opacity === 1)).toBe(true);
    expect(end.barAnim).toBe(1);
    expect(end.caret.show).toBe(false);
  });

  it('greys the scene when there is no connection', () => {
    const g = geometry(1280, 800, measure(EXTRA));
    const off = frame(TOTAL_MS, 0, g, 1, measure);
    expect(off.orbit[0].opacity).toBeCloseTo(0.4);
    expect(off.burst.opacity).toBeLessThan(0.05);
  });
});
