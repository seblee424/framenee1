export interface User {
  id: string;
  phone?: string;
  email?: string;
  name: string;
  avatarUrl?: string;
  loginProvider: 'phone' | 'email' | 'dingtalk';
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  phone?: string;
  email?: string;
  code: string;
  password?: string;
}

export interface RegisterRequest {
  email: string;
  code: string;
  password: string;
  name: string;
}

export interface DingtalkLoginRequest {
  authCode: string;
}
