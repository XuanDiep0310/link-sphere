import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if ([401, 403].includes(error.status)) {
        // Handle unauthorized or forbidden errors
        // localStorage.removeItem('access_token');
        // router.navigate(['/auth/login']);
      }
      
      const errorMessage = error.error?.message || error.statusText;
      console.error('API Error:', errorMessage);
      return throwError(() => error);
    })
  );
};
