import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionWatch } from './connection';

// The intro waits for a real answer from the server before it says "Connected".
let clock = 0;
const now = () => clock;
const ok = () => Promise.resolve(new Response('{"ok":true}', { status: 200 }));
const down = () => Promise.resolve(new Response('', { status: 503 }));
const unreachable = () => Promise.reject(new TypeError('Failed to fetch'));

async function advance(ms: number): Promise<void> {
  clock += ms;
  await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(() => {
  clock = 0;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('connection check', () => {
  it('is "preview" when there is no server address', () => {
    const w = new ConnectionWatch('');
    w.start();
    expect(w.state()).toBe('preview');
  });

  it('becomes "online" when /health answers', async () => {
    const fetch = vi.fn(ok);
    const w = new ConnectionWatch('http://api.test/api/v1', { fetch, now });
    w.start();
    await advance(0);
    expect(fetch).toHaveBeenCalledWith('http://api.test/api/v1/health', expect.objectContaining({ cache: 'no-store' }));
    expect(w.state()).toBe('online');
  });

  it('keeps trying while patient, then says the server is not answering', async () => {
    const fetch = vi.fn(unreachable);
    const w = new ConnectionWatch('http://api.test/api/v1', { fetch, now, isOnline: () => true, patienceMs: 10_000, retryMs: 2_000 });
    w.start();
    await advance(0);
    expect(w.state()).toBe('checking');
    await advance(8_000);
    expect(w.state()).toBe('checking');
    await advance(2_000);
    expect(w.state()).toBe('offline');
    expect(w.problem()).toBe('server');
    w.stop();
  });

  it('says there is no internet when the browser is offline, and recovers on "Try again"', async () => {
    let online = false;
    const fetch = vi.fn(ok);
    const w = new ConnectionWatch('http://api.test/api/v1', { fetch, now, isOnline: () => online, patienceMs: 0 });
    w.start();
    await advance(0);
    expect(w.state()).toBe('offline');
    expect(w.problem()).toBe('internet');
    expect(fetch).not.toHaveBeenCalled();
    online = true;
    w.retry();
    await advance(0);
    expect(w.state()).toBe('online');
  });

  it('keeps trying in the background once offline', async () => {
    let answer: () => Promise<Response> = down;
    const w = new ConnectionWatch('http://api.test/api/v1', { fetch: () => answer(), now, isOnline: () => true, patienceMs: 0, offlineRetryMs: 5_000 });
    w.start();
    await advance(0);
    expect(w.state()).toBe('offline');
    answer = ok;
    await advance(5_000);
    expect(w.state()).toBe('online');
  });
});
