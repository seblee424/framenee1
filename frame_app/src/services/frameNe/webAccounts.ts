import { apiClient } from '@/lib/http/apiClient';

export interface DeviceAccount {
  id: string;
  email: string;
  name: string;
  login_provider: string;
  status: 'active' | 'deleted';
  last_sync_at: string | null;
  created_at: string;
}

export const webAccountsApi = {
  /** 获取设备账号列表 */
  list() {
    return apiClient.get<{ items: DeviceAccount[] }>('/api/web/accounts');
  },

  /** 同步账号到设备 */
  sync(email: string, name?: string, loginProvider?: string) {
    return apiClient.post<DeviceAccount>('/api/web/accounts/sync', { email, name, loginProvider });
  },

  /** 同步账号内容到 Web（服务端直连） */
  syncFromAccount(email: string) {
    return apiClient.post<{ synced: number; message: string }>('/api/web/events/sync-from-account', { email });
  },

  /** 删除设备账号（不影响 App 端） */
  remove(id: string) {
    return apiClient.delete<{ success: boolean }>(`/api/web/accounts/${id}`);
  },
};
