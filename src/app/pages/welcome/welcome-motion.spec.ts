import { describe, expect, it } from 'vitest';
import { PAGES, SUNBURST_PATH, WORDS, cardAt, colorsAt, dot, morphTargets, mix, rubber, say, settle } from './welcome-motion';

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

  it('knows where the sign-in page puts things, so the last page can turn into it', () => {
    // 1440 × 900: green panel 600 wide; the form card 440 wide, centred in the white part, about 141 px down.
    const wide = morphTargets(1440, 900, true);
    expect(wide.panel).toBe(600);
    expect(wide.card).toEqual({ x: 600, width: 840, top: 0 });
    expect(wide.form).toMatchObject({ x: 800, w: 440, h: 562 });
    expect(wide.form.y).toBeCloseTo(141, 0);
    expect(wide.logo).toEqual({ x: 40, y: 28, height: 60 });
    // A 390 px phone: a green header on top, the form card 20 px in from the sides under it.
    const phone = morphTargets(390, 844, false);
    expect(phone.card.top).toBe(262);
    expect(phone.form).toMatchObject({ x: 20, w: 350, y: 294 });
    expect(phone.logo).toEqual({ x: 20, y: 18, height: 60 });
    expect(morphTargets(320, 640, false).card.top).toBe(300); // the quote takes three lines there
  });
});
