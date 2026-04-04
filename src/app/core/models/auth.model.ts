export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  followersCount: number;
  followingCount: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password?: string;
}
