import { describe, expect, it } from 'vitest';
import { ALL_ICONS, PAGES, WORDS, colorsAt, confetti, dot, mix, rubber, say, scene, settle } from './welcome-motion';

// The web welcome pages move like the phone's: colours blend, layers slide at different depths.
describe('welcome pages', () => {
  it('has the same three pages and colours as the phone, in both languages', () => {
    expect(PAGES.map((p) => p.bg[0])).toEqual(['#FFD66B', '#8CC7E8', '#9FDDB4']);
    expect(PAGES.map((p) => p.hero)).toEqual(['open-book', 'memo', 'trophy']);
    for (const p of PAGES) {
      expect(p.title[0]).not.toBe(p.title[1]);
      expect(p.body[1].length).toBeGreaterThan(20);
    }
    expect(say(WORDS.next, 'fil')).toBe('Susunod');
    expect(ALL_ICONS).toEqual(expect.arrayContaining(['open-book', 'memo', 'trophy', 'sun', 'girl', 'boy']));
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

  it('slides the layers at different speeds for depth, and keeps still with reduced motion', () => {
    const atRest = scene(1, 1, 1000, 800, 0.25);
    const halfway = scene(1, 0.5, 1000, 800, 0.25);
    expect(atRest.shift).toBe(0);
    expect(halfway.shift).toBe(500);
    // the hero moves a little more than the page, the orbit even more
    expect(halfway.hero.x - atRest.hero.x).toBeCloseTo(75, 0);
    expect(halfway.back[0].x - atRest.back[0].x).toBeCloseTo(300, 0);
    const still = scene(1, 0.5, 1000, 800, 0.25, true);
    expect(still.shift).toBe(0);
    expect(still.opacity).toBe(0.5);
    expect(still.hero.rotate).toBe(0);
  });

  it('draws the same confetti every time', () => {
    const a = confetti(0.4, 800, 600);
    const b = confetti(0.4, 800, 600);
    expect(a).toHaveLength(28);
    expect(a).toEqual(b);
  });
});
