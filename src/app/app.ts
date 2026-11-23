import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Splash } from './splash/splash';
import { playsIntro } from './splash/intro-policy';
import { AuthService } from './core/auth.service';
import { session } from './core/storage';

@Component({
  selector: 'pl-root',
  imports: [RouterOutlet, Splash],
  template: `
    <router-outlet />
    @if (showSplash()) {
      <pl-splash (done)="splashDone()" />
    }
  `,
})
export class App {
  /**
   * The intro plays when the portal loads: the first time in a browser session, and again on every refresh
   * of the welcome pages and sign-in (see intro-policy.ts). Moving around inside the portal never replays it.
   */
  readonly showSplash = signal(
    playsIntro(typeof location !== 'undefined' ? location.pathname : '/', session.get('splashSeen') === '1', inject(AuthService).signedIn()),
  );

  splashDone(): void {
    session.set('splashSeen', '1');
    this.showSplash.set(false);
  }
}
