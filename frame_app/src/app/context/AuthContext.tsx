import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@/types/auth';
import { authService } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithPhone: (phone: string, code: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, code: string, password: string, name: string) => Promise<void>;
  loginWithDingtalk: (authCode: string) => Promise<void>;
  sendPhoneCode: (phone: string) => Promise<void>;
  sendEmailCode: (email: string) => Promise<void>;
  getDingtalkAuthUrl: () => Promise<string>;
  updateProfile: (data: { name?: string; avatarUrl?: string }) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：从 localStorage 恢复登录状态
  useEffect(() => {
    const savedToken = authService.getToken();
    const savedUser = authService.getSavedUser();
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(savedUser);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (user: User) => {
    setUser(user);
    setToken(authService.getToken());
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,

    sendPhoneCode: async (phone) => {
      await authService.sendPhoneCode(phone);
    },

    loginWithPhone: async (phone, code) => {
      const user = await authService.loginWithPhone(phone, code);
      handleLogin(user);
    },

    sendEmailCode: async (email) => {
      await authService.sendEmailCode(email);
    },

    loginWithEmail: async (email, password) => {
      const user = await authService.loginWithEmail(email, password);
      handleLogin(user);
    },

    registerWithEmail: async (email, code, password, name) => {
      const user = await authService.registerWithEmail(email, code, password, name);
      handleLogin(user);
    },

    loginWithDingtalk: async (authCode) => {
      const user = await authService.loginWithDingtalk(authCode);
      handleLogin(user);
    },

    getDingtalkAuthUrl: async () => {
      return authService.getDingtalkAuthUrl();
    },

    updateProfile: async (data) => {
      const updatedUser = await authService.updateProfile(data);
      setUser(updatedUser);
      return updatedUser;
    },

    logout: async () => {
      await authService.logout();
      setUser(null);
      setToken(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
