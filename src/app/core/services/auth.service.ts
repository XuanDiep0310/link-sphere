import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User, LoginRequest } from '../models/auth.model';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { of } from 'rxjs';

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
    
    const payload = {
      username: credentials.username || '',
      password: credentials.password
    };

    return this.http.post<{ success: boolean; message: string; data?: { access: string; refresh: string } }>(`${environment.apiUrl}/v1/auth/login/`, payload).pipe(
      tap({
        next: (res) => {
          if (res.success && res.data) {
            localStorage.setItem('access_token', res.data.access);
            localStorage.setItem('refresh_token', res.data.refresh);
            
            // Determine email and username details
            const loginName = payload.username || 'johndoe';
            const username = loginName.includes('@') ? loginName.split('@')[0] : loginName;
            const email = loginName.includes('@') ? loginName : `${loginName}@linksphere.com`;
            
            localStorage.setItem('logged_in_username', username);
            localStorage.setItem('logged_in_email', email);
            
            this._user.set({
              id: '1',
              email: email,
              username: username,
              bio: localStorage.getItem('logged_in_bio') || '',
              avatarUrl: localStorage.getItem('logged_in_avatar') || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              followersCount: 0,
              followingCount: 0
            });
            
            this._authStatus.set('authenticated');
            this.router.navigate(['/']);

            // Load user profile details in the background
            this.loadUserProfile().subscribe({
              error: (err) => console.warn('Failed to load full profile after login:', err)
            });
          }
        },
        error: (err) => {
          this._authStatus.set('unauthenticated');
          console.error('Login error:', err);
        }
      })
    );
  }

  register(payload: { username: string; email: string; password?: string; bio?: string; avatar?: string }) {
    this._authStatus.set('loading');
    return this.http.post<{ success: boolean; message: string; data?: any }>(`${environment.apiUrl}/v1/users/register/`, payload).pipe(
      tap({
        next: (res) => {
          this._authStatus.set('unauthenticated');
          if (res.success && res.data) {
            // Save registered details so login can pull them
            localStorage.setItem('logged_in_username', res.data.username);
            localStorage.setItem('logged_in_email', res.data.email);
            if (res.data.bio) localStorage.setItem('logged_in_bio', res.data.bio);
            if (res.data.avatar) localStorage.setItem('logged_in_avatar', res.data.avatar);
          }
        },
        error: (err) => {
          this._authStatus.set('unauthenticated');
          console.error('Registration error:', err);
        }
      })
    );
  }

  refreshToken() {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return of(null);

    return this.http.post<{ access: string }>(`${environment.apiUrl}/v1/auth/token/refresh/`, { refresh }).pipe(
      tap(res => {
        localStorage.setItem('access_token', res.access);
      })
    );
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('logged_in_username');
    localStorage.removeItem('logged_in_email');
    localStorage.removeItem('logged_in_bio');
    localStorage.removeItem('logged_in_avatar');
    this._user.set(null);
    this._authStatus.set('unauthenticated');
    this.router.navigate(['/auth/login']);
  }

  loadUserProfile() {
    return this.http.get<{ success: boolean; data?: any }>(`${environment.apiUrl}/v1/users/profile/`).pipe(
      tap({
        next: (res) => {
          if (res.success && res.data) {
            const user = res.data;
            localStorage.setItem('logged_in_username', user.username);
            localStorage.setItem('logged_in_email', user.email);
            if (user.bio) localStorage.setItem('logged_in_bio', user.bio);
            if (user.avatar) localStorage.setItem('logged_in_avatar', user.avatar);
            
            this._user.set({
              id: String(user.id),
              email: user.email,
              username: user.username,
              bio: user.bio || 'Social explorer',
              avatarUrl: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              followersCount: user.followers_count || 0,
              followingCount: user.following_count || 0
            });
          }
        }
      })
    );
  }

  updateCurrentUser(updates: Partial<User>) {
    const current = this._user();
    if (current) {
      this._user.set({ ...current, ...updates });
    }
  }

  private checkSession() {
    const token = localStorage.getItem('access_token');
    if (token) {
      const username = localStorage.getItem('logged_in_username') || 'johndoe';
      const email = localStorage.getItem('logged_in_email') || `${username}@linksphere.com`;
      const bio = localStorage.getItem('logged_in_bio') || 'Social explorer';
      const avatar = localStorage.getItem('logged_in_avatar') || '';

      this._user.set({
        id: '1',
        email: email,
        username: username,
        bio: bio,
        avatarUrl: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        followersCount: 0,
        followingCount: 0
      });
      this._authStatus.set('authenticated');

      // Load user profile details in the background
      this.loadUserProfile().subscribe({
        error: (err) => console.warn('Failed to load user profile on startup:', err)
      });
    }
  }
}
