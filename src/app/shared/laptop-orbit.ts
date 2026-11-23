/**
 * Two laptops taking turns at the front of a ring on the floor (the sign-in panel): one faces the viewer,
 * big enough to read its dashboard, while the other waits behind it, smaller; after a few seconds the one behind
 * comes round to the front along one side of the ring while the other goes round the other side to the back.
 * Always the same way round. Pure numbers, so it can be tested; brand-laptops.ts draws it.
 */

export const ORBIT = {
  /** Seconds the front laptop stays facing the viewer, then seconds to swap. */
  hold: 3,
  swap: 1.1,
  /** Half-width and half-depth of the path, in laptop units (a laptop is 550 wide). */
  rx: 300,
  rz: 260,
  /** How far a laptop turns while passing a side, in degrees (none at the front). */
  yaw: 20,
  /** The front one a little bigger, the back one a little smaller, for depth. */
  depth: 0.18,
  /** The one waiting behind stands a little to the side (radians round the ring) and higher, so it peeks out. */
  aside: 0.5,
  lift: 90,
} as const;

const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const FRONT = Math.PI / 2;

/** The k-th resting place of a laptop, counted round the ring: even = at the front, odd = waiting behind. */
const restAt = (k: number) => FRONT + k * Math.PI - (k % 2 ? ORBIT.aside : 0);

/**
 * The two laptops' clock (times in seconds). The one in front rests for 3 s, then they swap round the ring.
 * Asked for one laptop (`want`), the clock brings it to the front (one swap if it is behind) and keeps it there
 * until it is let go; then it rests a full 3 s before taking turns again. Laptop 0 starts in front.
 */
export class OrbitClock {
  /** Swaps done: even = laptop 0 in front, odd = laptop 1. */
  step = 0;
  private swapping = false;
  private since = 0;
  private wanted: number | null = null;

  /** `still`: reduced motion, laptop 0 stays in front. */
  constructor(private readonly still = false) {}

  /** The laptop in front (when resting). */
  get front(): number {
    return this.step % 2;
  }

  /** Keeps the current rest from counting, while the panel cannot be seen yet. */
  wait(now: number): void {
    if (!this.swapping) this.since = now;
  }

  /** Moves the clock on to `now`; `want` is the laptop to bring to the front and keep there, or null to take turns. */
  advance(now: number, want: number | null = null): void {
    if (want !== this.wanted) {
      if (want === null && !this.swapping) this.since = now; // let go: the one in front still gets its full rest
      this.wanted = want;
    }
    if (this.still) return;
    if (this.swapping && now - this.since >= ORBIT.swap) {
      this.step++;
      this.swapping = false;
      this.since = now;
    }
    if (!this.swapping && (want === null ? now - this.since >= ORBIT.hold : this.front !== want)) {
      this.swapping = true;
      this.since = now;
    }
  }

  /** Laptop i's place on the ring at `now` (radians; π/2 = in front, 3π/2 = behind, 0 and π = the sides). */
  angle(i: number, now: number): number {
    const e = this.swapping ? easeInOutCubic(Math.min(1, Math.max(0, (now - this.since) / ORBIT.swap))) : 0;
    const a = restAt(this.step + i);
    return a + (restAt(this.step + i + 1) - a) * e;
  }
}

export interface Seat {
  /** Across (negative = left), up (negative = higher) and towards the viewer (positive = in front), in laptop units. */
  x: number;
  y: number;
  z: number;
  /** Turn in degrees: positive faces right. */
  yaw: number;
  scale: number;
}

/** Where a laptop stands at a place on the ring: facing the viewer at the front, turned at the sides, higher behind. */
export function seatAt(theta: number): Seat {
  const depth = Math.sin(theta); // 1 at the front, -1 behind
  return {
    x: -ORBIT.rx * Math.cos(theta),
    y: -ORBIT.lift * Math.max(0, -depth),
    z: ORBIT.rz * depth,
    yaw: ORBIT.yaw * Math.cos(theta),
    scale: 1 + ORBIT.depth * depth,
  };
}
