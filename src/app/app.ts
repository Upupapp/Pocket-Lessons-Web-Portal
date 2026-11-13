import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Splash } from './splash/splash';
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
  /** The intro plays once per browser session, then gets out of the way. */
  readonly showSplash = signal(session.get('splashSeen') !== '1');

  splashDone(): void {
    session.set('splashSeen', '1');
    this.showSplash.set(false);
  }
}
