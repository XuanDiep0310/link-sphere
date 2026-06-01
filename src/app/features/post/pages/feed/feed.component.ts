import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MockDataService } from 'src/app/core/services/mock-data.service';
import { Post, Comment } from 'src/app/core/models/social.model';

interface ReplyTarget {
  postId: string;
  commentId: string;
  username: string;
}

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-xl mx-auto space-y-6 sm:py-4">
      <!-- Post Feed List -->
      <div 
        *ngFor="let post of posts(); trackBy: trackByPostId" 
        class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden transition-colors duration-300"
      >
        <!-- Header -->
        <div class="px-5 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <img 
              [src]="post.user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'" 
              alt="avatar"
              class="w-10 h-10 rounded-full object-cover cursor-pointer hover:scale-105 transition-transform"
              [routerLink]="['/profile', post.user.username]"
            >
            <div>
              <h3 
                [routerLink]="['/profile', post.user.username]"
                class="font-bold text-slate-800 dark:text-white text-sm leading-tight hover:underline cursor-pointer"
              >
                {{ post.user.username }}
              </h3>
              <p class="text-xs text-slate-400 dark:text-slate-500 font-medium">
                {{ post.createdAt }}
              </p>
            </div>
          </div>
          
          <!-- Post Menu Button -->
          <button 
            (click)="openPostMenu(post)"
            class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
          </button>
        </div>

        <!-- Post Image with Double-Click Heart Animation -->
        <div 
          (dblclick)="onPostDblClick(post.id)"
          class="aspect-square relative overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer select-none group"
        >
          <img 
            [src]="post.imageUrl" 
            [alt]="post.caption"
            class="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
            loading="lazy"
          >
          
          <!-- Big Heart Animation Overlay -->
          <div 
            *ngIf="activeHeartAnimations()[post.id]"
            class="absolute inset-0 flex items-center justify-center bg-black/10 z-20 animate-heart-pop pointer-events-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="w-20 h-20 text-white drop-shadow-lg">
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="px-5 pt-4 pb-2">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-4">
              <!-- Heart (Tym) Button -->
              <button 
                (click)="toggleLike(post.id)"
                class="hover:scale-110 active:scale-90 transition-transform focus:outline-none"
                [class.text-red-500]="post.hasLiked"
                [class.text-slate-700]="!post.hasLiked"
                [class.dark:text-slate-300]="!post.hasLiked"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  [attr.fill]="post.hasLiked ? 'currentColor' : 'none'" 
                  viewBox="0 0 24 24" 
                  stroke-width="2" 
                  stroke="currentColor" 
                  class="w-6 h-6"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>

              <!-- Comment Button -->
              <button 
                (click)="toggleComments(post.id)"
                class="text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 hover:scale-110 active:scale-90 transition-all focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
              </button>
            </div>

            <!-- Bookmark Button -->
            <button 
              (click)="toggleBookmark(post.id)"
              class="hover:scale-110 active:scale-90 transition-transform focus:outline-none"
              [class.text-violet-600]="post.hasBookmarked"
              [class.text-slate-700]="!post.hasBookmarked"
              [class.dark:text-slate-300]="!post.hasBookmarked"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                [attr.fill]="post.hasBookmarked ? 'currentColor' : 'none'" 
                viewBox="0 0 24 24" 
                stroke-width="2" 
                stroke="currentColor" 
                class="w-6 h-6"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
            </button>
          </div>

          <!-- Likes Count -->
          <p class="font-extrabold text-slate-800 dark:text-white text-sm mb-1.5">
            {{ post.likes }} likes
          </p>

          <!-- Caption -->
          <p class="text-sm text-slate-800 dark:text-slate-200 leading-relaxed mb-2">
            <span 
              [routerLink]="['/profile', post.user.username]"
              class="font-extrabold text-slate-900 dark:text-white mr-1.5 hover:underline cursor-pointer"
            >
              {{ post.user.username }}
            </span>
            <span>{{ post.caption }}</span>
          </p>

          <!-- Comment Toggle Text -->
          <button 
            *ngIf="post.comments.length > 0"
            (click)="toggleComments(post.id)"
            class="text-xs text-slate-400 dark:text-slate-500 font-bold hover:underline mb-2 block"
          >
            {{ isCommentsOpen(post.id) ? 'Hide' : 'View all ' + post.comments.length }} comments
          </button>

          <!-- Threaded Comments Area -->
          <div 
            *ngIf="isCommentsOpen(post.id)" 
            class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3.5"
          >
            <!-- Top level comments loop -->
            <div *ngFor="let comment of post.comments" class="space-y-2.5">
              
              <!-- Main Comment row -->
              <div class="text-xs flex items-start gap-2.5 group">
                <img 
                  [src]="comment.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'" 
                  class="w-8 h-8 rounded-full object-cover flex-shrink-0 cursor-pointer"
                  [routerLink]="['/profile', comment.username]"
                >
                <div class="flex-grow">
                  <span 
                    [routerLink]="['/profile', comment.username]"
                    class="font-extrabold text-slate-900 dark:text-white hover:underline cursor-pointer mr-1.5"
                  >
                    {{ comment.username }}
                  </span>
                  <span class="text-slate-600 dark:text-slate-300">
                    {{ comment.text }}
                  </span>
                  
                  <!-- Comment Actions Row -->
                  <div class="flex items-center gap-3.5 mt-1 text-[10px] text-slate-400 font-bold">
                    <span>{{ comment.createdAt }}</span>
                    <!-- Likes count & Toggle -->
                    <button 
                      (click)="toggleCommentLike(post.id, comment.id)"
                      class="hover:text-red-500 transition-colors"
                      [class.text-red-500]="comment.hasLiked"
                    >
                      {{ comment.likesCount ? comment.likesCount + ' likes' : 'Like' }}
                    </button>
                    <!-- Reply Action -->
                    <button 
                      (click)="setReplyTarget(post.id, comment.id, comment.username)"
                      class="hover:text-violet-600 transition-colors text-slate-400"
                    >
                      Reply
                    </button>
                  </div>
                </div>

                <!-- Heart Like Icon for Comment -->
                <button 
                  (click)="toggleCommentLike(post.id, comment.id)"
                  class="text-slate-300 hover:text-red-500 transition-colors self-center flex-shrink-0 focus:outline-none"
                  [class.text-red-500]="comment.hasLiked"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" [attr.fill]="comment.hasLiked ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                </button>
              </div>

              <!-- Nested replies (1 level indent) -->
              <div 
                *ngIf="comment.replies && comment.replies.length > 0" 
                class="pl-8 space-y-2.5 border-l-2 border-slate-100 dark:border-slate-800 ml-3"
              >
                <div *ngFor="let reply of comment.replies" class="text-xs flex items-start gap-2.5">
                  <img 
                    [src]="reply.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'" 
                    class="w-6 h-6 rounded-full object-cover flex-shrink-0 cursor-pointer"
                    [routerLink]="['/profile', reply.username]"
                  >
                  <div class="flex-grow">
                    <span 
                      [routerLink]="['/profile', reply.username]"
                      class="font-extrabold text-slate-900 dark:text-white hover:underline cursor-pointer mr-1.5"
                    >
                      {{ reply.username }}
                    </span>
                    <span class="text-slate-600 dark:text-slate-300">
                      {{ reply.text }}
                    </span>
                    
                    <!-- Reply Actions Row -->
                    <div class="flex items-center gap-3.5 mt-1 text-[10px] text-slate-400 font-bold">
                      <span>{{ reply.createdAt }}</span>
                      <button 
                        (click)="toggleCommentLike(post.id, reply.id)"
                        class="hover:text-red-500 transition-colors"
                        [class.text-red-500]="reply.hasLiked"
                      >
                        {{ reply.likesCount ? reply.likesCount + ' likes' : 'Like' }}
                      </button>
                    </div>
                  </div>

                  <!-- Heart Like Icon for Nested Reply -->
                  <button 
                    (click)="toggleCommentLike(post.id, reply.id)"
                    class="text-slate-300 hover:text-red-500 transition-colors self-center flex-shrink-0 focus:outline-none"
                    [class.text-red-500]="reply.hasLiked"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" [attr.fill]="reply.hasLiked ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- New Comment Box -->
            <div class="space-y-2 mt-3 pt-2">
              <!-- Replying To Banner -->
              <div 
                *ngIf="replyingTo() && replyingTo()?.postId === post.id" 
                class="flex items-center justify-between bg-violet-50 dark:bg-violet-950/20 px-3 py-1.5 rounded-xl text-[10px] font-bold text-violet-600 dark:text-violet-400"
              >
                <span>Replying to &#64;{{ replyingTo()?.username }}</span>
                <button (click)="cancelReply()" class="hover:text-slate-800 dark:hover:text-white font-extrabold focus:outline-none">
                  ✕
                </button>
              </div>

              <div class="flex items-center gap-2">
                <input 
                  type="text" 
                  [(ngModel)]="newComments[post.id]"
                  placeholder="Add a comment..."
                  (keyup.enter)="submitComment(post.id)"
                  class="flex-grow bg-slate-50 dark:bg-slate-900/60 text-xs rounded-xl px-3 py-2 text-slate-800 dark:text-white border-0 focus:ring-1 focus:ring-violet-500 outline-none placeholder-slate-400"
                >
                <button 
                  (click)="submitComment(post.id)"
                  [disabled]="!newComments[post.id] || newComments[post.id]!.trim().length === 0"
                  class="text-xs font-bold text-violet-600 hover:text-violet-700 disabled:opacity-40"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Options Menu Modal Overlay -->
    <div 
      *ngIf="activePostMenu()" 
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      (click)="closePostMenu()"
    >
      <div 
        class="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden max-w-xs w-full shadow-2xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 text-center text-sm font-bold text-slate-800 dark:text-slate-200 transform scale-100 transition-transform"
        (click)="$event.stopPropagation()"
      >
        <!-- Delete Option (own posts only) -->
        <button 
          *ngIf="activePostMenu()?.user?.username === currentUser().username"
          (click)="deleteActivePost()"
          class="w-full py-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer block font-extrabold focus:outline-none border-none bg-transparent"
        >
          Delete Post
        </button>
        
        <!-- Unfollow Option (other users only) -->
        <button 
          *ngIf="activePostMenu()?.user?.username !== currentUser().username"
          (click)="unfollowPostUser()"
          class="w-full py-4 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/10 transition-colors cursor-pointer block focus:outline-none border-none bg-transparent"
        >
          Unfollow
        </button>
        
        <!-- Report Option (other users only) -->
        <button 
          *ngIf="activePostMenu()?.user?.username !== currentUser().username"
          (click)="reportActivePost()"
          class="w-full py-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer block focus:outline-none border-none bg-transparent"
        >
          Report Post
        </button>
        
        <!-- Copy Link -->
        <button 
          (click)="copyActivePostLink()"
          class="w-full py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer block focus:outline-none border-none bg-transparent"
        >
          Copy Link
        </button>
        
        <!-- Cancel -->
        <button 
          (click)="closePostMenu()"
          class="w-full py-4 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer block font-semibold focus:outline-none border-none bg-transparent"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Toast Alerts popup -->
    <div 
      *ngIf="toastMessage()" 
      class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2 animate-slide-up border border-slate-700"
    >
      <span>{{ toastMessage() }}</span>
    </div>
  `,
  styles: [`
    @keyframes heartPop {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.2); opacity: 0.9; }
      65% { transform: scale(1); opacity: 0.9; }
      100% { transform: scale(0.8); opacity: 0; }
    }
    .animate-heart-pop {
      animation: heartPop 0.8s ease-out forwards;
    }
    @keyframes slideUp {
      0% { transform: translate(-50%, 20px); opacity: 0; }
      100% { transform: translate(-50%, 0); opacity: 1; }
    }
    .animate-slide-up {
      animation: slideUp 0.2s ease-out forwards;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeedComponent {
  private mockData = inject(MockDataService);

  posts = this.mockData.posts;
  currentUser = this.mockData.currentUser;

  constructor() {
    this.mockData.loadFeed();
  }

  // Track comments expansion for each post
  expandedComments = signal<Record<string, boolean>>({
    'p1': false,
    'p2': false
  });

  // Track the text being typed in comments
  newComments: Record<string, string | undefined> = {};

  // Options Menu dialog
  activePostMenu = signal<Post | null>(null);

  // Toast Notification
  toastMessage = signal<string | null>(null);

  // Track the double tap heart animation overlay
  activeHeartAnimations = signal<Record<string, boolean>>({});

  // Threaded reply target
  replyingTo = signal<ReplyTarget | null>(null);

  trackByPostId(index: number, post: Post): string {
    return post.id;
  }

  isCommentsOpen(postId: string): boolean {
    return !!this.expandedComments()[postId];
  }

  toggleComments(postId: string) {
    const isCurrentlyOpen = this.expandedComments()[postId];
    this.expandedComments.update(current => ({
      ...current,
      [postId]: !current[postId]
    }));
    // Load comments from API when opening
    if (!isCurrentlyOpen) {
      this.mockData.loadComments(postId);
    }
  }

  toggleLike(postId: string) {
    this.mockData.toggleLike(postId);
  }

  onPostDblClick(postId: string) {
    // Check if not already liked
    const post = this.mockData.posts().find(p => p.id === postId);
    if (post && !post.hasLiked) {
      this.mockData.toggleLike(postId);
    }
    
    // Trigger animation
    this.activeHeartAnimations.update(anim => ({
      ...anim,
      [postId]: true
    }));

    setTimeout(() => {
      this.activeHeartAnimations.update(anim => ({
        ...anim,
        [postId]: false
      }));
    }, 800);
  }

  toggleBookmark(postId: string) {
    this.mockData.toggleBookmark(postId);
  }

  // Comments & Nested Replies submissions
  setReplyTarget(postId: string, commentId: string, username: string) {
    this.replyingTo.set({ postId, commentId, username });
    
    // Auto-focus comment text box with name
    this.newComments[postId] = `\u0040${username} `;
    
    // Auto-expand comments
    this.expandedComments.update(current => ({
      ...current,
      [postId]: true
    }));
  }

  cancelReply() {
    this.replyingTo.set(null);
  }

  submitComment(postId: string) {
    const text = this.newComments[postId];
    if (text && text.trim()) {
      const reply = this.replyingTo();
      
      if (reply && reply.postId === postId) {
        // Submit nested reply
        this.mockData.addCommentReply(postId, reply.commentId, text.trim());
        this.replyingTo.set(null);
      } else {
        // Submit standard top-level comment
        this.mockData.addComment(postId, text.trim());
      }
      
      this.newComments[postId] = '';
      
      // Auto-expand comment section
      this.expandedComments.update(current => ({
        ...current,
        [postId]: true
      }));
    }
  }

  // Comment Liking
  toggleCommentLike(postId: string, commentId: string) {
    this.mockData.toggleCommentLike(postId, commentId);
  }

  // Post Options Menu Handlers
  openPostMenu(post: Post) {
    this.activePostMenu.set(post);
  }

  closePostMenu() {
    this.activePostMenu.set(null);
  }

  deleteActivePost() {
    const post = this.activePostMenu();
    if (post) {
      this.mockData.deletePost(post.id);
      this.closePostMenu();
      this.showToast('Post deleted successfully');
    }
  }

  unfollowPostUser() {
    const post = this.activePostMenu();
    if (post) {
      this.mockData.toggleFollowByUsername(post.user.username);
      this.closePostMenu();
      this.showToast(`Unfollowed @${post.user.username}`);
    }
  }

  reportActivePost() {
    this.closePostMenu();
    this.showToast('Post reported to administrator');
  }

  copyActivePostLink() {
    const post = this.activePostMenu();
    if (post) {
      const mockUrl = `${window.location.origin}/posts/${post.id}`;
      navigator.clipboard.writeText(mockUrl).then(() => {
        this.closePostMenu();
        this.showToast('Link copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    }
  }

  showToast(message: string) {
    this.toastMessage.set(message);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 2500);
  }
}
