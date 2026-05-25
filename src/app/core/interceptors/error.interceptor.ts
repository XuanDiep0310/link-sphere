import { HttpInterceptorFn, HttpErrorResponse, HttpBackend, HttpClient } from '@angular/common/http';
import { catchError, throwError, switchMap } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const httpBackend = inject(HttpBackend);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // If unauthorized (401) and it's not the login or refresh endpoints
      if (error.status === 401 && !req.url.includes('/auth/login') && !req.url.includes('/token/refresh')) {
        const refresh = localStorage.getItem('refresh_token');
        if (refresh) {
          // Bypassed client to avoid interceptor loop
          const httpClient = new HttpClient(httpBackend);
          return httpClient.post<{ access: string }>(
            `${environment.apiUrl}/v1/auth/token/refresh/`, 
            { refresh }
          ).pipe(
            switchMap((res) => {
              localStorage.setItem('access_token', res.access);
              
              // Clone the request with the new access token and retry
              const retriedReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${res.access}`
                }
              });
              return next(retriedReq);
            }),
            catchError((refreshErr) => {
              // Refresh failed - clean up session and redirect to login
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('logged_in_username');
              localStorage.removeItem('logged_in_email');
              localStorage.removeItem('logged_in_bio');
              localStorage.removeItem('logged_in_avatar');
              router.navigate(['/auth/login']);
              return throwError(() => refreshErr);
            })
          );
        } else {
          // No refresh token available - clear access token and redirect
          localStorage.removeItem('access_token');
          router.navigate(['/auth/login']);
        }
      }
      
      const errorMessage = error.error?.message || error.statusText;
      console.error('API Error:', errorMessage);
      return throwError(() => error);
    })
  );
};
