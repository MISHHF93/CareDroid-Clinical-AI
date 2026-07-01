const STORAGE_KEY = 'careDroid.sharedSessions.v1';
const SHARED_SESSION_RETENTION_DAYS = 30;

const expiresAtForNewSession = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SHARED_SESSION_RETENTION_DAYS);
  return expiresAt.toISOString();
};

const loadSessions = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error: any) {
    if (import.meta.env?.DEV) {
      console.warn('Failed to load local shared sessions', error);
    }
    return {};
  }
};

const saveSessions = (sessions) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const buildSharedSessionUrl = (shareId, origin = window.location.origin) =>
  `${origin}/shared/tools/${shareId}`;

export const createSharedSession = (data) => {
  const sessions = loadSessions();
  const id = `share-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  sessions[id] = {
    ...data,
    id,
    scope: 'local-browser',
    createdAt: new Date().toISOString(),
    expiresAt: expiresAtForNewSession(),
  };
  saveSessions(sessions);
  return id;
};

export const getSharedSession = (id) => {
  const sessions = loadSessions();
  const session = sessions[id] || null;
  if (!session?.expiresAt) return session;
  if (Date.parse(session.expiresAt) > Date.now()) return session;

  delete sessions[id];
  saveSessions(sessions);
  return null;
};

export default {
  buildSharedSessionUrl,
  createSharedSession,
  getSharedSession,
};
