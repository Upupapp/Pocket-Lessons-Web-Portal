import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { local } from './storage';

/** Pages inside the workspace need a signed-in staff member. */
export const signedInGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  return auth.signedIn() ? true : inject(Router).createUrlTree(['/sign-in'], { queryParams: { next: state.url } });
};

/** Signed-in staff skip the welcome and sign-in pages. */
export const signedOutGuard: CanActivateFn = () => {
  return inject(AuthService).signedIn() ? inject(Router).createUrlTree(['/app']) : true;
};

/** First visit goes to the welcome pages; later visits go straight to sign-in. */
export const startRedirect: CanActivateFn = () => {
  const router = inject(Router);
  if (inject(AuthService).signedIn()) return router.createUrlTree(['/app']);
  return router.createUrlTree([local.get<boolean>('welcomeSeen', false) ? '/sign-in' : '/welcome/1']);
};
