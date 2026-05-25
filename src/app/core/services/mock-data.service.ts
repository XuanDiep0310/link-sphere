import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from '../models/auth.model';
import { Post, Comment, Notification, ExploreItem } from '../models/social.model';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { tap } from 'rxjs';

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

  // Explore grid items
  exploreItems = signal<ExploreItem[]>([]);

  // Notifications State
  notifications = signal<Notification[]>([]);

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

  // Load Feed list from backend
  loadFeed() {
    this.http.get<{ success: boolean; data?: { results: any[] } }>(`${environment.apiUrl}/v1/feed/`).subscribe({
      next: (res) => {
        if (res && res.data && res.data.results) {
          const mapped = res.data.results.map((item: any) => ({
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
            comments: [
              { id: 'c_init', username: 'mikejohnson', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', text: 'Great shot! ☕️', createdAt: '3h ago', likesCount: 2, hasLiked: false, replies: [] }
            ],
            createdAt: this.formatTimeAgo(item.created_at)
          }));
          this.posts.set(mapped);
          this.updateMockUsersFromPosts(mapped);
        } else {
          this.posts.set([]);
        }
      },
      error: (err) => {
        console.warn('API /v1/feed failed. Setting empty feed:', err);
        this.posts.set([]);
      }
    });
  }

  // Load Explore list from backend
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

  // Load All Posts from backend (used in Profile Page)
  loadAllPosts() {
    this.http.get<{ success: boolean; data?: any[] }>(`${environment.apiUrl}/v1/posts/`).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          const mapped = res.data.map((item: any) => ({
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
            comments: [
              { id: 'c_init', username: 'mikejohnson', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', text: 'Great shot! ☕️', createdAt: '3h ago', likesCount: 2, hasLiked: false, replies: [] }
            ],
            createdAt: this.formatTimeAgo(item.created_at)
          }));
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

  private formatTimeAgo(dateStr: string): string {
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

  // Methods to manipulate state (local state edits are preserved on top of loaded values)
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
        }
      })
    );
  }

  deletePost(postId: string) {
    this.posts.update(current => current.filter(p => p.id !== postId));
  }

  toggleLike(postId: string) {
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
  }

  toggleBookmark(postId: string) {
    this.posts.update(currentPosts =>
      currentPosts.map(p => (p.id === postId ? { ...p, hasBookmarked: !p.hasBookmarked } : p))
    );
  }

  addComment(postId: string, text: string) {
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
  }

  toggleFollow(userId: string) {
    this.mockUsers.update(users =>
      users.map(u => {
        if (u.id === userId) {
          const isUserFollowing = u.id !== '1';
          return {
            ...u,
            followersCount: isUserFollowing ? (u.followersCount || 0) + 1 : (u.followersCount || 0)
          };
        }
        return u;
      })
    );
  }

  toggleFollowByUsername(username: string) {
    this.mockUsers.update(users =>
      users.map(u => {
        if (u.username === username) {
          const isFollowing = (u as any)._isFollowing;
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
  }

  toggleFollowNotification(notificationId: string) {
    this.notifications.update(notifications =>
      notifications.map(n => {
        if (n.id === notificationId && n.type === 'follow') {
          return {
            ...n,
            isFollowingBack: !n.isFollowingBack
          };
        }
        return n;
      })
    );
  }
}
