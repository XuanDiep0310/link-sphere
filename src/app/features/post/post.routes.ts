import { Routes } from '@angular/router';

export const POST_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/feed/feed.component').then(m => m.FeedComponent)
  },
  {
    path: 'explore',
    loadComponent: () => import('./pages/feed/explore.component').then(m => m.ExploreComponent)
  },
  {
    path: 'posts/:id',
    loadComponent: () => import('./pages/post-detail/post-detail.component').then(m => m.PostDetailComponent)
  }
];
