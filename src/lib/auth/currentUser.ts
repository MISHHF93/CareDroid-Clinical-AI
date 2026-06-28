import type { CareDroidUserProfile } from '../users/userTypes';
import { getDemoUserById, getDefaultDemoUser } from '../users/demoUsers';

export const DEMO_USER_STORAGE_KEY = 'cd_demo_user_id';

export function readCurrentDemoUserId(): string | null {
  try {
    return localStorage.getItem(DEMO_USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeCurrentDemoUserId(id: string): void {
  try {
    localStorage.setItem(DEMO_USER_STORAGE_KEY, id);
  } catch {
    // Storage unavailable — silent fail, demo session will reset on reload
  }
}

export function clearCurrentDemoUser(): void {
  try {
    localStorage.removeItem(DEMO_USER_STORAGE_KEY);
  } catch {
    // Silent fail
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
