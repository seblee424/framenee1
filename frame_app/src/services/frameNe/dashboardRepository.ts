import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { env } from '@/config/env';
import type { AppDataSnapshot, AppDataSource, CalendarEvent, Photo } from '@/types/app';
import { webEventsApi } from './webEvents';
import type { WebCalendarEvent } from './webEvents';
import { photosApi } from './photos';
import type { PhotoAsset } from './photos';

export interface DashboardLoadResult {
  data: AppDataSnapshot;
  source: AppDataSource;
}

export interface DashboardRepository {
  loadInitialData(): Promise<DashboardLoadResult>;
}

const eventPalette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const toPhoto = (asset: PhotoAsset): Photo => ({
  id: asset.id,
  url: asset.url,
  caption: asset.file_name,
  date: asset.created_at,
  uploadedBy: asset.owner_email || '未知',
});

const toCalendarEvent = (event: WebCalendarEvent, index: number): CalendarEvent => {
  const start = new Date(event.start_at);
  return {
    id: event.id,
    title: event.title,
    date: start,
    time: format(start, 'HH:mm', { locale: zhCN }),
    color: eventPalette[index % eventPalette.length],
    assignee: 'FrameNe',
    description: event.description || event.location,
    completed: event.status === 'completed',
  };
};

class RemoteDashboardRepository implements DashboardRepository {
  async loadInitialData() {
    const emptyData: AppDataSnapshot = {
      familyMembers: [],
      calendarEvents: [],
      tasks: [],
      rewards: [],
      photos: [],
    };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const [photoData, eventData] = await Promise.all([
      photosApi.list().catch(() => ({ items: [] as PhotoAsset[] })),
      webEventsApi.list(monthStart, monthEnd).catch(() => ({ items: [] as WebCalendarEvent[] })),
    ]);

    return {
      data: {
        ...emptyData,
        photos: photoData.items.map(toPhoto),
        calendarEvents: eventData.items.map((e, i) => toCalendarEvent(e, i)),
      },
      source: 'api' as const,
    };
  }
}

export const createDashboardRepository = (): DashboardRepository => {
  return new RemoteDashboardRepository();
};
