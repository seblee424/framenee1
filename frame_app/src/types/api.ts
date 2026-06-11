export interface PhotoAsset {
  id: string;
  url: string;
  fileName: string;
  createdAt: string;
  uploadedBy: string;
  ownerEmail?: string;
}

export interface ApiCalendarEvent {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  location?: string;
  provider: 'google' | 'manual' | string;
  ownerEmail?: string;
}

export interface DayItem {
  date: string;
  hasEvent: boolean;
  isToday: boolean;
  isSelected: boolean;
  dayOfWeek: number;
}

export interface DayViewData {
  date: string;
  days: DayItem[];
  events: ApiCalendarEvent[];
}

export interface MonthViewData {
  year: number;
  month: number;
  days: DayItem[];
  events: ApiCalendarEvent[];
}

export interface DeviceSettings {
  photoInterval: number;
  timezone: string;
  nightMode: boolean;
  brightness: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: 'frame' | 'tablet' | 'eink';
  lastSyncAt: string;
  isOnline: boolean;
  bindCode?: string;
  settings: DeviceSettings;
}

export interface DeviceFeed {
  photos: {
    current: PhotoAsset;
    next: PhotoAsset;
    interval: number;
  };
  calendar: {
    today: {
      date: string;
      count: number;
      events: ApiCalendarEvent[];
    };
    upcoming: ApiCalendarEvent[];
  };
  device: {
    syncedAt: string;
    ttl: number;
  };
}

export interface ApiSuccessResponse<T> {
  status: 'ok';
  data: T;
}

export interface ApiErrorResponse {
  status: 'error';
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ApiListData<T> {
  items: T[];
  total: number;
  hasMore?: boolean;
}
