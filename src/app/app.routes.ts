import { Routes } from '@angular/router';
import { adminGuard, signedInGuard, signedOutGuard, startRedirect } from './core/guards';
import { AdminShell } from './layout/admin-shell';
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
  {
    path: 'setup/:token',
    title: T('Set up your account'),
    loadComponent: () => import('./pages/setup/setup').then((m) => m.Setup),
  },
  {
    path: 'admin',
    component: AdminShell,
    canActivate: [adminGuard],
    children: [
      { path: '', title: T('Administrator'), loadComponent: () => import('./pages/admin/overview').then((m) => m.AdminOverviewPage) },
      { path: 'centers', title: T('Centers'), loadComponent: () => import('./pages/admin/centers').then((m) => m.AdminCentersPage) },
      { path: 'staff', title: T('Teachers and staff'), loadComponent: () => import('./pages/admin/staff').then((m) => m.AdminStaffPage) },
      { path: 'classes', title: T('Classes'), loadComponent: () => import('./pages/admin/classes').then((m) => m.AdminClassesPage) },
      { path: 'families', title: T('Parents and families'), loadComponent: () => import('./pages/admin/families').then((m) => m.AdminFamiliesPage) },
      { path: 'students', title: T('Students'), loadComponent: () => import('./pages/admin/students').then((m) => m.AdminStudentsPage) },
      {
        path: 'added-by-parents',
        title: T('Added by parents'),
        loadComponent: () => import('./pages/admin/parent-added').then((m) => m.AdminParentAddedPage),
      },
      { path: 'audit', title: T('Audit log'), loadComponent: () => import('./pages/admin/audit').then((m) => m.AdminAuditPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
