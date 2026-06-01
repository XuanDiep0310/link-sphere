import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ChatService } from 'src/app/features/chat/services/chat.service';
import { Conversation } from 'src/app/core/models/chat.model';
import { User } from 'src/app/core/models/auth.model';

@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-xl mx-auto space-y-6 sm:py-4">
      <!-- Title + New Message -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Messages</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Your conversations</p>
        </div>
        <button
          (click)="openNewMessageModal()"
          class="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/20 transform hover:scale-[1.02] active:scale-95 transition-all text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          New
        </button>
      </div>

      <!-- Search -->
      <div class="relative">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.604 10.604z" />
        </svg>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          placeholder="Search conversations..."
          class="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
        >
      </div>

      <!-- Loading State -->
      <div *ngIf="chatService.isLoadingConversations()" class="flex justify-center py-10">
        <svg class="animate-spin h-8 w-8 text-violet-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <!-- Conversations List -->
      <div *ngIf="!chatService.isLoadingConversations()" class="space-y-2">
        <a
          *ngFor="let conv of filteredConversations(); trackBy: trackById"
          [routerLink]="['/chat', conv.id]"
          class="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-sm hover:shadow-md hover:border-violet-200 dark:hover:border-violet-800/60 transition-all cursor-pointer group"
        >
          <!-- Avatar -->
          <div class="relative flex-shrink-0">
            <img
              [src]="conv.avatar"
              alt="avatar"
              class="w-14 h-14 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 group-hover:ring-violet-200 dark:group-hover:ring-violet-800/60 transition-all"
            >
            <span
              *ngIf="conv.unreadCount > 0"
              class="absolute -top-1 -right-1 bg-violet-600 text-white text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800 px-1"
            >
              {{ conv.unreadCount > 99 ? '99+' : conv.unreadCount }}
            </span>
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <h3 class="font-bold text-slate-900 dark:text-white text-sm truncate"
                  [class.text-violet-700]="conv.unreadCount > 0"
                  [class.dark:text-violet-400]="conv.unreadCount > 0"
              >
                {{ conv.title || conv.otherParticipant }}
              </h3>
              <span class="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 font-medium">
                {{ chatService.formatTimeAgo(conv.updatedAt) }}
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5"
               [class.font-semibold]="conv.unreadCount > 0"
               [class.text-slate-700]="conv.unreadCount > 0"
               [class.dark:text-slate-300]="conv.unreadCount > 0"
            >
              {{ conv.lastMessage || 'No messages yet' }}
            </p>
          </div>

          <!-- Arrow -->
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 transition-colors flex-shrink-0">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </a>

        <!-- Empty State -->
        <div *ngIf="filteredConversations().length === 0 && !chatService.isLoadingConversations()" class="text-center py-20 space-y-4">
          <div class="w-20 h-20 bg-violet-50 dark:bg-violet-950/30 rounded-3xl flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 text-violet-400">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <div>
            <p class="text-slate-500 dark:text-slate-400 font-medium">No conversations yet</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Start a new conversation to begin messaging</p>
          </div>
          <button
            (click)="openNewMessageModal()"
            class="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-2xl shadow-lg shadow-violet-500/20 transform hover:scale-[1.02] active:scale-95 transition-all text-sm"
          >
            Start a conversation
          </button>
        </div>
      </div>

      <!-- New Message Modal -->
      <div
        *ngIf="isNewMessageModalOpen()"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        (click)="closeNewMessageModal()"
      >
        <div
          class="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-[440px] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-700"
          (click)="$event.stopPropagation()"
        >
          <!-- Header -->
          <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 class="text-lg font-bold text-slate-800 dark:text-white">New Message</h2>
            <button
              (click)="closeNewMessageModal()"
              class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Search -->
          <div class="p-4">
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 dark:text-slate-400">To:</span>
              <input
                type="text"
                [(ngModel)]="userSearchQuery"
                (ngModelChange)="onSearchUsers($event)"
                placeholder="Search by username..."
                class="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700/40 rounded-2xl text-sm text-slate-800 dark:text-white placeholder-slate-400 border-0 focus:ring-2 focus:ring-violet-500 outline-none transition-all"
              >
            </div>
          </div>

          <!-- Search Results -->
          <div class="max-h-72 overflow-y-auto px-4 pb-4 space-y-1">
            <!-- Loading -->
            <div *ngIf="isSearchingUsers()" class="flex justify-center py-4">
              <svg class="animate-spin h-6 w-6 text-violet-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>

            <!-- Results -->
            <button
              *ngFor="let user of searchedUsers()"
              (click)="startConversation(user)"
              class="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors text-left"
            >
              <img
                [src]="user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'"
                alt="avatar"
                class="w-11 h-11 rounded-full object-cover"
              >
              <div class="flex-1 min-w-0">
                <p class="font-bold text-sm text-slate-800 dark:text-white truncate">{{ user.username }}</p>
                <p *ngIf="user.bio" class="text-xs text-slate-400 dark:text-slate-500 truncate">{{ user.bio }}</p>
              </div>
            </button>

            <!-- Empty search results -->
            <p
              *ngIf="userSearchQuery.length > 0 && searchedUsers().length === 0 && !isSearchingUsers()"
              class="text-center text-sm text-slate-400 dark:text-slate-500 py-6"
            >
              No users found
            </p>

            <!-- Initial state -->
            <p
              *ngIf="userSearchQuery.length === 0 && !isSearchingUsers()"
              class="text-center text-sm text-slate-400 dark:text-slate-500 py-6"
            >
              Type a username to search
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConversationsComponent implements OnInit {
  chatService = inject(ChatService);
  private router = inject(Router);

  searchQuery = '';
  userSearchQuery = '';
  isNewMessageModalOpen = signal(false);
  searchedUsers = signal<User[]>([]);
  isSearchingUsers = signal(false);

  private searchTimeout: any;

  filteredConversations = computed(() => {
    const convs = this.chatService.conversations();
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return convs;
    return convs.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.otherParticipant.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q)
    );
  });

  ngOnInit() {
    this.chatService.loadConversations();
  }

  trackById(index: number, conv: Conversation): string {
    return conv.id;
  }

  openNewMessageModal() {
    this.isNewMessageModalOpen.set(true);
    this.userSearchQuery = '';
    this.searchedUsers.set([]);
  }

  closeNewMessageModal() {
    this.isNewMessageModalOpen.set(false);
  }

  onSearchUsers(query: string) {
    clearTimeout(this.searchTimeout);
    if (!query.trim()) {
      this.searchedUsers.set([]);
      return;
    }
    this.isSearchingUsers.set(true);
    this.searchTimeout = setTimeout(() => {
      this.chatService.searchUsers(query).subscribe({
        next: (users) => {
          this.searchedUsers.set(users);
          this.isSearchingUsers.set(false);
        },
        error: () => {
          this.isSearchingUsers.set(false);
        }
      });
    }, 300);
  }

  startConversation(user: User) {
    const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
    this.chatService.createConversation(userId).subscribe(conv => {
      if (conv) {
        this.closeNewMessageModal();
        this.router.navigate(['/chat', conv.id]);
      }
    });
  }
}
