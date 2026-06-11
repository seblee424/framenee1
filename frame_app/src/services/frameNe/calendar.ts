import { env } from '@/config/env';
import { apiClient } from '@/lib/http/apiClient';
import type { DayViewData, MonthViewData } from '@/types/api';

const path = env.calendarPath;

export const calendarApi = {
  getAuthUrl() {
    return apiClient.get<{ auth_url: string }>(path, { action: 'url' });
  },

  isConnected(email: string) {
    return apiClient.get<{ connected: boolean }>(path, {
      action: 'connected',
      email
    });
  },

  sync(email: string) {
    return apiClient.get<{ success: boolean; events_synced: number; items: MonthViewData['events'] }>(
      path,
      {
        action: 'sync',
        email
      }
    );
  },

  getDayView(email: string, date: string) {
    return apiClient.get<DayViewData>(path, {
      action: 'day',
      email,
      date
    });
  },

  getMonthView(email: string, year: number, month: number) {
    return apiClient.get<MonthViewData>(path, {
      action: 'month',
      email,
      year,
      month
    });
  }
};
