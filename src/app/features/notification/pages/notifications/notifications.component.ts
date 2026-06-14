import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from 'src/app/core/services/mock-data.service';
import { Notification } from 'src/app/core/models/social.model';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-xl mx-auto space-y-6 sm:py-4">
      <!-- Title -->
      <div>
        <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Notifications</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Stay updated with activities on your posts and community interactions.</p>
      </div>

      <!-- Notifications List -->
      <div class="space-y-3">
        <div 
          *ngFor="let notification of notifications(); trackBy: trackByNotificationId" 
          [ngClass]="{
            'bg-violet-50/40 dark:bg-violet-950/10': !notification.isRead,
            'bg-white dark:bg-slate-800': notification.isRead
          }"
          class="p-4 rounded-2xl border border-slate-100 dark:border-slate-700/80 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="flex items-center gap-3">
            <!-- User Avatar -->
            <img 
              [src]="notification.user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'" 
              alt="avatar"
              class="w-11 h-11 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform"
              [routerLink]="['/profile', notification.user.username]"
            >
            <div>
              <p class="text-sm text-slate-800 dark:text-slate-200">
                <span 
                  [routerLink]="['/profile', notification.user.username]"
                  class="font-bold text-slate-900 dark:text-white hover:underline cursor-pointer"
                >
                  {{ notification.user.username }}
                </span>
                <span class="ml-1">{{ notification.details }}</span>
              </p>
              <span class="text-xs text-slate-400 dark:text-slate-500 font-medium">
                {{ notification.createdAt }}
              </span>
            </div>
          </div>

          <!-- Action Buttons on the Right -->
          <div>
            <!-- Follow Action (toggles on click) -->
            <button 
              *ngIf="notification.type === 'follow'" 
              (click)="toggleFollowBack(notification.id)"
              [class.bg-violet-600]="!notification.isFollowingBack"
              [class.text-white]="!notification.isFollowingBack"
              [class.bg-slate-100]="notification.isFollowingBack"
              [class.dark:bg-slate-700]="notification.isFollowingBack"
              [class.text-slate-800]="notification.isFollowingBack"
              [class.dark:text-white]="notification.isFollowingBack"
              class="px-4 py-2 rounded-xl text-xs font-bold transition-all transform hover:scale-[1.02] active:scale-95 shadow-sm"
            >
              {{ notification.isFollowingBack ? 'Following' : 'Follow' }}
            </button>

            <!-- View Action -->
            <button
              *ngIf="notification.type === 'like' || notification.type === 'comment'"
              (click)="viewPost(notification)"
              class="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-200/40 dark:border-slate-600/40"
            >
              View
            </button>
          </div>
        </div>

        <!-- Empty Notifications State -->
        <div *ngIf="notifications().length === 0" class="text-center py-20 space-y-3">
          <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <p class="text-slate-400 dark:text-slate-500 font-medium">No notifications yet</p>
          <p class="text-slate-400 dark:text-slate-500 text-xs">When someone interacts with your posts, you'll see it here.</p>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsComponent {
  private mockData = inject(MockDataService);
  private router = inject(Router);

  notifications = this.mockData.notifications;

  constructor() {
    this.mockData.loadNotifications();
    setTimeout(() => this.mockData.markNotificationsRead(), 2000);
  }

  trackByNotificationId(index: number, notification: Notification): string {
    return notification.id;
  }

  toggleFollowBack(notificationId: string) {
    this.mockData.toggleFollowNotification(notificationId);
  }

  viewPost(notification: Notification) {
    if (notification.postId) {
      // TODO: navigate to specific post when post detail route is available
      // this.router.navigate(['/posts', notification.postId]);
      this.router.navigate(['/profile', notification.user.username]);
    } else {
      // Fallback: go to the sender's profile
      this.router.navigate(['/profile', notification.user.username]);
    }
  }
}
