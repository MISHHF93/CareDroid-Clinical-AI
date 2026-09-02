import type { CareDroidUserProfile } from '../users/userTypes';
import { getDemoUserById, getDefaultDemoUser } from '../users/demoUsers';

export const DEMO_USER_STORAGE_KEY = 'cd_demo_user_id';

export function readCurrentDemoUserId(): string | null {
  try {
    return localStorage.getItem(DEMO_USER_STORAGE_KEY);
  } catch {
    // Expected when localStorage is unavailable (SSR, privacy mode).
    return null;
  }
}

export function writeCurrentDemoUserId(id: string): void {
  try {
    localStorage.setItem(DEMO_USER_STORAGE_KEY, id);
  } catch {
    // Expected when localStorage is full or unavailable — demo session will reset on reload.
  }
}

export function clearCurrentDemoUser(): void {
  try {
    localStorage.removeItem(DEMO_USER_STORAGE_KEY);
  } catch {
    // Expected when localStorage is unavailable — user state will be stale until reload.
  }
}

export function resolveCurrentDemoUser(): CareDroidUserProfile {
  const storedId = readCurrentDemoUserId();
  if (storedId) {
    const found = getDemoUserById(storedId);
    if (found) return found;
  }
  return getDefaultDemoUser();
}
