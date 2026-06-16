import { apiClient } from '@/lib/http/apiClient';

export interface PhotoAsset {
  id: string;
  url: string;
  file_name: string;
  storage_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  user_id?: number;
  owner_email?: string;
}

export interface PhotosListResponse {
  items: PhotoAsset[];
}

export const photosApi = {
  /** 获取当前用户的照片列表 */
  list(userId?: number, limit = 50, offset = 0) {
    const query: Record<string, string | number> = { limit, offset };
    if (userId !== undefined) query.userId = userId;
    return apiClient.get<PhotosListResponse>('/api/photos', query);
  },

  /** 上传照片（multipart form） */
  upload(file: File, ownerEmail?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (ownerEmail) formData.append('ownerEmail', ownerEmail);

    return fetch(`${apiClient['baseUrl']}/api/photos/upload`, {
      method: 'POST',
      body: formData,
    }).then(r => r.json());
  },

  /** 上传照片（base64，适合 Flutter Web / 浏览器） */
  uploadBase64(imageBase64: string, fileName: string, ownerEmail?: string) {
    return apiClient.post<PhotoAsset>('/api/photos/upload-base64', {
      imageBase64,
      fileName,
      ownerEmail,
    });
  },

  /** 删除照片 */
  remove(id: string) {
    return apiClient.delete<{ id: string }>(`/api/photos/${id}`);
  },
};
