import { HttpInterceptorFn, HttpErrorResponse, HttpBackend, HttpClient } from '@angular/common/http';
import { catchError, throwError, switchMap, Observable, shareReplay, finalize, map } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

// Single-flight refresh: when many requests 401 at the same time, they must
// share ONE refresh call instead of each firing their own (which storms the
// server and, with rotating refresh tokens, makes all but the first fail).
let refreshInFlight$: Observable<string> | null = null;

function clearSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('logged_in_username');
  localStorage.removeItem('logged_in_email');
  localStorage.removeItem('logged_in_bio');
  localStorage.removeItem('logged_in_avatar');
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const httpBackend = inject(HttpBackend);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthCall = req.url.includes('/auth/login') || req.url.includes('/token/refresh');

      // Only attempt recovery for 401 on non-auth endpoints
      if (error.status !== 401 || isAuthCall) {
        return throwError(() => error);
      }

      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) {
        // No way to recover — clean up and bounce to login
        clearSession();
        router.navigate(['/auth/login']);
        return throwError(() => error);
      }

      // Start a refresh if one isn't already running; otherwise reuse it.
      if (!refreshInFlight$) {
        // Bypass interceptors to avoid an infinite loop
        const rawHttp = new HttpClient(httpBackend);
        refreshInFlight$ = rawHttp.post<{ access: string }>(
          `${environment.apiUrl}/v1/auth/token/refresh/`,
          { refresh }
        ).pipe(
          map(res => {
            localStorage.setItem('access_token', res.access);
            return res.access;
          }),
          catchError(refreshErr => {
            // Refresh failed for everyone — clear session and redirect once
            clearSession();
            router.navigate(['/auth/login']);
            return throwError(() => refreshErr);
          }),
          // Reset so the next 401 (after this batch) can refresh again
          finalize(() => { refreshInFlight$ = null; }),
          // All concurrent 401s subscribe to the SAME refresh result
          shareReplay(1)
        );
      }

      return refreshInFlight$.pipe(
        switchMap(newToken => {
          const retriedReq = req.clone({
            setHeaders: { Authorization: `Bearer ${newToken}` }
          });
          return next(retriedReq);
        })
      );
    })
  );
};
