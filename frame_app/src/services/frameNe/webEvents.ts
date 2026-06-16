import { apiClient } from '@/lib/http/apiClient';

export interface WebCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  location?: string;
  source_email?: string;
  status: 'active' | 'completed' | 'deleted';
  synced_at: string;
}

export const webEventsApi = {
  /** App 同步日程到 Web */
  sync(items: Array<{ title: string; startAt: string; endAt: string; description?: string; location?: string; sourceAppUserId?: string }>, sourceEmail?: string) {
    return apiClient.post<{ synced: number; items: WebCalendarEvent[] }>('/api/web/events/sync', { items, sourceEmail });
  },

  /** 获取 Web 端日程 */
  list(startAt?: string, endAt?: string, sourceEmail?: string) {
    const query: Record<string, string> = {};
    if (startAt) query.startAt = startAt;
    if (endAt) query.endAt = endAt;
    if (sourceEmail) query.sourceEmail = sourceEmail;
    return apiClient.get<{ items: WebCalendarEvent[] }>('/api/web/events', query);
  },

  /** 切换完成状态 */
  toggleComplete(id: string) {
    return apiClient.put<{ success: boolean; status: string }>(`/api/web/events/${id}/complete`);
  },

  /** 删除日程（仅 Web 端） */
  remove(id: string) {
    return apiClient.delete<{ success: boolean }>(`/api/web/events/${id}`);
  },

  /** 获取用户已完成日程记录（支持按邮箱筛选） */
  getCompletedRecords(email?: string) {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return apiClient.get<{ items: CompletedEvent[] }>(`/api/web/events/completed-records${query}`);
  },

  /** 获取已完成日程记录汇总（按用户分组） */
  getCompletedSummary() {
    return apiClient.get<{ items: CompletedSummaryItem[] }>('/api/web/events/completed-summary');
  },
};

export interface CompletedEvent {
  id: string;
  event_id: string;
  source_app_user_id: string;
  source_email: string;
  title: string;
  completed_at: string;
}

export interface CompletedSummaryItem {
  source_email: string;
  source_app_user_id: string;
  total_completed: string;
  last_completed_at: string;
}
