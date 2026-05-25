import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MockDataService } from 'src/app/core/services/mock-data.service';
import { Notification } from 'src/app/core/models/social.model';

import { RouterLink } from '@angular/router';

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
          [ngClass]="(notification.type === 'like' || notification.type === 'comment') ? 'bg-violet-50/40 dark:bg-violet-950/10' : 'bg-white dark:bg-slate-800'"
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

            <!-- View Action (shows modal or mock notification) -->
            <button 
              *ngIf="notification.type === 'like' || notification.type === 'comment'" 
              (click)="viewPostDetail(notification)"
              class="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-200/40 dark:border-slate-600/40"
            >
              View
            </button>
          </div>
        </div>

        <!-- Empty Notifications State -->
        <div *ngIf="notifications().length === 0" class="text-center py-20">
          <p class="text-slate-400 dark:text-slate-500">You don't have any notifications yet.</p>
        </div>
      </div>

      <!-- Quick Post Preview Modal -->
      <div 
        *ngIf="activePreview()" 
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        (click)="closePreview()"
      >
        <div 
          class="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-700 text-center space-y-4"
          (click)="$event.stopPropagation()"
        >
          <div class="w-12 h-12 bg-violet-100 dark:bg-violet-950/40 rounded-2xl flex items-center justify-center text-violet-600 dark:text-violet-400 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 11.513 1.293l-.041.02a.75.75 0 01-.513-1.293zm-.124 1.836A.75.75 0 0010.5 13.5v.01a.75.75 0 001.5 0v-.01a.75.75 0 00-.874-.754zm.124 3.664a.75.75 0 11.041-1.02.75.75 0 01-.041 1.02zm.124 1.836a.75.75 0 11-.874-.754.75.75 0 01.874.754zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 class="font-bold text-slate-800 dark:text-white text-base">Activity View</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Viewing activity from <span class="font-bold text-slate-700 dark:text-slate-300">&#64;{{ activePreview()?.user?.username }}</span>.
            </p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">
              "{{ activePreview()?.details }}"
            </p>
          </div>
          <button 
            (click)="closePreview()" 
            class="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/20 text-xs transition-all"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationsComponent {
  private mockData = inject(MockDataService);

  notifications = this.mockData.notifications;
  activePreview = signal<Notification | null>(null);

  trackByNotificationId(index: number, notification: Notification): string {
    return notification.id;
  }

  toggleFollowBack(notificationId: string) {
    this.mockData.toggleFollowNotification(notificationId);
  }

  viewPostDetail(notification: Notification) {
    this.activePreview.set(notification);
  }

  closePreview() {
    this.activePreview.set(null);
  }
}
