import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/auth.model';
import { Post, Comment, Notification, ExploreItem } from '../models/social.model';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { tap, Observable, of, Subject, debounceTime, switchMap, catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MockDataService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // Current user state (computed from AuthService state)
  currentUser = computed<User>(() => {
    return this.authService.currentUser() || {
      id: '1',
      email: 'johndoe@linksphere.com',
      username: 'johndoe',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      followersCount: 1240,
      followingCount: 482
    };
  });

  // Active Users list (populated dynamically from loaded post authors)
  mockUsers = signal<User[]>([]);

  // Posts State (populated dynamically or falls back)
  posts = signal<Post[]>([]);
  allPosts = signal<Post[]>([]);
  isLoadingFeed = signal(false);

  // Explore grid items
  exploreItems = signal<ExploreItem[]>([]);

  // Notifications State
  notifications = signal<Notification[]>([]);
  unreadNotificationCount = computed(() =>
    this.notifications().filter(n => !n.isRead).length
  );

  // Toast notification
  toastMessage = signal<string | null>(null);

  showToast(message: string) {
    this.toastMessage.set(message);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }

  constructor() {}

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
    this.isLoadingFeed.set(true);
    this.http.get<{ success: boolean; data?: { count: number; results: any[] } }>(`${environment.apiUrl}/v1/feed/`).subscribe({
      next: (res) => {
        if (res && res.data && res.data.results && res.data.results.length > 0) {
          const mapped = res.data.results.map((item: any) => this.mapPostFromApi(item));
          this.posts.set(mapped);
          this.updateMockUsersFromPosts(mapped);
          this.isLoadingFeed.set(false);
        } else {
          // Feed is empty (user follows nobody) — fallback to all posts
          this.loadAllPostsAsFeed();
        }
      },
      error: (err) => {
        console.warn('API /v1/feed failed. Falling back to all posts:', err);
        this.loadAllPostsAsFeed();
      }
    });
  }

  private loadAllPostsAsFeed() {
    this.http.get<{ success: boolean; data?: any }>(`${environment.apiUrl}/v1/posts/`).subscribe({
      next: (res) => {
        if (res && res.data) {
          const rawList = Array.isArray(res.data) ? res.data : (res.data.results || []);
          const mapped = rawList.map((item: any) => this.mapPostFromApi(item));
          this.posts.set(mapped);
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
            commentsCount: 2,
            caption: item.content || '',
            username: item.author.username,
            avatarUrl: item.author.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
          }));
          this.exploreItems.set(mapped);
        } else {
          this.exploreItems.set([]);
        }
      },
      error: (err) => {
        console.warn('API /v1/feed/explore failed. Setting empty explore:', err);
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
      error: (err) => {
        console.warn('API /v1/posts/ failed. Using feed posts fallback:', err);
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
        next: (res) => {
          // Reload feed to show the newly added post
          this.loadFeed();
          this.showToast('🎉 Post published successfully!');
        }
      })
    );
  }

  deletePost(postId: string) {
    this.posts.update(current => current.filter(p => p.id !== postId));
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
      error: (err) => {
        console.warn('Like API failed, reverting:', err);
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
    this.posts.update(currentPosts =>
      currentPosts.map(p => (p.id === postId ? { ...p, hasBookmarked: !p.hasBookmarked } : p))
    );
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

          this.posts.update(currentPosts =>
            currentPosts.map(p => {
              if (p.id === postId) {
                return { ...p, comments: mappedComments };
              }
              return p;
            })
          );
        }
      },
      error: (err) => {
        console.warn(`Failed to load comments for post ${postId}:`, err);
      }
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
            comments: [...p.comments, newComment]
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
      error: (err) => {
        console.warn('Add comment API failed:', err);
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
      error: (err) => console.warn('Reply API failed:', err)
    });
  }

  // ─── FOLLOW/UNFOLLOW (API INTEGRATED) ──────────────────────────────────

  toggleFollow(userId: string) {
    const user = this.mockUsers().find(u => String(u.id) === userId);
    if (!user) return;
    this.toggleFollowByUsername(user.username);
  }

  toggleFollowByUsername(username: string) {
    const user = this.mockUsers().find(u => u.username === username);
    const isFollowing = !!(user as any)?._isFollowing;
    const endpoint = isFollowing ? 'unfollow' : 'follow';

    // Optimistic update
    this.mockUsers.update(users =>
      users.map(u => {
        if (u.username === username) {
          const updatedFollowing = !isFollowing;
          return {
            ...u,
            _isFollowing: updatedFollowing,
            followersCount: updatedFollowing ? (u.followersCount || 0) + 1 : (u.followersCount || 0) - 1
          } as any;
        }
        return u;
      })
    );

    // Call API
    this.http.post<any>(`${environment.apiUrl}/v1/users/${endpoint}/`, {
      username: username
    }).subscribe({
      error: (err) => {
        console.warn(`${endpoint} API failed, reverting:`, err);
        // Revert on error
        this.mockUsers.update(users =>
          users.map(u => {
            if (u.username === username) {
              return {
                ...u,
                _isFollowing: isFollowing,
                followersCount: isFollowing ? (u.followersCount || 0) + 1 : (u.followersCount || 0) - 1
              } as any;
            }
            return u;
          })
        );
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
    this.http.post<any>(`${environment.apiUrl}/v1/users/${endpoint}/`, {
      username: notification.user.username
    }).subscribe({
      error: (err) => {
        console.warn(`Follow-back API failed:`, err);
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
            bio: u.bio
          }));
          return of(mapped);
        }
        return of([]);
      }),
      catchError(err => {
        console.warn('Search users API failed:', err);
        // Fallback to local filtering
        const q = query.trim().toLowerCase();
        return of(this.mockUsers().filter(u =>
          u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
        ));
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
      catchError(err => {
        console.warn('Search posts API failed:', err);
        // Fallback to local filtering
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
            isFollowingBack: false
          }));
          this.notifications.set(mapped);
        }
      },
      error: (err) => {
        console.warn('Failed to load notifications:', err);
      }
    });
  }

  markNotificationsRead() {
    this.http.post<any>(`${environment.apiUrl}/v1/notifications/read/`, {}).subscribe({
      next: () => {
        this.notifications.update(notifications =>
          notifications.map(n => ({ ...n, isRead: true }))
        );
      },
      error: (err) => console.warn('Mark notifications read failed:', err)
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
      hasBookmarked: false,
      comments: [],
      createdAt: this.formatTimeAgo(item.created_at)
    };
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
