export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:3000',
  ownerEmail: import.meta.env.VITE_OWNER_EMAIL?.trim() ?? '',
};

export const hasRemoteApiConfig = env.apiBaseUrl.length > 0;
