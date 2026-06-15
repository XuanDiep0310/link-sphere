import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MockDataService } from 'src/app/core/services/mock-data.service';
import { AuthService } from 'src/app/core/services/auth.service';
import { User } from 'src/app/core/models/auth.model';
import { Post } from 'src/app/core/models/social.model';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-2xl mx-auto space-y-8 sm:py-6 animate-fade-in">
      <!-- Profile Loading State -->
      <div *ngIf="isLoadingProfile()" class="flex justify-center py-20">
        <div class="w-10 h-10 border-3 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <!-- Profile Information Card -->
      <div *ngIf="!isLoadingProfile()" class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center gap-6 sm:gap-8 transition-colors duration-300">
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
            
            <!-- Actions Button -->
            <div class="flex justify-center sm:justify-start gap-2">
              <button
                *ngIf="isOwnProfile()"
                (click)="openEditProfile()"
                class="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-bold rounded-2xl text-xs transition-colors flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
                Edit Profile
              </button>
              <button
                *ngIf="isOwnProfile()"
                (click)="onLogout()"
                class="px-5 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 font-bold rounded-2xl text-xs transition-colors flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Sign Out
              </button>

              <button
                *ngIf="!isOwnProfile()"
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
              {{ profileUser().bio || 'No bio yet ✨' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Grid Posts -->
      <div *ngIf="!isLoadingProfile()" class="space-y-4">

        <!-- Tabs: Posts / Saved (Saved only on own profile) -->
        <div class="flex border-b border-slate-200 dark:border-slate-700">
          <button
            (click)="activeProfileTab.set('posts')"
            [class.border-b-2]="activeProfileTab() === 'posts'"
            [class.border-slate-800]="activeProfileTab() === 'posts'"
            [class.dark:border-white]="activeProfileTab() === 'posts'"
            [class.text-slate-800]="activeProfileTab() === 'posts'"
            [class.dark:text-white]="activeProfileTab() === 'posts'"
            [class.text-slate-400]="activeProfileTab() !== 'posts'"
            class="flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            Posts
          </button>
          <button
            *ngIf="isOwnProfile()"
            (click)="activeProfileTab.set('saved')"
            [class.border-b-2]="activeProfileTab() === 'saved'"
            [class.border-slate-800]="activeProfileTab() === 'saved'"
            [class.dark:border-white]="activeProfileTab() === 'saved'"
            [class.text-slate-800]="activeProfileTab() === 'saved'"
            [class.dark:text-white]="activeProfileTab() === 'saved'"
            [class.text-slate-400]="activeProfileTab() !== 'saved'"
            class="flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
            Saved
          </button>
        </div>

        <!-- Posts Tab -->
        <div *ngIf="activeProfileTab() === 'posts'">
        <div *ngIf="userPosts().length > 0; else emptyState" class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div 
            *ngFor="let post of userPosts()"
            (click)="openPostDetail(post)"
            class="aspect-square rounded-2xl overflow-hidden relative group shadow-sm hover:shadow-lg transition-all bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 cursor-pointer"
          >
            <img [src]="post.imageUrl" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="user post">
            <!-- Hover overlay -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold text-sm">
              <span>❤️ {{ post.likes }}</span>
              <span>💬 {{ post.commentsCount || post.comments.length }}</span>
            </div>
          </div>
        </div>

        <!-- Empty Posts State -->
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

        <!-- Saved Tab -->
        <div *ngIf="activeProfileTab() === 'saved' && isOwnProfile()">
          <div *ngIf="savedPosts().length > 0; else emptySaved" class="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div
              *ngFor="let post of savedPosts()"
              (click)="openPostDetail(post)"
              class="aspect-square rounded-2xl overflow-hidden relative group shadow-sm hover:shadow-lg transition-all bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 cursor-pointer"
            >
              <img [src]="post.imageUrl" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="saved post">
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold text-sm">
                <span>❤️ {{ post.likes }}</span>
                <span>💬 {{ post.commentsCount || post.comments.length }}</span>
              </div>
              <!-- Bookmark badge -->
              <div class="absolute top-2 right-2 text-violet-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="w-5 h-5 drop-shadow">
                  <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
              </div>
            </div>
          </div>
          <ng-template #emptySaved>
            <div class="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
              <div class="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
              </div>
              <h4 class="font-bold text-slate-700 dark:text-slate-300">No Saved Posts</h4>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Tap the bookmark icon on any post to save it here.</p>
            </div>
          </ng-template>
        </div>

      </div>
    </div>

    <!-- ═══════ Edit Profile Modal ═══════ -->
    <div
      *ngIf="showEditProfile()"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      (click)="closeEditProfile()"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-slate-100 dark:border-slate-700"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-extrabold text-slate-900 dark:text-white">Edit Profile</h3>
          <button (click)="closeEditProfile()" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Avatar preview -->
        <div class="flex flex-col items-center gap-3">
          <img
            [src]="editAvatarUrl || profileUser().avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'"
            class="w-20 h-20 rounded-full object-cover border-4 border-violet-100 dark:border-violet-900"
            alt="avatar preview"
          >
          <div class="w-full space-y-1">
            <label class="text-xs font-bold text-slate-600 dark:text-slate-400">Avatar URL</label>
            <input
              type="text"
              [(ngModel)]="editAvatarUrl"
              placeholder="https://..."
              class="w-full bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 border-0 focus:ring-2 focus:ring-violet-500 outline-none transition-all"
            >
          </div>
        </div>

        <!-- Bio -->
        <div class="space-y-1">
          <label class="text-xs font-bold text-slate-600 dark:text-slate-400">Bio</label>
          <textarea
            [(ngModel)]="editBio"
            rows="3"
            placeholder="Tell people about yourself..."
            class="w-full bg-slate-50 dark:bg-slate-700/50 rounded-2xl px-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 border-0 focus:ring-2 focus:ring-violet-500 outline-none transition-all resize-none"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <button
            (click)="closeEditProfile()"
            class="flex-1 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            (click)="saveProfile()"
            class="flex-1 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>

    <!-- ═══════ Post Detail Modal ═══════ -->
    <div 
      *ngIf="selectedPost()"
      class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      (click)="closePostDetail()"
    >
      <div 
        class="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col md:flex-row border border-slate-200 dark:border-slate-700"
        (click)="$event.stopPropagation()"
      >
        <!-- Left: Image -->
        <div class="md:w-1/2 bg-black flex items-center justify-center flex-shrink-0 max-h-[40vh] md:max-h-none">
          <img 
            [src]="selectedPost()!.imageUrl" 
            alt="Post image"
            class="w-full h-full object-contain md:object-cover"
          >
        </div>

        <!-- Right: Details -->
        <div class="md:w-1/2 flex flex-col max-h-[50vh] md:max-h-[90vh]">
          <!-- Post Header -->
          <div class="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
            <img 
              [src]="selectedPost()!.user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'" 
              class="w-10 h-10 rounded-full object-cover"
              alt="avatar"
            >
            <div class="flex-1 min-w-0">
              <p 
                class="font-bold text-sm text-slate-900 dark:text-white hover:underline cursor-pointer truncate"
                [routerLink]="['/profile', selectedPost()!.user.username]"
                (click)="closePostDetail()"
              >
                {{ selectedPost()!.user.username }}
              </p>
              <p class="text-[11px] text-slate-400 dark:text-slate-500">{{ selectedPost()!.createdAt }}</p>
            </div>
            <button 
              (click)="closePostDetail()"
              class="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Caption -->
          <div *ngIf="selectedPost()!.caption" class="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
            <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <span class="font-bold text-slate-900 dark:text-white mr-1.5">{{ selectedPost()!.user.username }}</span>
              {{ selectedPost()!.caption }}
            </p>
          </div>

          <!-- Comments Section (scrollable) -->
          <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            <div *ngIf="selectedPost()!.comments.length === 0" class="text-center py-8">
              <p class="text-sm text-slate-400 dark:text-slate-500">No comments yet</p>
              <p class="text-xs text-slate-300 dark:text-slate-600 mt-1">Be the first to comment!</p>
            </div>

            <div *ngFor="let comment of selectedPost()!.comments" class="flex gap-2.5">
              <img 
                [src]="comment.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'" 
                class="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                alt="commenter"
              >
              <div class="flex-1 min-w-0">
                <p class="text-sm text-slate-700 dark:text-slate-300">
                  <span class="font-bold text-slate-900 dark:text-white mr-1">{{ comment.username }}</span>
                  {{ comment.text }}
                </p>
                <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{{ comment.createdAt }}</p>
              </div>
            </div>
          </div>

          <!-- Action Bar -->
          <div class="border-t border-slate-100 dark:border-slate-700 p-4 flex-shrink-0 space-y-3">
            <!-- Like & Stats -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <button (click)="toggleLikeSelected()" class="transform hover:scale-110 active:scale-90 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" 
                    [attr.fill]="selectedPost()!.hasLiked ? '#ef4444' : 'none'" 
                    viewBox="0 0 24 24" 
                    stroke-width="2" 
                    [attr.stroke]="selectedPost()!.hasLiked ? '#ef4444' : 'currentColor'" 
                    class="w-6 h-6"
                    [class.text-slate-700]="!selectedPost()!.hasLiked"
                    [class.dark:text-slate-300]="!selectedPost()!.hasLiked"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                </button>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6 text-slate-700 dark:text-slate-300">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
              </div>
              <span class="text-sm font-bold text-slate-800 dark:text-white">{{ selectedPost()!.likes }} likes</span>
            </div>

            <!-- Add Comment -->
            <div class="flex items-center gap-2">
              <input 
                type="text"
                [(ngModel)]="newComment"
                (keydown.enter)="submitComment()"
                placeholder="Add a comment..."
                class="flex-1 bg-slate-50 dark:bg-slate-700/40 rounded-2xl px-4 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 border-0 focus:ring-2 focus:ring-violet-500 outline-none transition-all"
              >
              <button 
                (click)="submitComment()"
                [disabled]="!newComment.trim()"
                class="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-2xl transition-colors"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileComponent {
  private route = inject(ActivatedRoute);
  private mockData = inject(MockDataService);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  profileUsername = signal<string | null>(null);
  selectedPost = signal<Post | null>(null);
  newComment = '';
  isLoadingProfile = signal(false);

  private externalUser = signal<User | null>(null);
  isFollowingProfile = signal(false);

  // Profile tabs
  activeProfileTab = signal<'posts' | 'saved'>('posts');

  // Edit Profile modal state
  showEditProfile = signal(false);
  editBio = '';
  editAvatarUrl = '';

  constructor() {
    this.route.paramMap.subscribe(params => {
      const username = params.get('username');
      this.profileUsername.set(username);
      this.externalUser.set(null);
      this.activeProfileTab.set('posts');

      this.mockData.loadAllPosts();
      if (username) {
        this.mockData.loadUserPosts(username);
      }

      if (username && username !== this.mockData.currentUser().username) {
        this.fetchUserProfile(username);
      }
    });
  }

  private fetchUserProfile(username: string) {
    this.isLoadingProfile.set(true);
    this.http.get<{ success: boolean; data?: any }>(
      `${environment.apiUrl}/v1/users/${username}/`
    ).subscribe({
      next: (res) => {
        const found = res?.data ?? (res as any);
        if (found && found.username) {
          const user: User = {
            id: String(found.id),
            email: found.email || '',
            username: found.username,
            avatarUrl: found.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            followersCount: found.followers_count || 0,
            followingCount: found.following_count || 0,
            bio: found.bio
          };
          this.externalUser.set(user);
          this.isFollowingProfile.set(found.is_following ?? false);
        }
        this.isLoadingProfile.set(false);
      },
      error: () => {
        // Fallback: search by username if dedicated endpoint not available
        this.http.get<{ success: boolean; data?: { results: any[] } }>(
          `${environment.apiUrl}/v1/search/users/`, { params: { q: username } }
        ).subscribe({
          next: (res) => {
            const found = (res?.data?.results || []).find((u: any) => u.username === username);
            if (found) {
              this.externalUser.set({
                id: String(found.id),
                email: found.email || '',
                username: found.username,
                avatarUrl: found.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
                followersCount: found.followers_count || 0,
                followingCount: found.following_count || 0,
                bio: found.bio
              });
              this.isFollowingProfile.set(found.is_following ?? false);
            }
            this.isLoadingProfile.set(false);
          },
          error: () => this.isLoadingProfile.set(false)
        });
      }
    });
  }

  isOwnProfile = computed(() => {
    const username = this.profileUsername();
    return !username || username === this.mockData.currentUser().username;
  });

  profileUser = computed((): User => {
    if (this.isOwnProfile()) {
      return this.mockData.currentUser();
    }
    const username = this.profileUsername();
    // Prefer freshly fetched data; fall back to what we know from posts
    const fetched = this.externalUser();
    if (fetched) return fetched;
    const fromPosts = this.mockData.mockUsers().find(u => u.username === username);
    return fromPosts || {
      id: '',
      email: '',
      username: username || 'user',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      followersCount: 0,
      followingCount: 0
    };
  });

  isFollowing = computed(() => this.isFollowingProfile());

  userPosts = computed(() => {
    const user = this.profileUser();
    return this.mockData.getUserPosts(user.username);
  });

  savedPosts = computed(() => this.mockData.bookmarkedPosts());

  toggleFollowUser() {
    const username = this.profileUser().username;
    const nowFollowing = !this.isFollowingProfile();
    this.isFollowingProfile.set(nowFollowing);

    // Update follower count optimistically
    const current = this.externalUser();
    if (current) {
      this.externalUser.set({
        ...current,
        followersCount: nowFollowing
          ? (current.followersCount || 0) + 1
          : Math.max(0, (current.followersCount || 0) - 1)
      });
    }

    this.mockData.toggleFollowByUsername(username);
  }

  onLogout() {
    this.authService.logout();
  }

  openEditProfile() {
    const user = this.profileUser();
    this.editBio = user.bio || '';
    this.editAvatarUrl = user.avatarUrl || '';
    this.showEditProfile.set(true);
  }

  closeEditProfile() {
    this.showEditProfile.set(false);
  }

  saveProfile() {
    this.mockData.updateProfile(this.editBio.trim(), this.editAvatarUrl.trim());
    this.showEditProfile.set(false);
  }

  // ─── Post Detail Modal ─────────────────────────────────────────────

  openPostDetail(post: Post) {
    this.selectedPost.set(post);
    this.newComment = '';
    // Load comments from API
    this.mockData.loadComments(post.id);
  }

  closePostDetail() {
    this.selectedPost.set(null);
    this.newComment = '';
  }

  toggleLikeSelected() {
    const post = this.selectedPost();
    if (post) {
      this.mockData.toggleLike(post.id);
      // Update local selected post state to reflect the change
      this.selectedPost.update(p => {
        if (!p) return p;
        const hasLiked = !p.hasLiked;
        return { ...p, hasLiked, likes: hasLiked ? p.likes + 1 : p.likes - 1 };
      });
    }
  }

  submitComment() {
    const post = this.selectedPost();
    if (post && this.newComment.trim()) {
      this.mockData.addComment(post.id, this.newComment.trim());
      // Add optimistic comment to selected post view
      this.selectedPost.update(p => {
        if (!p) return p;
        return {
          ...p,
          comments: [...p.comments, {
            id: 'c_' + Date.now(),
            username: this.mockData.currentUser().username,
            avatarUrl: this.mockData.currentUser().avatarUrl,
            text: this.newComment.trim(),
            createdAt: 'Just now',
            likesCount: 0,
            hasLiked: false,
            replies: []
          }]
        };
      });
      this.newComment = '';
    }
  }
}
