const asBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return value === 'true';
};

export const env = {
  useMockData: asBoolean(import.meta.env.VITE_USE_MOCK_DATA, true),
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.trim() ?? '',
  apiKey: import.meta.env.VITE_API_KEY?.trim() ?? '',
  calendarPath: import.meta.env.VITE_API_CALENDAR_PATH?.trim() || '/google-calendar-auth',
  ownerEmail: import.meta.env.VITE_OWNER_EMAIL?.trim() ?? '',
};

export const hasRemoteApiConfig =
  env.apiBaseUrl.length > 0 && env.apiKey.length > 0 && env.ownerEmail.length > 0;
