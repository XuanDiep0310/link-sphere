import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/auth.model';
import { Post, Comment, Notification, ExploreItem } from '../models/social.model';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { tap, Observable, of, switchMap, catchError, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocialService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // Current user state (computed from AuthService state)
  currentUser = computed<User>(() => {
    return this.authService.currentUser() || {
      id: '',
      email: '',
      username: '',
      avatarUrl: '',
      followersCount: 0,
      followingCount: 0
    };
  });

  // Active Users list (populated dynamically from loaded post authors)
  mockUsers = signal<User[]>([]);

  // Posts State (populated dynamically or falls back)
  posts = signal<Post[]>([]);
  allPosts = signal<Post[]>([]);
  isLoadingFeed = signal(false);
  currentFeedType = signal<'following' | 'forYou'>('following');

  // Explore grid items
  exploreItems = signal<ExploreItem[]>([]);

  // Notifications State
  notifications = signal<Notification[]>([]);
  unreadNotificationCount = computed(() =>
    this.notifications().filter(n => !n.isRead).length
  );

  // Bookmark State — synced from API, localStorage as cache
  private bookmarkedIds = signal<Set<string>>(this.loadBookmarksFromStorage());

  bookmarkedPosts = computed(() =>
    this.allPosts().filter(p => this.bookmarkedIds().has(p.id))
  );

  private loadBookmarksFromStorage(): Set<string> {
    try {
      const raw = localStorage.getItem('bookmarked_post_ids');
      return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  }

  private saveBookmarksToStorage(ids: Set<string>) {
    localStorage.setItem('bookmarked_post_ids', JSON.stringify(Array.from(ids)));
  }

  loadBookmarks(username: string) {
    this.http.get<{ success: boolean; data?: any[] }>(
      `${environment.apiUrl}/v1/users/${username}/bookmarks/`
    ).subscribe({
      next: (res) => {
        const list = res?.data ?? [];
        const ids = new Set<string>(list.map((p: any) => String(p.id)));
        this.bookmarkedIds.set(ids);
        this.saveBookmarksToStorage(ids);
        // Update hasBookmarked flag on already-loaded posts
        const sync = (p: Post) => ({ ...p, hasBookmarked: ids.has(p.id) });
        this.posts.update(list => list.map(sync));
        this.allPosts.update(list => list.map(sync));
      },
      error: () => { /* keep localStorage cache */ }
    });
  }

  // Toast notification
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'warning' | 'error'>('success');

  showToast(message: string, type: 'success' | 'warning' | 'error' = 'success') {
    this.toastType.set(type);
    this.toastMessage.set(message);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }

  private notifWs: WebSocket | null = null;
  private notifReconnectAttempts = 0;
  private readonly MAX_RECONNECT = 5;

  constructor() {}

  // ─── NOTIFICATIONS WEBSOCKET ─────────────────────────────────────────────

  connectNotificationsWs() {
    const token = localStorage.getItem('access_token');
    if (!token || this.notifWs?.readyState === WebSocket.OPEN) return;

    let wsBase = environment.wsUrl;
    if (wsBase.startsWith('https://')) wsBase = wsBase.replace('https://', 'wss://');
    else if (wsBase.startsWith('http://')) wsBase = wsBase.replace('http://', 'ws://');

    try {
      const urlObj = new URL(wsBase);
      wsBase = `${urlObj.protocol}//${urlObj.host}`;
    } catch { /* keep as-is */ }

    const wsUrl = `${wsBase}/ws/notifications/?token=${token}`;

    try {
      this.notifWs = new WebSocket(wsUrl);

      this.notifWs.onopen = () => {
        this.notifReconnectAttempts = 0;
      };

      this.notifWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Reload notifications to get latest from server
          if (data.type === 'notification' || data.notification) {
            this.loadNotifications();
          }
        } catch { /* ignore parse errors */ }
      };

      this.notifWs.onclose = () => {
        if (this.notifReconnectAttempts < this.MAX_RECONNECT) {
          this.notifReconnectAttempts++;
          setTimeout(() => this.connectNotificationsWs(), 5000);
        }
      };
    } catch { /* WebSocket not available */ }
  }

  disconnectNotificationsWs() {
    if (this.notifWs) {
      this.notifWs.onclose = null;
      this.notifWs.close();
      this.notifWs = null;
    }
    this.notifReconnectAttempts = 0;
  }

  // Helper to dynamically collect unique users from posts list to support search and profiles
  updateMockUsersFromPosts(postsList: Post[]) {
    const currentUsers = this.mockUsers();
    const newUsers = [...currentUsers];
    
    postsList.forEach(p => {
      if (p.user && p.user.username && !newUsers.some(u => u.username === p.user.username)) {
        newUsers.push(p.user);
      }
    });
    
    this.mockUsers.set(newUsers);
  }

  // ─── FEED ───────────────────────────────────────────────────────────────

  loadFeed() {
    this.loadFeedByType(this.currentFeedType());
  }

  loadFeedByType(type: 'following' | 'forYou') {
    this.currentFeedType.set(type);
    this.isLoadingFeed.set(true);

    if (type === 'following') {
      // Personalized feed: posts from followed users
      this.http.get<{ success: boolean; data?: any }>(`${environment.apiUrl}/v1/feed/`).subscribe({
        next: (res) => {
          const rawList = res?.data ? (Array.isArray(res.data) ? res.data : (res.data.results || [])) : [];
          if (rawList.length > 0) {
            const mapped = rawList.map((item: any) => this.mapPostFromApi(item));
            this.posts.set(mapped);
            this.allPosts.set(mapped);
            this.updateMockUsersFromPosts(mapped);
            this.isLoadingFeed.set(false);
          } else {
            // Fallback to all posts when following feed is empty
            this.loadAllPostsForFeed();
          }
        },
        error: () => this.loadAllPostsForFeed()
      });
    } else {
      this.loadAllPostsForFeed();
    }
  }

  private loadAllPostsForFeed() {
    this.http.get<{ success: boolean; data?: any }>(`${environment.apiUrl}/v1/posts/`).subscribe({
      next: (res) => {
        if (res && res.data) {
          const rawList = Array.isArray(res.data) ? res.data : (res.data.results || []);
          const mapped = rawList.map((item: any) => this.mapPostFromApi(item));
          this.posts.set(mapped);
          this.allPosts.set(mapped);
          this.updateMockUsersFromPosts(mapped);
        } else {
          this.posts.set([]);
        }
        this.isLoadingFeed.set(false);
      },
      error: () => {
        this.posts.set([]);
        this.isLoadingFeed.set(false);
      }
    });
  }

  loadExplore() {
    this.http.get<{ success: boolean; data?: { results: any[] } }>(`${environment.apiUrl}/v1/feed/explore/`).subscribe({
      next: (res) => {
        if (res && res.data && res.data.results) {
          const mapped = res.data.results.map((item: any) => ({
            id: String(item.id),
            imageUrl: item.image || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600',
            likes: item.likes_count || 0,
            commentsCount: item.comments_count || 0,
            caption: item.content || '',
            username: item.author.username,
            avatarUrl: item.author.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
          }));
          this.exploreItems.set(mapped);
        } else {
          this.exploreItems.set([]);
        }
      },
      error: () => {
        this.exploreItems.set([]);
      }
    });
  }

  loadAllPosts() {
    this.http.get<{ success: boolean; data?: any[] }>(`${environment.apiUrl}/v1/posts/`).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          const mapped = res.data.map((item: any) => this.mapPostFromApi(item));
          this.allPosts.set(mapped);
          this.updateMockUsersFromPosts(mapped);
        }
      },
      error: () => {
        this.allPosts.set(this.posts());
      }
    });
  }

  // ─── POST CREATION ──────────────────────────────────────────────────────

  addPost(caption: string, imageFile: File | null) {
    const formData = new FormData();
    formData.append('content', caption);
    if (imageFile) {
      formData.append('image', imageFile, imageFile.name);
    }

    return this.http.post<{ success: boolean; data?: any }>(`${environment.apiUrl}/v1/posts/`, formData).pipe(
      tap({
        next: () => {
          this.loadFeed();
          this.showToast('Post published successfully!');
        }
      })
    );
  }

  deletePost(postId: string): void {
    const snapshot = { posts: this.posts(), allPosts: this.allPosts() };

    // Optimistic remove
    this.posts.update(current => current.filter(p => p.id !== postId));
    this.allPosts.update(current => current.filter(p => p.id !== postId));

    this.http.delete<any>(`${environment.apiUrl}/v1/posts/${postId}/`).subscribe({
      next: () => this.showToast('Post deleted successfully.'),
      error: () => {
        this.posts.set(snapshot.posts);
        this.allPosts.set(snapshot.allPosts);
        this.showToast('Failed to delete post. Please try again.', 'error');
      }
    });
  }

  // ─── LIKE/UNLIKE (API INTEGRATED) ──────────────────────────────────────

  toggleLike(postId: string) {
    // Optimistic update first
    this.posts.update(currentPosts =>
      currentPosts.map(p => {
        if (p.id === postId) {
          const hasLiked = !p.hasLiked;
          return {
            ...p,
            hasLiked,
            likes: hasLiked ? p.likes + 1 : p.likes - 1
          };
        }
        return p;
      })
    );

    // Also update allPosts
    this.allPosts.update(currentPosts =>
      currentPosts.map(p => {
        if (p.id === postId) {
          const hasLiked = !p.hasLiked;
          return {
            ...p,
            hasLiked,
            likes: hasLiked ? p.likes + 1 : p.likes - 1
          };
        }
        return p;
      })
    );

    // Call API
    this.http.post<any>(`${environment.apiUrl}/v1/posts/${postId}/like/`, {}).subscribe({
      error: () => {
        // Revert on error
        this.posts.update(currentPosts =>
          currentPosts.map(p => {
            if (p.id === postId) {
              const hasLiked = !p.hasLiked;
              return { ...p, hasLiked, likes: hasLiked ? p.likes + 1 : p.likes - 1 };
            }
            return p;
          })
        );
      }
    });
  }

  toggleBookmark(postId: string) {
    const next = new Set(this.bookmarkedIds());
    const isNowBookmarked = !next.has(postId);
    isNowBookmarked ? next.add(postId) : next.delete(postId);
    this.bookmarkedIds.set(next);
    this.saveBookmarksToStorage(next);

    const update = (p: Post) =>
      p.id === postId ? { ...p, hasBookmarked: isNowBookmarked } : p;
    this.posts.update(list => list.map(update));
    this.allPosts.update(list => list.map(update));

    this.http.post<any>(`${environment.apiUrl}/v1/posts/${postId}/bookmark/`, {}).subscribe({
      error: () => {
        // Revert on error
        const prev = new Set(this.bookmarkedIds());
        isNowBookmarked ? prev.delete(postId) : prev.add(postId);
        this.bookmarkedIds.set(prev);
        this.saveBookmarksToStorage(prev);
        const revert = (p: Post) =>
          p.id === postId ? { ...p, hasBookmarked: !isNowBookmarked } : p;
        this.posts.update(list => list.map(revert));
        this.allPosts.update(list => list.map(revert));
      }
    });

    this.showToast(isNowBookmarked ? 'Post saved to bookmarks.' : 'Removed from bookmarks.');
  }

  // ─── COMMENTS (API INTEGRATED) ─────────────────────────────────────────

  loadComments(postId: string) {
    this.http.get<{ success: boolean; data?: any[] }>(`${environment.apiUrl}/v1/posts/${postId}/comments/`).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          const mappedComments: Comment[] = res.data.map((c: any) => ({
            id: String(c.id),
            username: c.author?.username || 'unknown',
            avatarUrl: c.author?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            text: c.content || '',
            createdAt: this.formatTimeAgo(c.created_at),
            likesCount: 0,
            hasLiked: false,
            replies: []
          }));

          const updatePost = (p: Post) => p.id === postId ? { ...p, comments: mappedComments } : p;
          this.posts.update(list => list.map(updatePost));
          this.allPosts.update(list => list.map(updatePost));
          this.userPostsMap.update(map => {
            const next = { ...map };
            for (const uname in next) {
              next[uname] = next[uname].map(updatePost);
            }
            return next;
          });
        }
      },
      error: () => {}
    });
  }

  addComment(postId: string, text: string) {
    // Optimistic update
    const newComment: Comment = {
      id: 'c_' + Date.now(),
      username: this.currentUser().username,
      avatarUrl: this.currentUser().avatarUrl,
      text: text,
      createdAt: 'Just now',
      likesCount: 0,
      hasLiked: false,
      replies: []
    };

    this.posts.update(currentPosts =>
      currentPosts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: [...p.comments, newComment],
            commentsCount: (p.commentsCount || 0) + 1
          };
        }
        return p;
      })
    );

    // Call API
    this.http.post<{ success: boolean; data?: any }>(`${environment.apiUrl}/v1/posts/${postId}/comments/`, {
      content: text
    }).subscribe({
      next: () => {
        // Reload comments from backend to get real IDs
        this.loadComments(postId);
      },
      error: () => {
        this.showToast('Failed to post comment. Please try again.');
      }
    });
  }

  toggleCommentLike(postId: string, commentId: string) {
    this.posts.update(currentPosts =>
      currentPosts.map(p => {
        if (p.id === postId) {
          const updatedComments = p.comments.map(c => {
            if (c.id === commentId) {
              const hasLiked = !c.hasLiked;
              const count = c.likesCount || 0;
              return {
                ...c,
                hasLiked,
                likesCount: hasLiked ? count + 1 : count - 1
              };
            }
            
            if (c.replies && c.replies.length > 0) {
              const updatedReplies = c.replies.map(r => {
                if (r.id === commentId) {
                  const hasLiked = !r.hasLiked;
                  const count = r.likesCount || 0;
                  return {
                    ...r,
                    hasLiked,
                    likesCount: hasLiked ? count + 1 : count - 1
                  };
                }
                return r;
              });
              return { ...c, replies: updatedReplies };
            }
            
            return c;
          });
          return { ...p, comments: updatedComments };
        }
        return p;
      })
    );
  }

  addCommentReply(postId: string, parentCommentId: string, text: string) {
    const newReply: Comment = {
      id: 'r_' + Date.now(),
      username: this.currentUser().username,
      avatarUrl: this.currentUser().avatarUrl,
      text: text,
      createdAt: 'Just now',
      likesCount: 0,
      hasLiked: false
    };

    this.posts.update(currentPosts =>
      currentPosts.map(p => {
        if (p.id === postId) {
          const updatedComments = p.comments.map(c => {
            if (c.id === parentCommentId) {
              return {
                ...c,
                replies: [...(c.replies || []), newReply]
              };
            }
            return c;
          });
          return { ...p, comments: updatedComments };
        }
        return p;
      })
    );

    // Also post to API (as a regular comment since API doesn't support nesting)
    this.http.post<any>(`${environment.apiUrl}/v1/posts/${postId}/comments/`, {
      content: text
    }).subscribe({
      error: () => this.showToast('Failed to post reply. Please try again.')
    });
  }

  // ─── FOLLOW/UNFOLLOW (API INTEGRATED) ──────────────────────────────────

  toggleFollow(userId: string) {
    const user = this.mockUsers().find(u => String(u.id) === userId);
    if (!user) return;
    this.toggleFollowByUsername(user.username);
  }

  toggleFollowByUsername(username: string, currentlyFollowing?: boolean) {
    const user = this.mockUsers().find(u => u.username === username);
    const isFollowing = currentlyFollowing ?? !!(user as any)?._isFollowing;
    const action = isFollowing ? 'unfollow' : 'follow';

    this.http.post<any>(
      `${environment.apiUrl}/v1/users/${action}/`, { username }
    ).subscribe({
      error: (err) => {
        console.warn(`Failed to ${action} @${username}:`, err);
      }
    });
  }

  toggleFollowNotification(notificationId: string) {
    const notification = this.notifications().find(n => n.id === notificationId);
    if (!notification || notification.type !== 'follow') return;

    const isFollowingBack = notification.isFollowingBack;
    const endpoint = isFollowingBack ? 'unfollow' : 'follow';

    // Optimistic update
    this.notifications.update(notifications =>
      notifications.map(n => {
        if (n.id === notificationId && n.type === 'follow') {
          return { ...n, isFollowingBack: !n.isFollowingBack };
        }
        return n;
      })
    );

    // Call API
    this.http.post<any>(
      `${environment.apiUrl}/v1/users/${endpoint}/`, { username: notification.user.username }
    ).subscribe({
      error: (err) => {
        console.warn(`Failed to ${endpoint} @${notification.user.username}:`, err);
        // Revert
        this.notifications.update(notifications =>
          notifications.map(n => {
            if (n.id === notificationId && n.type === 'follow') {
              return { ...n, isFollowingBack: isFollowingBack };
            }
            return n;
          })
        );
      }
    });
  }

  // ─── SEARCH (API INTEGRATED) ───────────────────────────────────────────

  searchUsers(query: string): Observable<User[]> {
    if (!query.trim()) return of([]);
    return this.http.get<{ success: boolean; data?: { results: any[] } }>(
      `${environment.apiUrl}/v1/search/users/`, { params: { q: query } }
    ).pipe(
      switchMap(res => {
        if (res?.data?.results) {
          const mapped = res.data.results.map((u: any) => ({
            id: String(u.id),
            email: u.email || '',
            username: u.username,
            avatarUrl: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            followersCount: u.followers_count || 0,
            followingCount: u.following_count || 0,
            bio: u.bio,
            is_following: u.is_following === true || u.is_following === 'true'
          }));
          return of(mapped);
        }
        return of([]);
      }),
      catchError(() => {
        const q = query.trim().toLowerCase();
        return of(this.mockUsers().filter(u =>
          u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        ));
      })
    );
  }

  searchHashtags(query: string): Observable<{ name: string; count: number }[]> {
    if (!query.trim()) return of([]);
    const q = query.trim().toLowerCase().replace(/^#/, '');
    return this.http.get<{ success: boolean; data?: any }>(
      `${environment.apiUrl}/v1/search/hashtags/`, { params: { q } }
    ).pipe(
      switchMap(res => {
        const list = res?.data?.results ?? (Array.isArray(res?.data) ? res.data : []);
        if (list.length > 0) {
          return of(list.map((h: any) => ({
            name: h.name || h.tag || h,
            count: h.posts_count || h.count || 0
          })));
        }
        return of([]);
      }),
      catchError(() => {
        // Fallback: extract hashtags from local posts
        const tagCounts = new Map<string, number>();
        for (const post of this.posts()) {
          const matches = post.caption.match(/#([a-zA-Z0-9_]+)/g) || [];
          for (const tag of matches) {
            const name = tag.slice(1);
            tagCounts.set(name, (tagCounts.get(name) || 0) + 1);
          }
        }
        const results = Array.from(tagCounts.entries())
          .filter(([name]) => name.toLowerCase().includes(q))
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }));
        return of(results);
      })
    );
  }

  searchPosts(query: string): Observable<Post[]> {
    if (!query.trim()) return of([]);
    return this.http.get<{ success: boolean; data?: { results: any[] } }>(
      `${environment.apiUrl}/v1/search/posts/`, { params: { q: query } }
    ).pipe(
      switchMap(res => {
        if (res?.data?.results) {
          const mapped = res.data.results.map((item: any) => this.mapPostFromApi(item));
          return of(mapped);
        }
        return of([]);
      }),
      catchError(() => {
        const q = query.trim().toLowerCase();
        return of(this.posts().filter(p =>
          p.caption.toLowerCase().includes(q) || p.user.username.toLowerCase().includes(q)
        ));
      })
    );
  }

  // ─── NOTIFICATIONS (API INTEGRATED) ────────────────────────────────────

  loadNotifications() {
    this.http.get<{ success: boolean; data?: any[] }>(`${environment.apiUrl}/v1/notifications/`).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          const mapped: Notification[] = res.data.map((n: any) => ({
            id: String(n.id),
            user: {
              username: n.sender?.username || 'unknown',
              avatarUrl: n.sender?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
            },
            type: n.type as 'like' | 'comment' | 'follow',
            details: n.message || this.getNotificationText(n.type),
            createdAt: this.formatTimeAgo(n.created_at),
            isRead: n.is_read || false,
            isFollowingBack: false,
            // TODO: backend cần trả về post_id trong response
            postId: n.post_id ? String(n.post_id) : undefined
          }));
          this.notifications.set(mapped);
        }
      },
      error: () => { /* notifications stay empty */ }
    });
  }

  markNotificationsRead() {
    this.http.post<any>(`${environment.apiUrl}/v1/notifications/read/`, {}).subscribe({
      next: () => {
        this.notifications.update(notifications =>
          notifications.map(n => ({ ...n, isRead: true }))
        );
      },
      error: () => { /* silent – UI badge stays as-is */ }
    });
  }

  private getNotificationText(type: string): string {
    switch (type) {
      case 'like': return 'liked your post';
      case 'comment': return 'commented on your post';
      case 'follow': return 'started following you';
      default: return 'interacted with your content';
    }
  }

  // ─── HELPER: Map API post to frontend Post model ───────────────────────

  private mapPostFromApi(item: any): Post {
    return {
      id: String(item.id),
      user: {
        id: String(item.author.id),
        email: item.author.email,
        username: item.author.username,
        avatarUrl: item.author.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        followersCount: item.author.followers_count || 0,
        followingCount: item.author.following_count || 0,
        bio: item.author.bio
      },
      imageUrl: item.image || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
      caption: item.content || '',
      likes: item.likes_count || 0,
      hasLiked: item.is_liked === 'true' || item.is_liked === true || String(item.is_liked).toLowerCase() === 'true',
      hasBookmarked: item.is_bookmarked === true || item.is_bookmarked === 'true' || this.bookmarkedIds().has(String(item.id)),
      comments: [],
      commentsCount: item.comments_count || 0,
      createdAt: this.formatTimeAgo(item.created_at)
    };
  }

  // ─── USER POSTS (MOCK — TODO: GET /v1/users/{username}/posts/) ────────────

  userPostsMap = signal<Record<string, Post[]>>({});
  isLoadingUserPosts = signal(false);

  loadUserPosts(username: string): void {
    this.isLoadingUserPosts.set(true);
    this.http.get<{ success: boolean; data?: any }>(
      `${environment.apiUrl}/v1/users/${username}/posts/`
    ).subscribe({
      next: (res) => {
        const rawList = res?.data
          ? (Array.isArray(res.data) ? res.data : (res.data.results || []))
          : [];
        const mapped = rawList.map((item: any) => this.mapPostFromApi(item));
        this.userPostsMap.update(m => ({ ...m, [username]: mapped }));
        this.isLoadingUserPosts.set(false);
      },
      error: () => {
        // Fallback: filter from already-loaded posts
        const fromAll = this.allPosts().filter(p => p.user.username === username);
        this.userPostsMap.update(m => ({ ...m, [username]: fromAll }));
        this.isLoadingUserPosts.set(false);
      }
    });
  }

  getUserPosts(username: string) {
    return this.userPostsMap().hasOwnProperty(username)
      ? this.userPostsMap()[username]
      : this.allPosts().filter(p => p.user.username === username);
  }

  getPostById(id: string): Observable<Post> {
    return this.http.get<{ success: boolean; data?: any }>(`${environment.apiUrl}/v1/posts/${id}/`).pipe(
      map((res: { success: boolean; data?: any }) => this.mapPostFromApi(res?.data ?? res))
    );
  }

  // ─── UPDATE PROFILE (MOCK — TODO: PATCH /v1/users/profile/) ──────────────

  updateProfile(bio: string, avatarUrl: string): void {
    // Optimistic local update
    this.authService.updateCurrentUser({ bio, avatarUrl });
    localStorage.setItem('logged_in_bio', bio);
    if (avatarUrl) localStorage.setItem('logged_in_avatar', avatarUrl);

    const body: any = { bio };
    if (avatarUrl) body.avatar = avatarUrl;

    this.http.patch<{ success: boolean; data?: any }>(
      `${environment.apiUrl}/v1/users/profile/`, body
    ).subscribe({
      next: (res) => {
        if (res?.data) {
          const d = res.data;
          const updatedBio = d.bio ?? bio;
          const updatedAvatar = d.avatar ?? avatarUrl;
          this.authService.updateCurrentUser({ bio: updatedBio, avatarUrl: updatedAvatar });
          localStorage.setItem('logged_in_bio', updatedBio);
          if (updatedAvatar) localStorage.setItem('logged_in_avatar', updatedAvatar);
        }
        this.showToast('Profile updated successfully!');
      },
      error: () => this.showToast('Failed to update profile. Please try again.', 'error')
    });
  }

  formatTimeAgo(dateStr: string): string {
    if (!dateStr) return 'Just now';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) return `${diffDays}d ago`;
      if (diffHours > 0) return `${diffHours}h ago`;
      if (diffMin > 0) return `${diffMin}m ago`;
      return 'Just now';
    } catch (e) {
      return 'Just now';
    }
  }
}

export { SocialService as MockDataService };
