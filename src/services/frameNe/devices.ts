import { apiClient } from '@/lib/http/apiClient';
import type { DeviceFeed, DeviceInfo, DeviceSettings } from '@/types/api';

export const devicesApi = {
  bind(bindCode: string, name?: string) {
    return apiClient.post<DeviceInfo>('/devices/bind', {
      bindCode,
      name
    });
  },

  getSettings(deviceId: string) {
    return apiClient.get<DeviceSettings>(`/devices/${deviceId}/settings`);
  },

  updateSettings(deviceId: string, settings: Partial<DeviceSettings>) {
    return apiClient.put<DeviceSettings>(`/devices/${deviceId}/settings`, settings);
  },

  getFeed(deviceId: string) {
    return apiClient.get<DeviceFeed>(`/devices/${deviceId}/feed`);
  }
};
