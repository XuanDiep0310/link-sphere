import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MockDataService } from 'src/app/core/services/mock-data.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { User } from 'src/app/core/models/auth.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-2xl mx-auto space-y-8 sm:py-6 animate-fade-in">
      <!-- Profile Information Card -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center gap-6 sm:gap-8 transition-colors duration-300">
        <!-- Avatar image -->
        <div class="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-violet-50 dark:border-violet-950 shadow-md flex-shrink-0">
          <img 
            [src]="profileUser().avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'" 
            alt="Profile Avatar"
            class="w-full h-full object-cover"
          >
        </div>

        <!-- User Stats & Bio -->
        <div class="flex-grow space-y-4 text-center sm:text-left w-full">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 class="text-2xl font-extrabold text-slate-800 dark:text-white">&#64;{{ profileUser().username }}</h2>
              <p class="text-xs text-slate-400 dark:text-slate-500 font-medium">{{ profileUser().email }}</p>
            </div>
            
            <!-- Actions Button (Sign Out for Own Profile, Follow/Unfollow for others) -->
            <div class="flex justify-center sm:justify-start">
              <button 
                *ngIf="isOwnProfile(); else followButton"
                (click)="onLogout()"
                class="px-5 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-bold rounded-2xl text-xs transition-colors flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Sign Out
              </button>

              <ng-template #followButton>
                <button 
                  (click)="toggleFollowUser()"
                  [class.bg-violet-600]="!isFollowing()"
                  [class.text-white]="!isFollowing()"
                  [class.bg-slate-100]="isFollowing()"
                  [class.dark:bg-slate-700]="isFollowing()"
                  [class.text-slate-800]="isFollowing()"
                  [class.dark:text-white]="isFollowing()"
                  class="px-6 py-2 rounded-2xl font-bold text-xs transition-all shadow-sm transform hover:scale-[1.02] active:scale-95"
                >
                  {{ isFollowing() ? 'Following' : 'Follow' }}
                </button>
              </ng-template>
            </div>
          </div>

          <!-- Stats Counters -->
          <div class="flex items-center justify-center sm:justify-start gap-8 py-2 border-y border-slate-100 dark:border-slate-700/60">
            <div>
              <span class="block text-lg font-extrabold text-slate-800 dark:text-white">{{ userPosts().length }}</span>
              <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Posts</span>
            </div>
            <div>
              <span class="block text-lg font-extrabold text-slate-800 dark:text-white">{{ profileUser().followersCount | number }}</span>
              <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Followers</span>
            </div>
            <div>
              <span class="block text-lg font-extrabold text-slate-800 dark:text-white">{{ profileUser().followingCount | number }}</span>
              <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">Following</span>
            </div>
          </div>

          <!-- Bio -->
          <div class="space-y-1">
            <h4 class="text-sm font-bold text-slate-800 dark:text-white">Bio</h4>
            <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Creative developer and social explorer. Sharing memories, paths, and coffee shop vibes from around the globe. 🌍📸✨
            </p>
          </div>
        </div>
      </div>

      <!-- Grid Posts -->
      <div class="space-y-4">
        <h3 class="text-lg font-extrabold text-slate-800 dark:text-white">Posts</h3>
        
        <div *ngIf="userPosts().length > 0; else emptyState" class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div 
            *ngFor="let post of userPosts()"
            class="aspect-square rounded-2xl overflow-hidden relative group shadow-sm hover:shadow-md transition-shadow bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-700"
          >
            <img [src]="post.imageUrl" class="w-full h-full object-cover" alt="user post">
            <!-- Simple hover info -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold text-sm">
              <span>❤️ {{ post.likes }}</span>
              <span>💬 {{ post.comments.length }}</span>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <ng-template #emptyState>
          <div class="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
            <div class="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
            </div>
            <h4 class="font-bold text-slate-700 dark:text-slate-300">No Posts Yet</h4>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">This user hasn't uploaded any posts yet.</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent {
  private route = inject(ActivatedRoute);
  private mockData = inject(MockDataService);
  private authService = inject(AuthService);

  profileUsername = signal<string | null>(null);

  constructor() {
    this.route.paramMap.subscribe(params => {
      this.profileUsername.set(params.get('username'));
      this.mockData.loadAllPosts();
    });
  }

  isOwnProfile = computed(() => {
    const username = this.profileUsername();
    return !username || username === this.mockData.currentUser().username;
  });

  profileUser = computed(() => {
    const username = this.profileUsername();
    if (this.isOwnProfile()) {
      return this.mockData.currentUser();
    }
    const foundUser = this.mockData.mockUsers().find(u => u.username === username);
    return foundUser || {
      id: 'mock_id',
      email: `${username}@linksphere.com`,
      username: username || 'user',
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
      followersCount: 152,
      followingCount: 94
    };
  });

  isFollowing = computed(() => {
    const user = this.profileUser();
    const found = this.mockData.mockUsers().find(u => u.username === user.username);
    return !!(found as any)?._isFollowing;
  });

  userPosts = computed(() => {
    const user = this.profileUser();
    return this.mockData.allPosts().filter(p => p.user.username === user.username);
  });

  toggleFollowUser() {
    const username = this.profileUser().username;
    this.mockData.toggleFollowByUsername(username);
  }

  onLogout() {
    this.authService.logout();
  }
}
