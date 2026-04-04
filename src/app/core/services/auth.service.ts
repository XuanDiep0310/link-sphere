import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User, LoginRequest, AuthResponse } from '../models/auth.model';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // State
  private _user = signal<User | null>(null);
  private _authStatus = signal<'loading' | 'authenticated' | 'unauthenticated'>('unauthenticated');

  // Selectors
  currentUser = this._user.asReadonly();
  isAuthenticated = computed(() => this._authStatus() === 'authenticated');
  isLoading = computed(() => this._authStatus() === 'loading');

  constructor() {
    this.checkSession();
  }

  login(credentials: LoginRequest) {
    this._authStatus.set('loading');
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, credentials).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.token);
        this._user.set(res.user);
        this._authStatus.set('authenticated');
        this.router.navigate(['/']);
      })
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    this._user.set(null);
    this._authStatus.set('unauthenticated');
    this.router.navigate(['/auth/login']);
  }

  private checkSession() {
    const token = localStorage.getItem('access_token');
    if (token) {
      // In real app: verify token with API
      this._authStatus.set('authenticated');
    }
  }
}
