import { apiClient } from '@/lib/http/apiClient';
import type { ApiListData, PhotoAsset } from '@/types/api';

export const photosApi = {
  list(limit = 20, offset = 0) {
    return apiClient.get<ApiListData<PhotoAsset>>('/photos', { limit, offset });
  },

  upload(base64Image: string, fileName: string, uploadedBy: string) {
    return apiClient.post<PhotoAsset>('/photos/upload', {
      image: base64Image,
      fileName,
      uploadedBy
    });
  },

  remove(id: string) {
    return apiClient.delete<{ success: true }>(`/photos/${id}`);
  }
};
