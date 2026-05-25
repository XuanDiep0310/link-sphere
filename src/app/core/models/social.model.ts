import { User } from './auth.model';

export interface Comment {
  id: string;
  username: string;
  avatarUrl?: string;
  text: string;
  createdAt: string;
  likesCount?: number;
  hasLiked?: boolean;
  replies?: Comment[];
}

export interface Post {
  id: string;
  user: User;
  imageUrl: string;
  caption: string;
  likes: number;
  hasLiked: boolean;
  hasBookmarked: boolean;
  comments: Comment[];
  createdAt: string;
}

export interface ExploreItem {
  id: string;
  imageUrl: string;
  likes: number;
  commentsCount: number;
  caption: string;
  username: string;
  avatarUrl: string;
}

export interface Notification {
  id: string;
  user: {
    username: string;
    avatarUrl?: string;
  };
  type: 'like' | 'comment' | 'follow';
  details: string;
  createdAt: string;
  isFollowingBack?: boolean;
}
