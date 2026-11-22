import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { local } from './storage';

/** The teacher workspace needs a signed-in staff member. The administrator is sent to /admin. */
export const signedInGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (!auth.signedIn()) return inject(Router).createUrlTree(['/sign-in'], { queryParams: { next: state.url } });
  return auth.isAdmin() ? inject(Router).createUrlTree(['/admin']) : true;
};

/** The administrator area: the AHA-wide administrator only. Teachers are sent to their workspace. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (!auth.signedIn()) return inject(Router).createUrlTree(['/sign-in'], { queryParams: { next: state.url } });
  return auth.isAdmin() ? true : inject(Router).createUrlTree(['/app']);
};

/** Signed-in staff skip the welcome and sign-in pages. */
export const signedOutGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.signedIn() ? inject(Router).createUrlTree([auth.home()]) : true;
};

/** First visit goes to the welcome pages; later visits go straight to sign-in. */
export const startRedirect: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  if (auth.signedIn()) return router.createUrlTree([auth.home()]);
  return router.createUrlTree([local.get<boolean>('welcomeSeen', false) ? '/sign-in' : '/welcome/1']);
};
