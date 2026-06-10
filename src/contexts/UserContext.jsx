import React, { createContext, useContext, useState, useEffect } from 'react';
import { createLocalPlatformAccessSession } from '../auth/devAuthBypass';
import { AUTH_CONFIG } from '../config/auth.config';
import { apiFetchJson } from '../services/apiClient';
import logger from '../utils/logger';

/**
 * User Context for managing authentication and role-based access
 * 
 * Provides user information and role-based permission checking
 * throughout the application.
 */

const AUTH_TOKEN_KEY = AUTH_CONFIG.tokenStorageKey;
const USER_PROFILE_KEY = AUTH_CONFIG.userProfileStorageKey;

// Permission enum (matches backend)
export const Permission = {
  // PHI Data Access
  READ_PHI: 'READ_PHI',
  WRITE_PHI: 'WRITE_PHI',
  EXPORT_PHI: 'EXPORT_PHI',
  DELETE_PHI: 'DELETE_PHI',

  // Clinical Tools
  USE_CALCULATORS: 'USE_CALCULATORS',
  USE_DRUG_CHECKER: 'USE_DRUG_CHECKER',
  USE_LAB_INTERPRETER: 'USE_LAB_INTERPRETER',
  USE_PROTOCOLS: 'USE_PROTOCOLS',
  USE_AI_CHAT: 'USE_AI_CHAT',

  // User Management
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  VIEW_USERS: 'VIEW_USERS',

  // Audit & Compliance
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  EXPORT_AUDIT_LOGS: 'EXPORT_AUDIT_LOGS',
  VERIFY_AUDIT_INTEGRITY: 'VERIFY_AUDIT_INTEGRITY',
  VIEW_PHI_AUDIT: 'VIEW_PHI_AUDIT',

  // System Administration
  CONFIGURE_SYSTEM: 'CONFIGURE_SYSTEM',
  MANAGE_ENCRYPTION: 'MANAGE_ENCRYPTION',
  MANAGE_SUBSCRIPTIONS: 'MANAGE_SUBSCRIPTIONS',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  MANAGE_CONSENT: 'MANAGE_CONSENT',
  MANAGE_PRIVACY: 'MANAGE_PRIVACY',

  // Platform Governance
  VIEW_GOVERNANCE: 'VIEW_GOVERNANCE',
  MANAGE_CLINICAL_POLICY: 'MANAGE_CLINICAL_POLICY',
  APPROVE_CLINICAL_POLICY: 'APPROVE_CLINICAL_POLICY',
  REVIEW_SAFETY_FINDINGS: 'REVIEW_SAFETY_FINDINGS',
  VIEW_AI_SECURITY: 'VIEW_AI_SECURITY',
  MANAGE_AI_SECURITY: 'MANAGE_AI_SECURITY',
  REVIEW_AI_SECURITY_INCIDENTS: 'REVIEW_AI_SECURITY_INCIDENTS',
  VIEW_INTEGRATIONS: 'VIEW_INTEGRATIONS',
  MANAGE_INTEGRATIONS: 'MANAGE_INTEGRATIONS',
  IMPORT_PATIENT_DATA: 'IMPORT_PATIENT_DATA',
  RESOLVE_DATA_CONFLICTS: 'RESOLVE_DATA_CONFLICTS',
  BREAK_GLASS_ACCESS: 'BREAK_GLASS_ACCESS',
  VIEW_REGULATORY: 'VIEW_REGULATORY',
  MANAGE_REGULATORY: 'MANAGE_REGULATORY',
  APPROVE_REGULATORY: 'APPROVE_REGULATORY',
  VIEW_EQUITY_METRICS: 'VIEW_EQUITY_METRICS',
  MANAGE_EQUITY_COHORTS: 'MANAGE_EQUITY_COHORTS',
  REVIEW_BIAS_FINDINGS: 'REVIEW_BIAS_FINDINGS',
  EXPORT_EQUITY_REPORTS: 'EXPORT_EQUITY_REPORTS',
  VIEW_VALIDATION: 'VIEW_VALIDATION',
  MANAGE_VALIDATION: 'MANAGE_VALIDATION',
  RUN_VALIDATION: 'RUN_VALIDATION',
  APPROVE_VALIDATION: 'APPROVE_VALIDATION',
  VIEW_REVIEW_QUEUE: 'VIEW_REVIEW_QUEUE',
  REVIEW_CLINICAL_AI: 'REVIEW_CLINICAL_AI',
  REVIEW_DOCUMENTATION: 'REVIEW_DOCUMENTATION',
  REVIEW_PRIVACY_REQUESTS: 'REVIEW_PRIVACY_REQUESTS',
  REVIEW_GOVERNANCE: 'REVIEW_GOVERNANCE',
  VIEW_PRIVACY_CENTER: 'VIEW_PRIVACY_CENTER',
  VIEW_PHI_ACCESS_LOGS: 'VIEW_PHI_ACCESS_LOGS',
  REQUEST_DATA_EXPORT: 'REQUEST_DATA_EXPORT',
  APPROVE_DATA_RIGHTS_REQUESTS: 'APPROVE_DATA_RIGHTS_REQUESTS',
  VIEW_OPERATIONS: 'VIEW_OPERATIONS',
  VIEW_OBSERVABILITY: 'VIEW_OBSERVABILITY',
  MANAGE_INCIDENTS: 'MANAGE_INCIDENTS',

  // Emergency & Safety
  TRIGGER_EMERGENCY_PROTOCOL: 'TRIGGER_EMERGENCY_PROTOCOL',
  OVERRIDE_SAFETY_CHECKS: 'OVERRIDE_SAFETY_CHECKS',

  // Two-Factor Authentication
  ENFORCE_MFA: 'ENFORCE_MFA',
  MANAGE_MFA: 'MANAGE_MFA',
};

// Role permissions mapping (matches backend config)
const RolePermissions = {
  student: [
    Permission.USE_CALCULATORS,
    Permission.USE_DRUG_CHECKER,
    Permission.USE_LAB_INTERPRETER,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,
  ],
  nurse: [
    Permission.READ_PHI,
    Permission.WRITE_PHI,
    Permission.USE_CALCULATORS,
    Permission.USE_DRUG_CHECKER,
    Permission.USE_LAB_INTERPRETER,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,
    Permission.TRIGGER_EMERGENCY_PROTOCOL,
  ],
  physician: [
    Permission.READ_PHI,
    Permission.WRITE_PHI,
    Permission.EXPORT_PHI,
    Permission.DELETE_PHI,
    Permission.USE_CALCULATORS,
    Permission.USE_DRUG_CHECKER,
    Permission.USE_LAB_INTERPRETER,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,
    Permission.TRIGGER_EMERGENCY_PROTOCOL,
    Permission.OVERRIDE_SAFETY_CHECKS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_REVIEW_QUEUE,
    Permission.REVIEW_CLINICAL_AI,
    Permission.REVIEW_DOCUMENTATION,
    Permission.VIEW_GOVERNANCE,
    Permission.VIEW_REGULATORY,
    Permission.VIEW_VALIDATION,
  ],
  admin: Object.values(Permission), // Admin has all permissions
};

const UserContext = createContext({
  user: null,
  authToken: '',
  isAuthenticated: false,
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
  const [user, setUserState] = useState(null);
  const [authToken, setAuthTokenState] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage on mount
  useEffect(() => {
    logger.info('UserContext initialization');
    
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedProfile = localStorage.getItem(USER_PROFILE_KEY);

    logger.debug('localStorage snapshot', {
      hasToken: Boolean(storedToken),
      hasProfile: Boolean(storedProfile),
      tokenValue: storedToken,
    });
    if (storedProfile) {
      try {
        logger.debug('Stored profile data', { profile: JSON.parse(storedProfile) });
      } catch (e) {
        logger.warn('Stored profile parse error', { error: e });
      }
    }

    // Load token
    if (storedToken) {
      logger.info('Loading token into state');
      setAuthTokenState(storedToken);
    } else {
      const session = createLocalPlatformAccessSession();
      logger.info('No stored token found; starting platform access session');
      setAuthTokenState(session.token);
      setUserState(session.user);
      setIsLoading(false);
      return;
    }

    // Load profile
    let loadedProfile = false;
    if (storedProfile) {
      try {
        const profile = JSON.parse(storedProfile);
        logger.info('Loading profile into state', { profile });
        setUserState(profile);
        loadedProfile = true;
      } catch (error) {
        logger.error('Failed to parse stored user profile', { error });
        localStorage.removeItem(USER_PROFILE_KEY);
      }
    } else {
      logger.warn('No profile in localStorage');
    }

    if (!storedToken || loadedProfile) {
      setIsLoading(false);
    }
    logger.info('UserContext init complete');
  }, []);

  // Fetch user profile when token changes
  useEffect(() => {
    if (!authToken) {
      setIsLoading(false);
      return undefined;
    }
    if (user) {
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;

    const fetchUserProfile = async () => {
      setIsLoading(true);
      try {
        const { response, data: profile } = await apiFetchJson('/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          if (!cancelled) {
            setUserState(profile);
            localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
          }
        } else {
          // If profile fetch fails and we're in dev mode, use mock profile
          const storedProfile = localStorage.getItem(USER_PROFILE_KEY);
          if (storedProfile) {
            try {
              const profile = JSON.parse(storedProfile);
              if (!cancelled) setUserState(profile);
              logger.info('Using stored mock profile from localStorage');
            } catch (parseError) {
              logger.error('Failed to parse stored profile', { error: parseError });
            }
          }
        }
      } catch (error) {
        logger.error('Failed to fetch user profile', { error });
        // Try to use stored mock profile if backend is unavailable
        const storedProfile = localStorage.getItem(USER_PROFILE_KEY);
        if (storedProfile) {
          try {
            const profile = JSON.parse(storedProfile);
            if (!cancelled) setUserState(profile);
            logger.info('Using stored mock profile (backend unavailable)');
          } catch (parseError) {
            logger.error('Failed to parse stored profile', { error: parseError });
          }
        } else if (!cancelled) {
          const session = createLocalPlatformAccessSession();
          setAuthTokenState(session.token);
          setUserState(session.user);
          logger.info('Using platform access profile (backend unavailable)');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchUserProfile();
    return () => {
      cancelled = true;
    };
  }, [authToken, user]);

  const setUser = (newUser) => {
    setUserState(newUser);
    if (newUser) {
      setIsLoading(false);
    }
    if (newUser) {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(USER_PROFILE_KEY);
    }
  };

  const setAuthToken = (token) => {
    setAuthTokenState(token);
    if (token) {
      if (!user) setIsLoading(true);
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      setIsLoading(false);
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  };

  const signOut = () => {
    const session = createLocalPlatformAccessSession();
    setUserState(session.user);
    setAuthTokenState(session.token);
    setIsLoading(false);
  };

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission) => {
    if (!user || !user.role) return false;
    const rolePermissions = RolePermissions[user.role] || [];
    return rolePermissions.includes(permission);
  };

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = (permissions) => {
    if (!user || !user.role) return false;
    const rolePermissions = RolePermissions[user.role] || [];
    return permissions.some((permission) => rolePermissions.includes(permission));
  };

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = (permissions) => {
    if (!user || !user.role) return false;
    const rolePermissions = RolePermissions[user.role] || [];
    return permissions.every((permission) => rolePermissions.includes(permission));
  };

  const isAuthenticated = Boolean(authToken);
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
