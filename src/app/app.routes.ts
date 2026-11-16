import { Routes } from '@angular/router';
import { signedInGuard, signedOutGuard, startRedirect } from './core/guards';
import { Shell } from './layout/shell';

const T = (title: string) => `${title} · Pocket Lessons`;

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [startRedirect], children: [] },
  {
    path: 'welcome/:step',
    canActivate: [signedOutGuard],
    title: T('Welcome'),
    loadComponent: () => import('./pages/welcome/welcome').then((m) => m.Welcome),
  },
  {
    path: 'sign-in',
    canActivate: [signedOutGuard],
    title: T('Sign in'),
    loadComponent: () => import('./pages/sign-in/sign-in').then((m) => m.SignIn),
  },
  {
    path: 'app',
    component: Shell,
    canActivate: [signedInGuard],
    children: [
      { path: '', title: T('Dashboard'), loadComponent: () => import('./pages/overview/overview').then((m) => m.Overview) },
      { path: 'lessons', title: T('Lessons'), loadComponent: () => import('./pages/lessons/lessons').then((m) => m.Lessons) },
      {
        path: 'lessons/import',
        title: T('Import a lesson file'),
        loadComponent: () => import('./pages/lesson-import/lesson-import').then((m) => m.LessonImport),
      },
      {
        path: 'lessons/:id',
        title: T('Lesson editor'),
        loadComponent: () => import('./pages/lesson-editor/lesson-editor').then((m) => m.LessonEditor),
      },
      { path: 'learners', title: T('Learners'), loadComponent: () => import('./pages/learners/learners').then((m) => m.Learners) },
      {
        path: 'learners/:id',
        title: T('Learner'),
        loadComponent: () => import('./pages/learner-detail/learner-detail').then((m) => m.LearnerDetail),
      },
      {
        path: 'assess',
        title: T('Check reading'),
        loadComponent: () => import('./pages/assess/assess').then((m) => m.Assess),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
