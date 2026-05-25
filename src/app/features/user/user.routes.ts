import { Routes } from '@angular/router';

export const USER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: ':username',
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent)
  }
];
