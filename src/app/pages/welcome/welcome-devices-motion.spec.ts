import { describe, expect, it } from 'vitest';
import {
  LAPTOP_SCREENS,
  MOMENTS,
  NOTE_SPACE,
  PHONE_SCREENS,
  SET_H,
  SET_W,
  devicePose,
  laptopScreen,
  lessonChip,
  noteAt,
  noteText,
  phoneScreen,
  screenWeights,
} from './welcome-devices-motion';
import { cardAt } from './welcome-motion';

// The welcome pages' laptop and phone: one set of devices, three shots.
describe('welcome devices', () => {
  const W = 1440;
  const H = 900;

  it('stands beside the card on wide screens, clear of its wave, facing the words', () => {
    for (const pos of [0, 1, 2]) {
      const card = cardAt(pos, W);
      const p = devicePose(pos, true, W, H, card);
      const half = (SET_W / 2) * p.scale * 1.15; // with a little room for perspective
      const onLeft = card.x > 0; // the card on the right leaves the left side for the devices
      if (onLeft) expect(p.cx + half).toBeLessThan(card.x - 20);
      else expect(p.cx - half).toBeGreaterThan(card.x + card.width + 20);
      expect(Math.sign(p.yaw)).toBe(onLeft ? 1 : -1); // turned towards the card
      expect(Math.sign(p.phone.x)).toBe(onLeft ? 1 : -1); // the phone on the card's side
    }
  });

  it('glides under the card between pages and comes out on the other side', () => {
    const half = devicePose(0.5, true, W, H, cardAt(0.5, W));
    const c = cardAt(0.5, W);
    expect(half.cx).toBeGreaterThan(c.x);
    expect(half.cx).toBeLessThan(c.x + c.width); // hidden under the card halfway
    expect(Math.abs(half.yaw)).toBeLessThan(1); // facing straight on while it turns
    expect(half.scale).toBeLessThan(devicePose(0, true, W, H, cardAt(0, W)).scale); // a slight dolly
  });

  it('keeps the laptop and phone small on phones, fully in view, under the message card', () => {
    for (const [w, h] of [
      [320, 330],
      [360, 400],
      [390, 460],
      [768, 640],
    ]) {
      const p = devicePose(0, false, w, h, cardAt(0, w));
      const width = SET_W * p.scale * 1.15;
      expect(width).toBeLessThanOrEqual(Math.min(w * 0.66, 380) + 1); // two thirds of the width at most
      expect(p.cx - (SET_W / 2) * p.scale * 1.15).toBeGreaterThan(0);
      expect(p.cx + (SET_W / 2) * p.scale * 1.15).toBeLessThan(w);
      const top = p.cy - 360 * p.scale; // the lid's top edge
      const bottom = p.cy + 90 * p.scale; // the deck's front edge
      expect(top).toBeGreaterThan(NOTE_SPACE - 4);
      expect(bottom).toBeLessThan(h - 40); // clear of the card's wave
      expect(SET_H * p.scale).toBeLessThan(h);
    }
    // Much smaller than on a laptop-size screen.
    expect(devicePose(0, false, 390, 460, cardAt(0, 390)).scale).toBeLessThan(0.4);
  });

  it('plays page 2 as the portal does: upload, reading, creating, created; then the lesson on the phone', () => {
    const m = MOMENTS.make;
    expect(laptopScreen(1, 0)).toBe('upload');
    expect(laptopScreen(1, m.reading + 0.01)).toBe('reading');
    expect(laptopScreen(1, m.creating + 0.01)).toBe('creating');
    expect(laptopScreen(1, m.created + 0.01)).toBe('created');
    expect(phoneScreen(1, m.phone - 0.1)).toBe('path');
    expect(phoneScreen(1, m.phone + 0.1)).toBe('lesson');
    expect([0, 1, 2].map((k) => [laptopScreen(k, Infinity), phoneScreen(k, Infinity)])).toEqual([
      ['lessons', 'path'],
      ['created', 'lesson'],
      ['admin', 'done'],
    ]);
  });

  it('fades the upper of two screens, so a change never flashes the page behind', () => {
    const coming = screenWeights(LAPTOP_SCREENS, 'reading', 'upload', 0.09);
    expect(coming.upload).toBe(1);
    expect(coming.reading).toBeCloseTo(0.5);
    const going = screenWeights(LAPTOP_SCREENS, 'lessons', 'created', 0.09);
    expect(going.lessons).toBe(1);
    expect(going.created).toBeCloseTo(0.5);
    const done = screenWeights(PHONE_SCREENS, 'done', 'lesson', 5);
    expect(done).toEqual({ path: 0, lesson: 0, done: 1 });
  });

  it('has a message card for each page in both languages, after its moment', () => {
    expect(noteText(0, 'en').title).toBe('Saved on the phone');
    expect(noteText(0, 'fil').detail).toContain('Tuloy ang aral');
    expect(noteText(1, 'en').title).toBe('1 lesson created');
    expect(noteText(2, 'fil').title).toBe('Umakyat ng antas si Bea');
    expect(lessonChip('fil').detail).toContain('Bagong aralin');
    expect(noteAt(0)).toBeGreaterThan(MOMENTS.pocket.fly[1] - 0.5);
    expect(noteAt(1)).toBeGreaterThan(MOMENTS.make.created);
    expect(noteAt(2)).toBeGreaterThan(MOMENTS.shine.star[1] - 0.5);
  });
});
