import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Splash } from './splash/splash';
import { playsIntro } from './splash/intro-policy';
import { ProcessingOverlay } from './shared/processing-overlay';
import { AuthService } from './core/auth.service';
import { session } from './core/storage';
import { environment } from '../environments/environment';

@Component({
  selector: 'pl-root',
  imports: [RouterOutlet, Splash, ProcessingOverlay],
  template: `
    <router-outlet />
    <!-- One loader for everything people do: it stays up while the page changes underneath. -->
    <pl-processing />
    @if (showSplash()) {
      <pl-splash (done)="splashDone()" />
    }
    @if (stage) {
      <div class="stage-ribbon" role="note">Staging · test accounts only</div>
    }
  `,
  styles: `
    .stage-ribbon {
      position: fixed; left: 50%; bottom: 0; transform: translateX(-50%); z-index: 2147483000; pointer-events: none;
      padding: 3px 12px; border-radius: 8px 8px 0 0; background: #7a5200; color: #fff;
      font: 700 11px/1.4 system-ui, sans-serif; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap;
    }
  `,
})
export class App {
  /** Private staging build: a small ribbon so nobody mistakes it for the real system. */
  readonly stage = environment.stage;

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
