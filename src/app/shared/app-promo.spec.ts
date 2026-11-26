import { describe, expect, it } from 'vitest';
import { appPage } from './app-promo';

describe('the tester app link', () => {
  it('points at the staging server, wherever the portal itself is hosted', () => {
    expect(appPage('https://104-64-192-245.sslip.io/api/v1')).toBe('https://104-64-192-245.sslip.io/get-the-app/');
    expect(appPage('https://staging-api.example.org/api/v1/')).toBe('https://staging-api.example.org/get-the-app/');
  });

  it('falls back to this site when there is no server address', () => {
    expect(appPage('')).toBe('/get-the-app/');
  });
});
