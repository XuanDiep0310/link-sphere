import { Routes } from '@angular/router';

export const SEARCH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/search/search.component').then(m => m.SearchComponent)
  }
];
