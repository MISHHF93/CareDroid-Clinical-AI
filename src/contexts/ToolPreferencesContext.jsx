import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import logger from '../utils/logger';

const STORAGE_KEY = 'careDroid.toolPrefs.v1';
const MAX_RECENT = 6;

const ToolPreferencesContext = createContext({
  favorites: [],
  pinned: [],
  recentTools: [],
  hiddenTools: [],
  profileSettings: {},
  toggleFavorite: () => {},
  togglePinned: () => {},
  toggleHidden: () => {},
  recordToolAccess: () => {},
  clearRecentTools: () => {},
  updateProfileSettings: () => {},
  resetToolRecommendations: () => {},
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
  const [hiddenTools, setHiddenTools] = useState([]);
  const [profileSettings, setProfileSettings] = useState({});

  useEffect(() => {
    const stored = readStoredPrefs();
    if (stored) {
      setFavorites(Array.isArray(stored.favorites) ? stored.favorites : []);
      setPinned(Array.isArray(stored.pinned) ? stored.pinned : []);
      setRecentTools(Array.isArray(stored.recentTools) ? stored.recentTools : []);
      setHiddenTools(Array.isArray(stored.hiddenTools) ? stored.hiddenTools : []);
      setProfileSettings(stored.profileSettings && typeof stored.profileSettings === 'object' ? stored.profileSettings : {});
    }
  }, []);

  useEffect(() => {
    const payload = {
      favorites,
      pinned,
      recentTools,
      hiddenTools,
      profileSettings,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      logger.warn('Failed to persist tool preferences', { error });
    }
  }, [favorites, pinned, recentTools, hiddenTools, profileSettings]);

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

  const toggleHidden = useCallback((toolId) => {
    setHiddenTools((prev) => {
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

  const updateProfileSettings = useCallback((updates) => {
    setProfileSettings((prev) => ({
      ...prev,
      ...(updates || {}),
    }));
  }, []);

  const resetToolRecommendations = useCallback(() => {
    setFavorites([]);
    setHiddenTools([]);
    setRecentTools([]);
  }, []);

  const value = useMemo(() => ({
    favorites,
    pinned,
    recentTools,
    hiddenTools,
    profileSettings,
    toggleFavorite,
    togglePinned,
    toggleHidden,
    recordToolAccess,
    clearRecentTools,
    updateProfileSettings,
    resetToolRecommendations,
  }), [
    favorites,
    pinned,
    recentTools,
    hiddenTools,
    profileSettings,
    toggleFavorite,
    togglePinned,
    toggleHidden,
    recordToolAccess,
    clearRecentTools,
    updateProfileSettings,
    resetToolRecommendations,
  ]);

  return (
    <ToolPreferencesContext.Provider value={value}>
      {children}
    </ToolPreferencesContext.Provider>
  );
};

export default ToolPreferencesContext;
