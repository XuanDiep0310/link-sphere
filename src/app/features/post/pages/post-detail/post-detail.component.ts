import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { MockDataService } from 'src/app/core/services/mock-data.service';
import { Post } from 'src/app/core/models/social.model';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-xl mx-auto space-y-4 sm:py-4">
      <!-- Back Button -->
      <button
        (click)="goBack()"
        class="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors font-bold text-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="w-4 h-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back
      </button>

      <!-- Loading Skeleton -->
      <div *ngIf="isLoading()" class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
        <div class="px-5 py-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse flex-shrink-0"></div>
          <div class="flex-grow space-y-2">
            <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-28 animate-pulse"></div>
            <div class="h-2.5 bg-slate-100 dark:bg-slate-700/60 rounded-full w-20 animate-pulse"></div>
          </div>
        </div>
        <div class="aspect-square bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
        <div class="px-5 py-4 space-y-3">
          <div class="flex gap-4">
            <div class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
            <div class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
          </div>
          <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-16 animate-pulse"></div>
          <div class="space-y-2">
            <div class="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4 animate-pulse"></div>
            <div class="h-2.5 bg-slate-100 dark:bg-slate-700/60 rounded-full w-1/2 animate-pulse"></div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div *ngIf="!isLoading() && !post()" class="text-center py-20 space-y-3">
        <div class="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p class="text-slate-500 dark:text-slate-400 font-bold">Post not found</p>
        <p class="text-slate-400 dark:text-slate-500 text-xs">This post may have been deleted or is unavailable.</p>
      </div>

      <!-- Post Card -->
      <div
        *ngIf="!isLoading() && post() as p"
        class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden"
      >
        <!-- Header -->
        <div class="px-5 py-4 flex items-center gap-3">
          <img
            [src]="p.user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'"
            alt="avatar"
            class="w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform"
            [routerLink]="['/profile', p.user.username]"
          >
          <div>
            <h3
              [routerLink]="['/profile', p.user.username]"
              class="font-bold text-slate-800 dark:text-white text-sm leading-tight hover:underline cursor-pointer"
            >
              {{ p.user.username }}
            </h3>
            <p class="text-xs text-slate-400 dark:text-slate-500 font-medium">{{ p.createdAt }}</p>
          </div>
        </div>

        <!-- Image -->
        <div class="aspect-square relative overflow-hidden bg-slate-100 dark:bg-slate-900">
          <img
            [src]="p.imageUrl"
            [alt]="p.caption"
            class="w-full h-full object-cover"
            loading="lazy"
          >
        </div>

        <!-- Footer Actions -->
        <div class="px-5 pt-4 pb-2">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-4">
              <!-- Like Button -->
              <button
                (click)="toggleLike()"
                class="hover:scale-110 active:scale-90 transition-transform focus:outline-none"
                [class.text-red-500]="p.hasLiked"
                [class.text-slate-700]="!p.hasLiked"
                [class.dark:text-slate-300]="!p.hasLiked"
              >
                <svg xmlns="http://www.w3.org/2000/svg" [attr.fill]="p.hasLiked ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
              <!-- Comment icon (decorative, comments always shown below) -->
              <span class="text-slate-400 dark:text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
              </span>
            </div>
            <!-- Bookmark Button -->
            <button
              (click)="toggleBookmark()"
              class="hover:scale-110 active:scale-90 transition-transform focus:outline-none"
              [class.text-violet-600]="p.hasBookmarked"
              [class.text-slate-700]="!p.hasBookmarked"
              [class.dark:text-slate-300]="!p.hasBookmarked"
            >
              <svg xmlns="http://www.w3.org/2000/svg" [attr.fill]="p.hasBookmarked ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
            </button>
          </div>

          <!-- Likes Count -->
          <p class="font-extrabold text-slate-800 dark:text-white text-sm mb-1.5">{{ p.likes }} likes</p>

          <!-- Caption -->
          <p class="text-sm text-slate-800 dark:text-slate-200 leading-relaxed mb-3">
            <span
              [routerLink]="['/profile', p.user.username]"
              class="font-extrabold text-slate-900 dark:text-white mr-1.5 hover:underline cursor-pointer"
            >{{ p.user.username }}</span>
            <span>{{ p.caption }}</span>
          </p>

          <!-- Comments Section (always open) -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3.5">
            <div *ngFor="let comment of p.comments" class="text-xs flex items-start gap-2.5">
              <img
                [src]="comment.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'"
                class="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer"
                [routerLink]="['/profile', comment.username]"
              >
              <div class="flex-grow">
                <span
                  [routerLink]="['/profile', comment.username]"
                  class="font-extrabold text-slate-900 dark:text-white hover:underline cursor-pointer mr-1.5"
                >{{ comment.username }}</span>
                <span class="text-slate-600 dark:text-slate-300">{{ comment.text }}</span>
                <div class="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-bold">
                  <span>{{ comment.createdAt }}</span>
                  <button
                    (click)="toggleCommentLike(comment.id)"
                    class="hover:text-red-500 transition-colors"
                    [class.text-red-500]="comment.hasLiked"
                  >{{ comment.likesCount ? comment.likesCount + ' likes' : 'Like' }}</button>
                </div>
              </div>
            </div>

            <!-- No comments yet -->
            <p *ngIf="p.comments.length === 0 && p.commentsCount === 0" class="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
              No comments yet. Be the first!
            </p>

            <!-- New Comment Box -->
            <div class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <input
                type="text"
                [(ngModel)]="newComment"
                placeholder="Add a comment..."
                (keyup.enter)="submitComment()"
                class="flex-grow bg-slate-50 dark:bg-slate-900/60 text-xs rounded-xl px-3 py-2 text-slate-800 dark:text-white border-0 focus:ring-1 focus:ring-violet-500 outline-none placeholder-slate-400"
              >
              <button
                (click)="submitComment()"
                [disabled]="!newComment.trim()"
                class="text-xs font-bold text-violet-600 hover:text-violet-700 disabled:opacity-40"
              >Post</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PostDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private mockData = inject(MockDataService);

  post = signal<Post | null>(null);
  isLoading = signal(true);
  newComment = '';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.mockData.getPostById(id).subscribe({
      next: (p) => {
        this.post.set(p);
        this.isLoading.set(false);
        this.mockData.loadComments(id);
      },
      error: () => {
        this.post.set(null);
        this.isLoading.set(false);
      }
    });

    // Keep comments in sync from the shared posts signal
    const id2 = id;
    const checkInterval = setInterval(() => {
      const fromFeed = this.mockData.posts().find(p => p.id === id2)
                    ?? this.mockData.allPosts().find(p => p.id === id2);
      if (fromFeed && fromFeed.comments.length > 0) {
        this.post.update(p => p ? { ...p, comments: fromFeed.comments, commentsCount: fromFeed.commentsCount } : p);
        clearInterval(checkInterval);
      }
    }, 300);
    setTimeout(() => clearInterval(checkInterval), 5000);
  }

  goBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/']);
    }
  }

  toggleLike() {
    const p = this.post();
    if (!p) return;
    this.mockData.toggleLike(p.id);
    this.post.update(cur => cur ? {
      ...cur,
      hasLiked: !cur.hasLiked,
      likes: cur.hasLiked ? cur.likes - 1 : cur.likes + 1
    } : cur);
  }

  toggleBookmark() {
    const p = this.post();
    if (!p) return;
    this.mockData.toggleBookmark(p.id);
    this.post.update(cur => cur ? { ...cur, hasBookmarked: !cur.hasBookmarked } : cur);
  }

  toggleCommentLike(commentId: string) {
    const p = this.post();
    if (!p) return;
    this.mockData.toggleCommentLike(p.id, commentId);
    this.post.update(cur => {
      if (!cur) return cur;
      return {
        ...cur,
        comments: cur.comments.map(c =>
          c.id === commentId
            ? { ...c, hasLiked: !c.hasLiked, likesCount: (c.likesCount || 0) + (c.hasLiked ? -1 : 1) }
            : c
        )
      };
    });
  }

  submitComment() {
    const p = this.post();
    if (!p || !this.newComment.trim()) return;
    this.mockData.addComment(p.id, this.newComment.trim());
    this.newComment = '';
    // Reload comments after short delay
    setTimeout(() => this.mockData.loadComments(p.id), 500);
  }
}
