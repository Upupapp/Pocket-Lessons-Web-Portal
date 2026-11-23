import { describe, expect, it } from 'vitest';
import { ORBIT, OrbitClock, seatAt } from './laptop-orbit';

// The sign-in panel's two laptops take turns at the front of the ring, always the same way round.
describe('laptop orbit', () => {
  const front = Math.PI / 2;
  /** Runs a clock from 0 to `until` in small steps, as the screen would. */
  const run = (clock: OrbitClock, from: number, until: number, want: number | null = null) => {
    for (let t = from; t <= until + 1e-9; t += 0.02) clock.advance(t, want);
  };

  it('starts with the teacher laptop at the front for 3 s, the other behind; then they swap places', () => {
    const c = new OrbitClock();
    run(c, 0, 2.9);
    expect(c.front).toBe(0);
    expect(c.angle(0, 2.9)).toBeCloseTo(front);
    expect(c.angle(1, 2.9)).toBeCloseTo(front + Math.PI - ORBIT.aside); // waiting behind, a little aside
    run(c, 2.92, ORBIT.hold + ORBIT.swap + 0.2);
    expect(c.front).toBe(1); // swapped
    expect(c.angle(1, ORBIT.hold + ORBIT.swap + 0.2)).toBeCloseTo(front + 2 * Math.PI);
  });

  it('brings a chosen laptop to the front and keeps it there, then takes turns again after a full rest', () => {
    const c = new OrbitClock();
    run(c, 0, 4.5); // the other one is in front now
    expect(c.front).toBe(1);
    run(c, 4.52, 6, 0); // "Join with invitation": the teacher's laptop is asked for
    expect(c.front).toBe(0);
    run(c, 6.02, 20, 0); // and it stays
    expect(c.front).toBe(0);
    run(c, 20.02, 22.9, null); // let go: still 3 s at the front
    expect(c.front).toBe(0);
    run(c, 22.92, 24.5, null);
    expect(c.front).toBe(1);
  });

  it('always moves the same way round, and the two never meet', () => {
    const c = new OrbitClock();
    const last = [-Infinity, -Infinity];
    for (let t = 0; t < 14; t += 0.02) {
      c.advance(t, t > 6 && t < 9 ? 0 : null);
      for (const i of [0, 1]) {
        const a = c.angle(i, t);
        expect(a).toBeGreaterThanOrEqual(last[i] - 1e-9);
        last[i] = a;
      }
      const p = seatAt(c.angle(0, t));
      const q = seatAt(c.angle(1, t));
      expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThan(300); // never inside each other
    }
  });

  it('keeps still with reduced motion, the teacher laptop in front', () => {
    const c = new OrbitClock(true);
    run(c, 0, 12);
    expect(c.front).toBe(0);
    expect(c.angle(0, 12)).toBeCloseTo(front);
  });

  it('shows the front one straight on and bigger; the other behind, smaller, higher and to the side', () => {
    const f = seatAt(front);
    expect(Math.abs(f.x)).toBeLessThan(1e-9);
    expect(Math.abs(f.yaw)).toBeLessThan(1e-9); // the dashboard reads clearly
    expect(f.scale).toBeCloseTo(1 + ORBIT.depth);
    expect(Math.abs(f.y)).toBe(0); // on the floor
    const b = seatAt(front + Math.PI - ORBIT.aside);
    expect(b.z).toBeLessThan(-200);
    expect(b.scale).toBeLessThan(1);
    expect(b.y).toBeLessThan(-60); // higher, so it peeks over the front one
    expect(b.x).toBeGreaterThan(100); // and to the side
  });
});
