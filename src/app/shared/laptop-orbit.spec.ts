import { describe, expect, it } from 'vitest';
import { ORBIT, laptopAngle, seatAt } from './laptop-orbit';

// The sign-in panel's two laptops take turns at the front of the ring, always the same way round.
describe('laptop orbit', () => {
  const half = ORBIT.hold + ORBIT.swap;
  const front = Math.PI / 2;

  it('starts with the teacher laptop at the front for 3 s, the other behind; then they swap places', () => {
    expect(ORBIT.hold).toBe(3);
    expect(laptopAngle(0, 0)).toBeCloseTo(front);
    expect(laptopAngle(0, 2.9)).toBeCloseTo(front); // still at the front
    expect(laptopAngle(1, 2.9)).toBeCloseTo(front + Math.PI - ORBIT.aside); // waiting behind, a little aside
    expect(laptopAngle(1, half + 1)).toBeCloseTo(front + 2 * Math.PI); // swapped: now at the front
    expect(laptopAngle(0, half + 1)).toBeCloseTo(front + Math.PI - ORBIT.aside); // and the first one waits behind
    expect(laptopAngle(0, 2 * half + 1)).toBeCloseTo(front + 2 * Math.PI); // back at the front
    expect(laptopAngle(0, 10, true)).toBeCloseTo(front); // reduced motion: the first one stays in front
  });

  it('always moves the same way round, and the two never meet', () => {
    for (const i of [0, 1]) {
      let last = -Infinity;
      for (let t = 0; t < 3 * half; t += 0.05) {
        const a = laptopAngle(i, t);
        expect(a).toBeGreaterThanOrEqual(last - 1e-9);
        last = a;
      }
    }
    for (let t = 0; t < 3 * half; t += 0.05) {
      const a = seatAt(laptopAngle(0, t));
      const b = seatAt(laptopAngle(1, t));
      expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(300); // never inside each other
    }
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
