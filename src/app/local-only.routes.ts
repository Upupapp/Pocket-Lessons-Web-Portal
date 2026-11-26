import { Routes } from '@angular/router';

/**
 * Pages that exist only on the local server. The Netlify (production) and demo builds use this empty list;
 * `ng serve` swaps in local-only.routes.development.ts (see fileReplacements in angular.json),
 * so these pages are not even in the production bundle.
 */
export const LOCAL_ONLY_ROUTES: Routes = [];
