import { apiClient } from '@/lib/http/apiClient';

export interface ApiCalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  location?: string;
  provider?: string;
  user_id?: number;
}

export interface EventsListResponse {
  items: ApiCalendarEvent[];
}

export const eventsApi = {
  /** 获取当前用户的事件列表（支持按时间范围筛选） */
  list(startAt?: string, endAt?: string) {
    const query: Record<string, string> = {};
    if (startAt) query.startAt = startAt;
    if (endAt) query.endAt = endAt;
    return apiClient.get<EventsListResponse>('/api/events', query);
  },

  /** 创建事件 */
  create(data: {
    title: string;
    description?: string;
    startAt: string;
    endAt: string;
    location?: string;
  }) {
    return apiClient.post<ApiCalendarEvent>('/api/events', data);
  },

  /** 更新事件 */
  update(id: string, data: Partial<{
    title: string;
    description: string;
    startAt: string;
    endAt: string;
    location: string;
  }>) {
    return apiClient.put<ApiCalendarEvent>(`/api/events/${id}`, data);
  },

  /** 删除事件 */
  remove(id: string) {
    return apiClient.delete<{ id: string }>(`/api/events/${id}`);
  },

  /** AI 解析自然语言日程文本 */
  parseVoice(text: string, timezone?: string, utcOffset?: number) {
    return apiClient.post<{ source: 'ai' | 'regex'; items: Array<{ title: string; startAt: string; endAt: string; location?: string }> }>('/api/web/events/parse-voice', { text, timezone, utcOffset });
  },

  /** 语音/文字创建事件（写入 web_calendar_events 表） */
  webVoiceCreate(data: {
    items: Array<{ title: string; startAt: string; endAt: string; description?: string; location?: string }>,
    sourceEmail?: string,
    sourceAppUserId?: string,
  }) {
    return apiClient.post<{ items: Array<{ id: string; title: string; startAt: string; endAt: string }>; count: number }>('/api/web/events/voice-create', data);
  },

  /** 语音/文字创建事件（先解析再创建） */
  voiceCreate(data: { items: Array<{
    title: string;
    description?: string;
    startAt: string;
    endAt: string;
    location?: string;
  }> }) {
    return apiClient.post<{ items: ApiCalendarEvent[]; skipped: any[] }>('/api/events/voice', data);
  },

  /** 语音转写 + 解析自然语言 */
  transcribe(text: string) {
    return apiClient.post<{
      rawTranscript: string;
      cleanedRequest: string;
      calendarEvents: ApiCalendarEvent[];
      warnings: string[];
    }>('/api/events/voice/transcribe', { text });
  },
};
