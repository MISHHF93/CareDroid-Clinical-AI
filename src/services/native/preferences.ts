// Web-first preference storage. Uses localStorage so the TypeScript platform owns state.

const KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
  USER_EMAIL: 'user_email',
  USER_ROLE: 'user_role',
  PUSH_NOTIFICATIONS: 'push_notifications',
  EMAIL_NOTIFICATIONS: 'email_notifications',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  TWO_FACTOR_ENABLED: 'two_factor_enabled',
  THEME_MODE: 'theme_mode',
} as const;

function storage(): Storage | undefined {
  return typeof localStorage === 'undefined' ? undefined : localStorage;
}

async function get(key: string): Promise<string | null> {
  return storage()?.getItem(key) ?? null;
}

async function set(key: string, value: string): Promise<void> {
  storage()?.setItem(key, value);
}

async function remove(key: string): Promise<void> {
  storage()?.removeItem(key);
}

async function clearAll(): Promise<void> {
  const store = storage();
  if (!store) return;
  Object.values(KEYS).forEach((key) => store.removeItem(key));
}

export const nativePreferences = {
  getAuthToken: () => get(KEYS.AUTH_TOKEN),
  setAuthToken: (token: string) => set(KEYS.AUTH_TOKEN, token),
  clearAuthToken: () => remove(KEYS.AUTH_TOKEN),

  getRefreshToken: () => get(KEYS.REFRESH_TOKEN),
  setRefreshToken: (token: string) => set(KEYS.REFRESH_TOKEN, token),
  clearRefreshToken: () => remove(KEYS.REFRESH_TOKEN),

  getUserId: () => get(KEYS.USER_ID),
  setUserId: (id: string) => set(KEYS.USER_ID, id),

  getUserEmail: () => get(KEYS.USER_EMAIL),
  setUserEmail: (email: string) => set(KEYS.USER_EMAIL, email),

  getUserRole: () => get(KEYS.USER_ROLE),
  setUserRole: (role: string) => set(KEYS.USER_ROLE, role),

  getPushNotificationsEnabled: async () => (await get(KEYS.PUSH_NOTIFICATIONS)) !== 'false',
  setPushNotificationsEnabled: (enabled: boolean) =>
    set(KEYS.PUSH_NOTIFICATIONS, String(enabled)),

  getEmailNotificationsEnabled: async () => (await get(KEYS.EMAIL_NOTIFICATIONS)) !== 'false',
  setEmailNotificationsEnabled: (enabled: boolean) =>
    set(KEYS.EMAIL_NOTIFICATIONS, String(enabled)),

  getBiometricEnabled: async () => (await get(KEYS.BIOMETRIC_ENABLED)) === 'true',
  setBiometricEnabled: (enabled: boolean) => set(KEYS.BIOMETRIC_ENABLED, String(enabled)),

  getTwoFactorEnabled: async () => (await get(KEYS.TWO_FACTOR_ENABLED)) === 'true',
  setTwoFactorEnabled: (enabled: boolean) => set(KEYS.TWO_FACTOR_ENABLED, String(enabled)),

  getThemeMode: async () => (await get(KEYS.THEME_MODE)) ?? 'SYSTEM',
  setThemeMode: (mode: string) => set(KEYS.THEME_MODE, mode),

  clearAll,
};
