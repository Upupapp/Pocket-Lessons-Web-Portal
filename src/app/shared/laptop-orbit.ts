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
 * Laptop i's place on the ring at t seconds (radians; π/2 = at the front, 3π/2 = behind, 0 and π = passing the
 * left and right sides). Laptop 0 starts at the front and laptop 1 behind; every swap moves both on round the ring,
 * the same way, to the other's place.
 */
export function laptopAngle(i: number, t: number, reduced = false): number {
  if (reduced || t <= 0) return restAt(i);
  const half = ORBIT.hold + ORBIT.swap;
  const n = Math.floor(t / half);
  const f = t - n * half;
  const e = f < ORBIT.hold ? 0 : easeInOutCubic((f - ORBIT.hold) / ORBIT.swap);
  return restAt(n + i) + (restAt(n + i + 1) - restAt(n + i)) * e;
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
