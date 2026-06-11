import { apiClient } from '@/lib/http/apiClient';
import type { User } from '@/types/auth';

const TOKEN_KEY = 'framene.auth_token';
const USER_KEY = 'framene.user_data';

export const authService = {
  // Token management
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  saveToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getSavedUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  saveUser(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  // Auth API calls

  /** 发送手机验证码 */
  async sendPhoneCode(phone: string): Promise<void> {
    await apiClient.post('/api/auth/send-code', { phone });
  },

  /** 手机验证码登录 */
  async loginWithPhone(phone: string, code: string): Promise<User> {
    const result = await apiClient.post<{ token: string; user: User }>(
      '/api/auth/phone-login',
      { phone, code }
    );
    this.saveToken(result.token);
    this.saveUser(result.user);
    return result.user;
  },

  /** 发送邮箱验证码 */
  async sendEmailCode(email: string): Promise<void> {
    await apiClient.post('/api/auth/send-email-code', { email });
  },

  /** 邮箱验证码注册 */
  async registerWithEmail(
    email: string,
    code: string,
    password: string,
    name: string
  ): Promise<User> {
    const result = await apiClient.post<{ token: string; user: User }>(
      '/api/auth/email-code-register',
      { email, code, password, name }
    );
    this.saveToken(result.token);
    this.saveUser(result.user);
    return result.user;
  },

  /** 邮箱密码登录 */
  async loginWithEmail(email: string, password: string): Promise<User> {
    const result = await apiClient.post<{ token: string; user: User }>(
      '/api/auth/email-login',
      { email, password }
    );
    this.saveToken(result.token);
    this.saveUser(result.user);
    return result.user;
  },

  /** 钉钉登录 */
  async loginWithDingtalk(authCode: string): Promise<User> {
    const result = await apiClient.post<{ token: string; user: User }>(
      '/api/auth/dingtalk-login',
      { auth_code: authCode }
    );
    this.saveToken(result.token);
    this.saveUser(result.user);
    return result.user;
  },

  /** 获取钉钉 OAuth 授权 URL */
  async getDingtalkAuthUrl(): Promise<string> {
    const result = await apiClient.get<{ auth_url: string }>(
      '/api/auth/dingtalk-auth-url'
    );
    return result.auth_url;
  },

  /** 获取当前用户信息 */
  async getMe(): Promise<User> {
    return apiClient.get<User>('/api/auth/me');
  },

  /** 更新用户信息 */
  async updateProfile(data: { name?: string; avatarUrl?: string }): Promise<User> {
    const result = await apiClient.put<User>('/api/auth/me', data);
    this.saveUser(result);
    return result;
  },

  /** 退出登录 */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // 即使后端请求失败也清除本地状态
    }
    this.clearToken();
  },
};
