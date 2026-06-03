import { format } from 'date-fns';
import { env, hasRemoteApiConfig } from '@/config/env';
import { cloneDashboardMockData } from '@/mocks/dashboardMockData';
import type { AppDataSnapshot, AppDataSource, CalendarEvent, Photo } from '@/types/app';
import type { ApiCalendarEvent, PhotoAsset } from '@/types/api';
import { calendarApi } from './calendar';
import { photosApi } from './photos';

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
  caption: asset.fileName,
  date: asset.createdAt,
  uploadedBy: asset.uploadedBy
});

const toCalendarEvent = (event: ApiCalendarEvent, index: number): CalendarEvent => {
  const start = new Date(event.startAt);

  return {
    id: event.id,
    title: event.title,
    date: start,
    time: format(start, 'h:mm a'),
    color: eventPalette[index % eventPalette.length],
    assignee: event.ownerEmail || event.provider || 'Calendar',
    description: event.description || event.location
  };
};

class MockDashboardRepository implements DashboardRepository {
  async loadInitialData() {
    return {
      data: cloneDashboardMockData(),
      source: 'mock' as const
    };
  }
}

class RemoteDashboardRepository implements DashboardRepository {
  async loadInitialData() {
    const mockData = cloneDashboardMockData();
    const now = new Date();

    const [photoData, monthView] = await Promise.all([
      photosApi.list(),
      calendarApi.getMonthView(env.ownerEmail, now.getFullYear(), now.getMonth() + 1)
    ]);

    return {
      data: {
        ...mockData,
        photos: photoData.items.map(toPhoto),
        calendarEvents: monthView.events.map(toCalendarEvent)
      },
      source: 'api' as const
    };
  }
}

export const createDashboardRepository = (): DashboardRepository => {
  if (env.useMockData || !hasRemoteApiConfig) {
    return new MockDashboardRepository();
  }

  return new RemoteDashboardRepository();
};
