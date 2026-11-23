import { describe, expect, it } from 'vitest';
import { playsIntro } from './intro-policy';

describe('when the intro plays', () => {
  it('plays on the first load of a browser session, wherever it starts', () => {
    expect(playsIntro('/welcome/1', false, false)).toBe(true);
    expect(playsIntro('/app/lessons', false, true)).toBe(true);
    expect(playsIntro('/setup/abc', false, false)).toBe(true);
  });

  it('plays again whenever the welcome pages or sign-in are loaded (refresh or hard refresh)', () => {
    expect(playsIntro('/welcome/2', true, false)).toBe(true);
    expect(playsIntro('/sign-in', true, false)).toBe(true);
    expect(playsIntro('/', true, false)).toBe(true); // opens on welcome or sign-in
    expect(playsIntro('/app/lessons', true, false)).toBe(true); // signed out: sent to sign-in
  });

  it('does not replay for a signed-in teacher or admin, or on a setup link', () => {
    expect(playsIntro('/app/lessons', true, true)).toBe(false);
    expect(playsIntro('/admin', true, true)).toBe(false);
    expect(playsIntro('/sign-in', true, true)).toBe(false); // sent back to their work
    expect(playsIntro('/setup/abc', true, false)).toBe(false);
  });
});
