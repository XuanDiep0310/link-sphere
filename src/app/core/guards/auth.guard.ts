import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isAuthenticated()) {
    return true;
  }
  
  // If no token in storage, redirect to login
  const token = localStorage.getItem('access_token');
  if (token) {
    return true;
  }
  
  return router.createUrlTree(['/auth/login']);
};

export const noAuthGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (!authService.isAuthenticated() && !localStorage.getItem('access_token')) {
    return true;
  }
  
  return router.createUrlTree(['/']);
};
