import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import appConfig from '../config/appConfig';
import { AUTH_CONFIG } from '../config/auth.config';
import { deriveAuthMode } from '../auth/authSession';
import {
  buildOpenAccessDemoUser,
  hydrateStoredDemoUser,
  OPEN_ACCESS_USER_ID,
} from '../config/demoPersonaModel';
import {
  buildSecurityContextFromUser,
  checkAllPermissions as checkAllSecurityPermissions,
  checkAnyPermission as checkAnySecurityPermissions,
  checkPermission as checkSecurityPermission,
} from '../config/security';
import logger from '../utils/logger';

export { Permission } from '../config/backendPermissionCatalog';

/**
 * User Context for managing authentication and role-based access
 * 
 * Provides user information and role-based permission checking
 * throughout the application.
 */

const AUTH_TOKEN_KEY = AUTH_CONFIG.tokenStorageKey;
const LEGACY_AUTH_TOKEN_KEY = AUTH_CONFIG.legacyTokenStorageKey;
const USER_PROFILE_KEY = AUTH_CONFIG.userProfileStorageKey;
const OPEN_ACCESS_TOKEN = appConfig.dev.bearerToken || 'dev-bypass-token';

const OPEN_ACCESS_USER = buildOpenAccessDemoUser();

const canUseStorage = () => typeof localStorage !== 'undefined';

const readStoredUser = () => {
  if (!canUseStorage()) return null;
  const raw = localStorage.getItem(USER_PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.id === OPEN_ACCESS_USER_ID || parsed?.authMode === 'open-access') {
      return hydrateStoredDemoUser(parsed);
    }
    return hydrateStoredDemoUser(parsed);
  } catch {
    localStorage.removeItem(USER_PROFILE_KEY);
    return null;
  }
};

const readStoredToken = () => {
  if (!canUseStorage()) return '';
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(LEGACY_AUTH_TOKEN_KEY) || '';
};

const persistSession = (nextUser, nextToken) => {
  if (!canUseStorage()) return;
  const userToPersist = nextUser || OPEN_ACCESS_USER;
  const tokenToPersist = nextToken || OPEN_ACCESS_TOKEN;
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userToPersist));
  localStorage.setItem(AUTH_TOKEN_KEY, tokenToPersist);
  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
};

const UserContext = createContext<any>({
  user: null,
  authToken: '',
  isAuthenticated: false,
  isRealSession: false,
  authMode: 'open-access',
  isDevAuthBypass: false,
  isLoading: true,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  setUser: () => {},
  setAuthToken: () => {},
  signOut: () => {},
});

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [user, setUserState] = useState(() => readStoredUser() || OPEN_ACCESS_USER);
  const [authToken, setAuthTokenState] = useState(() => OPEN_ACCESS_TOKEN);
  const [isLoading] = useState(false);

  // Open-access build phase: always seed a local demo session for platform providers.
  useEffect(() => {
    persistSession(user, authToken);
    logger.info('Open access platform session initialized');
  }, [authToken, user]);

  const setUser = (newUser) => {
    const nextUser = newUser ? hydrateStoredDemoUser(newUser) : OPEN_ACCESS_USER;
    setUserState({ ...nextUser, authMode: 'open-access' });
    persistSession({ ...nextUser, authMode: 'open-access' }, OPEN_ACCESS_TOKEN);
  };

  const setAuthToken = () => {
    setAuthTokenState(OPEN_ACCESS_TOKEN);
    persistSession(user, OPEN_ACCESS_TOKEN);
  };

  const signOut = () => {
    setUserState(OPEN_ACCESS_USER);
    setAuthTokenState(OPEN_ACCESS_TOKEN);
    persistSession(OPEN_ACCESS_USER, OPEN_ACCESS_TOKEN);
  };

  /**
   * Check if user has a specific permission
   */
  const securityContext = useMemo(() => buildSecurityContextFromUser(user), [user]);

  const hasPermission = (permission) => {
    if (!user || !user.role) return false;
    return checkSecurityPermission(securityContext, permission);
  };

  const hasAnyPermission = (permissions) => {
    if (!user || !user.role) return false;
    return checkAnySecurityPermissions(securityContext, permissions);
  };

  const hasAllPermissions = (permissions) => {
    if (!user || !user.role) return false;
    return checkAllSecurityPermissions(securityContext, permissions);
  };

  const isAuthenticated = Boolean(user && authToken);
  const authMode = deriveAuthMode(user, authToken);
  const isRealSession = false;
  const isDevAuthBypass = Boolean(
    user?.isDevAuthBypass ||
      user?.authMode === 'platform-access' ||
      user?.authMode === 'local-dev-demo' ||
      user?.authMode === 'dev-demo'
  );

  // Debug logging for authentication state changes
  useEffect(() => {
    logger.debug('UserContext auth state changed', {
      hasAuthToken: Boolean(authToken),
      hasUser: Boolean(user),
      isAuthenticated,
      isDevAuthBypass,
    });
    if (user) {
      logger.debug('User details', { id: user.id, email: user.email, role: user.role });
    }
  }, [isAuthenticated, isDevAuthBypass, authToken, user]);

  const value = {
    user,
    authToken,
    isAuthenticated,
    isRealSession,
    authMode,
    isDevAuthBypass,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    setUser,
    setAuthToken,
    signOut,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserContext;
