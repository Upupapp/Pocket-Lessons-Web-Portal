/**
 * When the intro plays. It only ever starts when the portal itself loads (the first visit, a refresh,
 * a hard refresh, or opening the address); moving between pages inside the portal never replays it.
 * - The first load in a browser session always plays it.
 * - Signed out, every page except a staff setup link ends on the welcome pages or sign-in, and those
 *   replay the intro on every load. Browsers can't tell a hard refresh from a normal one, so both do.
 * - Signed in (teacher and admin areas), a refresh goes straight back to the work.
 * - Never on the local server's app download page (/get-the-app): people open it on a phone just to install.
 */
export function playsIntro(path: string, seenThisSession: boolean, signedIn: boolean): boolean {
  if (path.startsWith('/get-the-app')) return false;
  if (!seenThisSession) return true;
  return !signedIn && !path.startsWith('/setup/');
}
