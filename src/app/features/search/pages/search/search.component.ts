import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService } from 'src/app/core/services/mock-data.service';
import { User } from 'src/app/core/models/auth.model';
import { Post } from 'src/app/core/models/social.model';

import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-2xl mx-auto space-y-6 sm:py-4">
      <!-- Search Input Bar -->
      <div class="relative flex items-center">
        <div class="absolute left-4 text-slate-400 dark:text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.604 10.604z" />
          </svg>
        </div>
        <input 
          type="text" 
          [ngModel]="searchQuery()"
          (ngModelChange)="onSearchInput($event)"
          placeholder="Search users, posts, hashtags..."
          class="w-full bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/80 rounded-2xl pl-12 pr-5 py-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:ring-2 focus:ring-violet-500 outline-none transition-all"
        >
        <!-- Clear input button -->
        <button 
          *ngIf="searchQuery()"
          (click)="clearSearch()"
          class="absolute right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Filter Tabs Row -->
      <div class="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl flex gap-1 border border-slate-100 dark:border-slate-700">
        <button 
          *ngFor="let tab of tabs"
          (click)="activeTab.set(tab.id)"
          [class.bg-white]="activeTab() === tab.id"
          [class.dark:bg-slate-700]="activeTab() === tab.id"
          [class.text-slate-950]="activeTab() === tab.id"
          [class.dark:text-white]="activeTab() === tab.id"
          [class.shadow-sm]="activeTab() === tab.id"
          [class.text-slate-500]="activeTab() !== tab.id"
          [class.dark:text-slate-400]="activeTab() !== tab.id"
          class="flex-1 py-2 text-center text-sm font-bold rounded-xl transition-all duration-200 focus:outline-none"
        >
          {{ tab.name }}
        </button>
      </div>

      <!-- Results Body -->
      <div class="min-h-[300px] flex flex-col justify-center">
        <!-- Empty Query State -->
        <div *ngIf="!searchQuery()" class="text-center py-12 space-y-4">
          <div class="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 animate-pulse">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.604 10.604z" />
            </svg>
          </div>
          <div>
            <h3 class="text-slate-600 dark:text-slate-300 font-bold">Search for {{ activeTabName() }}</h3>
            <p class="text-slate-400 dark:text-slate-500 text-xs mt-1">Start typing above to find matching results</p>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="searchQuery() && isSearching()" class="text-center py-12">
          <div class="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-sm text-slate-400 mt-3">Searching...</p>
        </div>

        <!-- Matching Results List -->
        <div *ngIf="searchQuery() && !isSearching()" class="space-y-4">
          <!-- Users List Tab -->
          <div *ngIf="activeTab() === 'users'" class="space-y-3">
            <div 
              *ngFor="let user of searchedUsers()"
              class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div class="flex items-center gap-3">
                <img 
                  [src]="user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'" 
                  alt="avatar"
                  class="w-11 h-11 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform"
                  [routerLink]="['/profile', user.username]"
                >
                <div>
                  <h4 
                    [routerLink]="['/profile', user.username]"
                    class="font-bold text-slate-800 dark:text-white text-sm hover:underline cursor-pointer"
                  >
                    {{ user.username }}
                  </h4>
                  <p class="text-xs text-slate-400 dark:text-slate-500">
                    {{ user.followersCount | number }} followers
                  </p>
                </div>
              </div>

              <!-- Follow Toggle Simulation Button -->
              <button 
                *ngIf="user.id !== currentUserId()"
                (click)="toggleFollow(user.username)"
                class="px-4 py-1.5 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition-colors"
              >
                Follow
              </button>
            </div>
            <div *ngIf="searchedUsers().length === 0" class="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
              No users found matching "{{ searchQuery() }}"
            </div>
          </div>

          <!-- Posts List Tab -->
          <div *ngIf="activeTab() === 'posts'" class="space-y-4">
            <div 
              *ngFor="let post of searchedPosts()"
              class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex gap-4 hover:shadow-md transition-shadow"
            >
              <div class="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                <img [src]="post.imageUrl" class="w-full h-full object-cover" alt="post preview">
              </div>
              <div class="flex-grow flex flex-col justify-between py-1">
                <div>
                  <div 
                    [routerLink]="['/profile', post.user.username]"
                    class="flex items-center gap-1.5 mb-1 cursor-pointer hover:opacity-80"
                  >
                    <img [src]="post.user.avatarUrl" class="w-4 h-4 rounded-full object-cover">
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-300 hover:underline">{{ post.user.username }}</span>
                  </div>
                  <p class="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {{ post.caption }}
                  </p>
                </div>
                <div class="text-[10px] text-slate-400 flex items-center gap-2">
                  <span>❤️ {{ post.likes }} likes</span>
                  <span>•</span>
                  <span>{{ post.createdAt }}</span>
                </div>
              </div>
            </div>
            <div *ngIf="searchedPosts().length === 0" class="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
              No posts found matching "{{ searchQuery() }}"
            </div>
          </div>

          <!-- Hashtags List Tab -->
          <div *ngIf="activeTab() === 'hashtags'" class="space-y-3">
            <div 
              *ngFor="let tag of filteredHashtags()"
              class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer"
            >
              <div class="flex items-center gap-3.5">
                <div class="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-extrabold text-lg">
                  #
                </div>
                <div>
                  <h4 class="font-bold text-slate-800 dark:text-white text-sm">
                    #{{ tag.name }}
                  </h4>
                  <p class="text-xs text-slate-400 dark:text-slate-500">
                    {{ tag.count }} {{ tag.count === 1 ? 'post' : 'posts' }} tag matches
                  </p>
                </div>
              </div>
            </div>
            <div *ngIf="filteredHashtags().length === 0" class="text-center py-10 text-slate-400 dark:text-slate-500 text-sm">
              No hashtags found matching "{{ searchQuery() }}"
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchComponent {
  private mockData = inject(MockDataService);

  searchQuery = signal('');
  activeTab = signal<'users' | 'posts' | 'hashtags'>('users');
  isSearching = signal(false);

  // API search results
  searchedUsers = signal<User[]>([]);
  searchedPosts = signal<Post[]>([]);

  // Debounce subject
  private searchSubject = new Subject<string>();

  currentUserId = computed(() => String(this.mockData.currentUser().id));

  tabs = [
    { id: 'users', name: 'Users' },
    { id: 'posts', name: 'Posts' },
    { id: 'hashtags', name: 'Hashtags' }
  ] as const;

  activeTabName = computed(() => {
    switch (this.activeTab()) {
      case 'users': return 'users';
      case 'posts': return 'posts';
      case 'hashtags': return 'hashtags';
    }
  });

  constructor() {
    // Setup debounced search pipeline
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(query => {
      if (!query.trim()) {
        this.searchedUsers.set([]);
        this.searchedPosts.set([]);
        this.isSearching.set(false);
        return;
      }
      this.performSearch(query);
    });
  }

  onSearchInput(value: string) {
    this.searchQuery.set(value);
    if (value.trim()) {
      this.isSearching.set(true);
    }
    this.searchSubject.next(value);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.searchedUsers.set([]);
    this.searchedPosts.set([]);
    this.isSearching.set(false);
  }

  private performSearch(query: string) {
    // Search both users and posts in parallel
    this.mockData.searchUsers(query).subscribe(users => {
      this.searchedUsers.set(users);
      this.isSearching.set(false);
    });

    this.mockData.searchPosts(query).subscribe(posts => {
      this.searchedPosts.set(posts);
      this.isSearching.set(false);
    });
  }

  filteredHashtags = computed(() => {
    const query = this.searchQuery().trim().toLowerCase().replace('#', '');
    if (!query) return [];

    const defaultTags = [
      { name: 'CoffeeLovers', count: 12 },
      { name: 'Adventure', count: 8 },
      { name: 'Hiking', count: 5 },
      { name: 'Wanderlust', count: 20 },
      { name: 'NatureLife', count: 14 }
    ];

    return defaultTags.filter(t => t.name.toLowerCase().includes(query));
  });

  toggleFollow(username: string) {
    this.mockData.toggleFollowByUsername(username);
  }
}
