import { Routes } from '@angular/router';
import { MainLayoutComponent } from './shared/components/main-layout/main-layout.component';
import { authGuard, noAuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadChildren: () => import('./features/post/post.routes').then(m => m.POST_ROUTES)
      },
      {
        path: 'search',
        loadChildren: () => import('./features/search/search.routes').then(m => m.SEARCH_ROUTES)
      },
      {
        path: 'notifications',
        loadChildren: () => import('./features/notification/notification.routes').then(m => m.NOTIFICATION_ROUTES)
      },
      {
        path: 'profile',
        loadChildren: () => import('./features/user/user.routes').then(m => m.USER_ROUTES)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
