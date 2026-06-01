import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MockDataService } from 'src/app/core/services/mock-data.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { ChatService } from 'src/app/features/chat/services/chat.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <!-- Top Navigation Header -->
      <header class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 transition-colors duration-300">
        <div class="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <!-- Logo -->
          <a routerLink="/" class="flex items-center gap-2.5 group">
            <div class="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-violet-500/20 group-hover:scale-105 transition-all">
              S
            </div>
            <span class="font-extrabold text-xl tracking-tight text-slate-800 dark:text-white group-hover:text-violet-600 transition-colors">Social</span>
          </a>

          <!-- Right Navigation Icons -->
          <nav class="flex items-center gap-2 sm:gap-4">
            <!-- Home -->
            <a 
              routerLink="/" 
              [routerLinkActiveOptions]="{exact: true}"
              routerLinkActive="text-violet-600 bg-violet-50 dark:bg-violet-950/40"
              class="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-violet-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
              title="Home"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </a>

            <!-- Search -->
            <a 
              routerLink="/search" 
              routerLinkActive="text-violet-600 bg-violet-50 dark:bg-violet-950/40"
              class="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-violet-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
              title="Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.604 10.604z" />
              </svg>
            </a>

            <!-- Explore -->
            <a 
              routerLink="/explore" 
              routerLinkActive="text-violet-600 bg-violet-50 dark:bg-violet-950/40"
              class="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-violet-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
              title="Explore"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9s2.015-9 4.5-9yM3 9.75h18" />
              </svg>
            </a>

            <!-- Create Post -->
            <button 
              (click)="openCreateModal()"
              [ngClass]="isCreateModalOpen() ? 'text-violet-600 bg-violet-50 dark:bg-violet-950/40' : 'text-slate-600 dark:text-slate-300'"
              class="p-2 rounded-xl hover:text-violet-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
              title="Create Post"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            <!-- Notifications -->
            <a 
              routerLink="/notifications" 
              routerLinkActive="text-violet-600 bg-violet-50 dark:bg-violet-950/40"
              class="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-violet-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all relative"
              title="Notifications"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              <!-- Notification Badge -->
              <span 
                *ngIf="unreadCount() > 0"
                class="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white dark:border-slate-800"
              >
                {{ unreadCount() > 9 ? '9+' : unreadCount() }}
              </span>
            </a>

            <!-- Messages -->
            <a 
              routerLink="/chat" 
              routerLinkActive="text-violet-600 bg-violet-50 dark:bg-violet-950/40"
              class="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-violet-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all relative"
              title="Messages"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <!-- Unread Messages Badge -->
              <span 
                *ngIf="chatService.totalUnreadCount() > 0"
                class="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full border border-white dark:border-slate-800 px-0.5"
              >
                {{ chatService.totalUnreadCount() > 99 ? '99+' : chatService.totalUnreadCount() }}
              </span>
            </a>

            <!-- Divider -->
            <div class="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>

            <!-- Profile Avatar -->
            <a 
              routerLink="/profile" 
              routerLinkActive="ring-2 ring-violet-600"
              class="w-8 h-8 rounded-full overflow-hidden block hover:scale-105 transition-transform"
              title="Profile"
            >
              <img 
                [src]="currentUser().avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'" 
                alt="Profile Avatar"
                class="w-full h-full object-cover"
              >
            </a>
          </nav>
        </div>
      </header>

      <!-- Main Content Outlet -->
      <main class="flex-grow max-w-5xl w-full mx-auto p-4 sm:p-6">
        <router-outlet></router-outlet>
      </main>

      <!-- Create Post Modal Dialog -->
      <div 
        *ngIf="isCreateModalOpen()" 
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
        (click)="closeCreateModal()"
      >
        <div 
          class="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-[540px] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700 transform scale-100 transition-transform duration-300 relative"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 class="text-xl font-bold text-slate-800 dark:text-white">Create New Post</h2>
            <button 
              (click)="closeCreateModal()"
              class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 space-y-4">
            <!-- User metadata -->
            <div class="flex items-center gap-3">
              <img 
                [src]="currentUser().avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'" 
                alt="user avatar"
                class="w-10 h-10 rounded-full object-cover"
              >
              <span class="font-bold text-slate-800 dark:text-white">&#64;{{ currentUser().username }}</span>
            </div>

            <!-- Content input -->
            <textarea 
              [(ngModel)]="caption"
              placeholder="What's on your mind?"
              rows="4"
              class="w-full bg-slate-50 dark:bg-slate-700/40 rounded-2xl p-4 text-slate-800 dark:text-white placeholder-slate-400 border-0 focus:ring-2 focus:ring-violet-500 outline-none resize-none transition-all"
            ></textarea>

            <!-- File Image Upload -->
            <div class="space-y-2">
              <label class="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Photo</label>
              
              <input 
                type="file" 
                #fileInput 
                (change)="onFileSelected($event)" 
                accept="image/*" 
                class="hidden"
              >

              <!-- Upload Click Zone -->
              <div 
                *ngIf="!imagePreview(); else previewArea"
                (click)="fileInput.click()"
                class="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-violet-500 dark:hover:border-violet-500 rounded-2xl p-6 text-center cursor-pointer transition-colors duration-200 flex flex-col items-center justify-center gap-2 group bg-slate-50/50 dark:bg-slate-900/20"
              >
                <div class="w-12 h-12 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <span class="text-sm font-bold text-slate-700 dark:text-slate-200">Upload a photo</span>
                <span class="text-xs text-slate-400 dark:text-slate-500">PNG, JPG, JPEG up to 10MB</span>
              </div>

              <!-- Preview Area -->
              <ng-template #previewArea>
                <div class="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-inner group animate-fade-in">
                  <img [src]="imagePreview()" class="w-full h-full object-cover" alt="Upload preview">
                  <button 
                    (click)="removeSelectedFile()"
                    class="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition-colors shadow-md"
                    title="Remove Photo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </ng-template>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
            <button 
              *ngIf="!imagePreview()"
              (click)="fileInput.click()"
              class="flex items-center gap-2 text-violet-600 hover:text-violet-700 font-bold transition-colors text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              Add Photo
            </button>
            <span *ngIf="imagePreview()" class="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.748-5.25z" clip-rule="evenodd" />
              </svg>
              Photo selected
            </span>

            <!-- Submit -->
            <button 
              (click)="submitPost()"
              [disabled]="!caption.trim() || !selectedFile() || isPosting()"
              class="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-violet-500/20 transform hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center gap-2"
            >
              <span *ngIf="!isPosting()">Post</span>
              <span *ngIf="isPosting()" class="flex items-center gap-2">
                <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Posting...
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent {
  private mockData = inject(MockDataService);
  private router = inject(Router);
  chatService = inject(ChatService);

  currentUser = this.mockData.currentUser;
  unreadCount = this.mockData.unreadNotificationCount;

  constructor() {
    // Load notifications on init for badge count
    this.mockData.loadNotifications();
    // Load chat conversations for unread badge
    this.chatService.loadConversations();
  }

  // Modal State
  isCreateModalOpen = signal(false);
  caption = '';
  selectedFile = signal<File | null>(null);
  imagePreview = signal<string | null>(null);
  isPosting = signal(false);

  openCreateModal() {
    this.isCreateModalOpen.set(true);
    this.caption = '';
    this.selectedFile.set(null);
    this.imagePreview.set(null);
    this.isPosting.set(false);
  }

  closeCreateModal() {
    this.isCreateModalOpen.set(false);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFile.set(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeSelectedFile() {
    this.selectedFile.set(null);
    this.imagePreview.set(null);
  }

  submitPost() {
    if (this.caption.trim()) {
      this.isPosting.set(true);
      this.mockData.addPost(this.caption, this.selectedFile()).subscribe({
        next: () => {
          this.isPosting.set(false);
          this.closeCreateModal();
          this.router.navigate(['/']);
        },
        error: (err) => {
          console.error('Failed to publish post:', err);
          this.isPosting.set(false);
          alert('Failed to publish post. Please try again.');
        }
      });
    }
  }
}
