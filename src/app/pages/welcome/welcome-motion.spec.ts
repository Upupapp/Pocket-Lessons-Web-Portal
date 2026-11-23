import { describe, expect, it } from 'vitest';
import { PAGES, SUNBURST_PATH, WORDS, cardAt, colorsAt, dot, mix, rubber, say, settle, windowClip } from './welcome-motion';

// The web welcome pages move like the phone's: colours blend, dots stretch, the card glides across.
describe('welcome pages', () => {
  it('has the same three pages and colours as the phone, in both languages', () => {
    expect(PAGES.map((p) => p.bg[0])).toEqual(['#FFD66B', '#8CC7E8', '#9FDDB4']);
    for (const p of PAGES) {
      expect(p.title[0]).not.toBe(p.title[1]);
      expect(p.body[1].length).toBeGreaterThan(20);
    }
    expect(say(WORDS.next, 'fil')).toBe('Susunod');
    expect(say(WORDS.back, 'fil')).toBe('Bumalik');
    // Page 2 tells teachers they can upload a lesson file, in both languages.
    expect(say(PAGES[1].body, 'en')).toMatch(/^Upload a lesson file/);
    expect(say(PAGES[1].body, 'fil')).toMatch(/^Mag-upload ng file ng aralin/);
    expect(SUNBURST_PATH.match(/M/g)).toHaveLength(18);
  });

  it('blends the page colours halfway between pages', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('rgb(128, 128, 128)');
    expect(colorsAt(0).top).toBe('rgb(255, 214, 107)');
    expect(colorsAt(2).top).toBe('rgb(159, 221, 180)');
    const half = colorsAt(0.5).top;
    expect(half).not.toBe(colorsAt(0).top);
    expect(half).not.toBe(colorsAt(1).top);
  });

  it('stretches the dot of the page coming in', () => {
    const accent = colorsAt(1).accent;
    expect(dot(1, 1, accent).width).toBe(32);
    expect(dot(0, 1, accent).width).toBe(10);
    expect(dot(1, 0.5, accent).width).toBe(21);
  });

  it('turns the page on a flick or a long drag, never more than one page at a time', () => {
    expect(settle(0.1, 0, 0)).toBe(0); // small drag: back where it was
    expect(settle(0.3, 0, 0)).toBe(1); // dragged far enough
    expect(settle(0.05, 0, -3)).toBe(1); // quick flick to the left
    expect(settle(1.9, 1, -10)).toBe(2); // never skips past one page
    expect(settle(2.3, 2, 0)).toBe(2); // last page stays last
    expect(rubber(-0.4)).toBeCloseTo(-0.14);
    expect(rubber(2.4)).toBeCloseTo(2.14);
  });

  it('on wide screens, puts the card right, left, right and glides it across between pages', () => {
    const w = 1880; // card 800 wide, 1080 for the pictures
    expect(cardAt(0, w)).toMatchObject({ width: 800, travel: 1080, x: 1080, opacity: 1 });
    expect(cardAt(1, w).x).toBe(0);
    expect(cardAt(2, w).x).toBe(1080);
    expect(cardAt(0.5, w).x).toBe(540); // halfway across
    expect(cardAt(1.25, w).x).toBe(270); // heading back to the right
    expect(cardAt(-0.2, w).x).toBe(1080); // a drag past page 1 leaves the card where it is
    expect(cardAt(0, 700).width).toBe(400); // never narrower than 400 px
  });

  it('with reduced motion, fades the card out and back on the other side instead of sliding', () => {
    const w = 1880;
    expect(cardAt(0.3, w, true)).toMatchObject({ x: 1080, opacity: expect.closeTo(0.4, 5) });
    expect(cardAt(0.7, w, true)).toMatchObject({ x: 0, opacity: expect.closeTo(0.4, 5) });
    expect(cardAt(1, w, true)).toMatchObject({ x: 0, opacity: 1 });
  });

  it('cuts the window along the card’s wave: down its left edge on wide screens, across its top on phones', () => {
    // 1440 × 900, card from x = 827: the wave starts 45 px left of the card and ends at x = 810 at the bottom.
    expect(windowClip(true, 1440, 900, 827, 0)).toBe(
      "path('M0,0 L814,0 C782,198 828,378 806,558 C788,702 794,810 810,900 L0,900 Z')",
    );
    // A 390 px phone, card from y = 545: the wave runs from 34 px above the card's top to 6 px below it.
    const narrow = windowClip(false, 390, 844, 0, 545);
    expect(narrow.startsWith("path('M0,0 L390,0 L390,")).toBe(true);
    expect(narrow.endsWith(" Z')")).toBe(true);
    const ys = [...narrow.matchAll(/,(\d+(?:\.\d)?)/g)].map((m) => Number(m[1])).slice(2);
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(545 - 34);
      expect(y).toBeLessThanOrEqual(545 + 6);
    }
  });
});
