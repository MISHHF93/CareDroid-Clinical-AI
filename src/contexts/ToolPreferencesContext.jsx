import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import logger from '../utils/logger';

const STORAGE_KEY = 'careDroid.toolPrefs.v1';
const MAX_RECENT = 6;

const ToolPreferencesContext = createContext({
  favorites: [],
  pinned: [],
  recentTools: [],
  toggleFavorite: () => {},
  togglePinned: () => {},
  recordToolAccess: () => {},
  clearRecentTools: () => {}
});

export const useToolPreferences = () => {
  const context = useContext(ToolPreferencesContext);
  if (!context) {
    throw new Error('useToolPreferences must be used within ToolPreferencesProvider');
  }
  return context;
};

const readStoredPrefs = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.warn('Failed to read tool preferences', { error });
    return null;
  }
};

export const ToolPreferencesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [pinned, setPinned] = useState([]);
  const [recentTools, setRecentTools] = useState([]);

  useEffect(() => {
    const stored = readStoredPrefs();
    if (stored) {
      setFavorites(Array.isArray(stored.favorites) ? stored.favorites : []);
      setPinned(Array.isArray(stored.pinned) ? stored.pinned : []);
      setRecentTools(Array.isArray(stored.recentTools) ? stored.recentTools : []);
    }
  }, []);

  useEffect(() => {
    const payload = {
      favorites,
      pinned,
      recentTools
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      logger.warn('Failed to persist tool preferences', { error });
    }
  }, [favorites, pinned, recentTools]);

  const toggleFavorite = useCallback((toolId) => {
    setFavorites((prev) => {
      const next = prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [toolId, ...prev];
      return [...new Set(next)];
    });
  }, []);

  const togglePinned = useCallback((toolId) => {
    setPinned((prev) => {
      const next = prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [toolId, ...prev];
      return [...new Set(next)];
    });
  }, []);

  const recordToolAccess = useCallback((toolId) => {
    setRecentTools((prev) => {
      const next = [toolId, ...prev.filter((id) => id !== toolId)];
      return next.slice(0, MAX_RECENT);
    });
  }, []);

  const clearRecentTools = useCallback(() => {
    setRecentTools([]);
  }, []);

  const value = useMemo(() => ({
    favorites,
    pinned,
    recentTools,
    toggleFavorite,
    togglePinned,
    recordToolAccess,
    clearRecentTools
  }), [favorites, pinned, recentTools, toggleFavorite, togglePinned, recordToolAccess, clearRecentTools]);

  return (
    <ToolPreferencesContext.Provider value={value}>
      {children}
    </ToolPreferencesContext.Provider>
  );
};

export default ToolPreferencesContext;
