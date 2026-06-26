import React, { createContext, useContext, useState, useEffect } from 'react';
import appConfig from '../config/appConfig';
import { AUTH_CONFIG } from '../config/auth.config';
import { deriveAuthMode } from '../auth/authSession';
import {
  buildOpenAccessDemoUser,
  hydrateStoredDemoUser,
  OPEN_ACCESS_USER_ID,
} from '../config/demoPersonaModel';
import logger from '../utils/logger';

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
  MANAGE_ORGANIZATION: 'MANAGE_ORGANIZATION',

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
  charge_nurse: [
    Permission.READ_PHI,
    Permission.WRITE_PHI,
    Permission.USE_CALCULATORS,
    Permission.USE_DRUG_CHECKER,
    Permission.USE_LAB_INTERPRETER,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,
    Permission.TRIGGER_EMERGENCY_PROTOCOL,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_OPERATIONS,
  ],
  triage_nurse: [
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
  ed_manager: [
    Permission.READ_PHI,
    Permission.EXPORT_PHI,
    Permission.USE_CALCULATORS,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_OPERATIONS,
    Permission.VIEW_OBSERVABILITY,
    Permission.MANAGE_INCIDENTS,
  ],
  registration_clerk: [
    Permission.READ_PHI,
    Permission.WRITE_PHI,
    Permission.IMPORT_PATIENT_DATA,
  ],
  ems_user: [
    Permission.READ_PHI,
    Permission.WRITE_PHI,
    Permission.TRIGGER_EMERGENCY_PROTOCOL,
  ],
  read_only_viewer: [
    Permission.READ_PHI,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_OPERATIONS,
  ],
  admin: Object.values(Permission), // Admin has all permissions
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
  const hasPermission = (permission) => {
    if (!user || !user.role) return false;
    const rolePermissions = (RolePermissions as any)[user.role as any] || [];
    return rolePermissions.includes(permission);
  };

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = (permissions) => {
    if (!user || !user.role) return false;
    const rolePermissions = (RolePermissions as any)[user.role as any] || [];
    return permissions.some((permission) => rolePermissions.includes(permission));
  };

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = (permissions) => {
    if (!user || !user.role) return false;
    const rolePermissions = (RolePermissions as any)[user.role as any] || [];
    return permissions.every((permission) => rolePermissions.includes(permission));
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
