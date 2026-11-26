import { Routes } from '@angular/router';

/** `ng serve` only: pages for testing on this computer. Never part of the Netlify build. */
export const LOCAL_ONLY_ROUTES: Routes = [
  {
    // The Android test build of the mobile app: download it here, or scan the code with a phone on the same Wi-Fi.
    path: 'get-the-app',
    title: 'Get the Android app · Pocket Lessons',
    loadComponent: () => import('./pages/get-the-app/get-the-app').then((m) => m.GetTheApp),
  },
];
