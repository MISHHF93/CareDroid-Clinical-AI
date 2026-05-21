const STORAGE_KEY = 'careDroid.sharedSessions.v1';

const loadSessions = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
};

const saveSessions = (sessions) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const createSharedSession = (data) => {
  const sessions = loadSessions();
  const id = `share-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  sessions[id] = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  saveSessions(sessions);
  return id;
};

export const getSharedSession = (id) => {
  const sessions = loadSessions();
  return sessions[id] || null;
};

export default {
  createSharedSession,
  getSharedSession,
};
