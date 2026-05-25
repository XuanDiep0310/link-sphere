export interface User {
  id: string | number;
  email: string;
  username: string;
  bio?: string;
  avatar?: string;
  avatarUrl?: string;
  followersCount?: number;
  followingCount?: number;
  followers_count?: number;
  following_count?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  username?: string;
  password?: string;
}
