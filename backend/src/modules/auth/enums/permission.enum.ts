/**
 * Permission Enum for RBAC System
 *
 * Defines granular permissions for access control across the application.
 * Each permission represents a specific capability that can be assigned to roles.
 *
 * HIPAA Compliance: Fine-grained permissions ensure principle of least privilege
 * and enable comprehensive audit logging of access to PHI.
 */

export enum Permission {
  // PHI Data Access
  READ_PHI = 'READ_PHI', // View Protected Health Information
  WRITE_PHI = 'WRITE_PHI', // Create or modify PHI records
  EXPORT_PHI = 'EXPORT_PHI', // Export PHI data (reports, downloads)
  DELETE_PHI = 'DELETE_PHI', // Delete PHI records (restricted)

  // Clinical Tools
  USE_CALCULATORS = 'USE_CALCULATORS', // Access to SOFA, qSOFA, etc.
  USE_DRUG_CHECKER = 'USE_DRUG_CHECKER', // Drug interaction checker
  USE_LAB_INTERPRETER = 'USE_LAB_INTERPRETER', // Lab value interpretation
  USE_PROTOCOLS = 'USE_PROTOCOLS', // Access to clinical protocols (ACLS, ATLS)
  USE_AI_CHAT = 'USE_AI_CHAT', // Access to AI chat interface

  // User Management
  MANAGE_USERS = 'MANAGE_USERS', // Create, update, delete users
  MANAGE_ROLES = 'MANAGE_ROLES', // Assign and modify user roles
  VIEW_USERS = 'VIEW_USERS', // View user list and profiles

  // Audit & Compliance
  VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS', // Access to audit trail
  EXPORT_AUDIT_LOGS = 'EXPORT_AUDIT_LOGS', // Export audit logs for compliance
  VERIFY_AUDIT_INTEGRITY = 'VERIFY_AUDIT_INTEGRITY', // Check audit log chain integrity

  // System Administration
  CONFIGURE_SYSTEM = 'CONFIGURE_SYSTEM', // System settings and configuration
  MANAGE_ENCRYPTION = 'MANAGE_ENCRYPTION', // Encryption key rotation
  MANAGE_SUBSCRIPTIONS = 'MANAGE_SUBSCRIPTIONS', // Billing and subscription management
  VIEW_ANALYTICS = 'VIEW_ANALYTICS', // System usage analytics
  MANAGE_CONSENT = 'MANAGE_CONSENT', // Patient consent management
  MANAGE_PRIVACY = 'MANAGE_PRIVACY', // Privacy requests and PHI access logs

  // Emergency & Safety
  TRIGGER_EMERGENCY_PROTOCOL = 'TRIGGER_EMERGENCY_PROTOCOL', // Initiate emergency response
  OVERRIDE_SAFETY_CHECKS = 'OVERRIDE_SAFETY_CHECKS', // Override warnings (senior physicians only)

  // Two-Factor Authentication
  ENFORCE_MFA = 'ENFORCE_MFA', // Require 2FA for specific users
  MANAGE_MFA = 'MANAGE_MFA', // Configure MFA settings
}

/**
 * Permission Metadata
 * Provides human-readable descriptions and categorization for permissions
 */
export const PermissionMetadata: Record<
  Permission,
  { description: string; category: string; riskLevel: 'low' | 'medium' | 'high' | 'critical' }
> = {
  // PHI Data Access
  [Permission.READ_PHI]: {
    description: 'View protected health information in the system',
    category: 'PHI Access',
    riskLevel: 'high',
  },
  [Permission.WRITE_PHI]: {
    description: 'Create or modify PHI records',
    category: 'PHI Access',
    riskLevel: 'high',
  },
  [Permission.EXPORT_PHI]: {
    description: 'Export PHI data from the system',
    category: 'PHI Access',
    riskLevel: 'critical',
  },
  [Permission.DELETE_PHI]: {
    description: 'Permanently delete PHI records',
    category: 'PHI Access',
    riskLevel: 'critical',
  },

  // Clinical Tools
  [Permission.USE_CALCULATORS]: {
    description: 'Access clinical calculators (SOFA, qSOFA, etc.)',
    category: 'Clinical Tools',
    riskLevel: 'low',
  },
  [Permission.USE_DRUG_CHECKER]: {
    description: 'Check for drug interactions',
    category: 'Clinical Tools',
    riskLevel: 'medium',
  },
  [Permission.USE_LAB_INTERPRETER]: {
    description: 'Interpret laboratory values',
    category: 'Clinical Tools',
    riskLevel: 'medium',
  },
  [Permission.USE_PROTOCOLS]: {
    description: 'Access clinical protocols (ACLS, ATLS, etc.)',
    category: 'Clinical Tools',
    riskLevel: 'low',
  },
  [Permission.USE_AI_CHAT]: {
    description: 'Interact with AI chat interface',
    category: 'Clinical Tools',
    riskLevel: 'medium',
  },

  // User Management
  [Permission.MANAGE_USERS]: {
    description: 'Create, update, and delete user accounts',
    category: 'User Management',
    riskLevel: 'high',
  },
  [Permission.MANAGE_ROLES]: {
    description: 'Assign and modify user roles',
    category: 'User Management',
    riskLevel: 'high',
  },
  [Permission.VIEW_USERS]: {
    description: 'View user list and basic profiles',
    category: 'User Management',
    riskLevel: 'medium',
  },

  // Audit & Compliance
  [Permission.VIEW_AUDIT_LOGS]: {
    description: 'View audit trail and access logs',
    category: 'Audit & Compliance',
    riskLevel: 'high',
  },
  [Permission.EXPORT_AUDIT_LOGS]: {
    description: 'Export audit logs for compliance reporting',
    category: 'Audit & Compliance',
    riskLevel: 'critical',
  },
  [Permission.VERIFY_AUDIT_INTEGRITY]: {
    description: 'Verify audit log chain integrity',
    category: 'Audit & Compliance',
    riskLevel: 'medium',
  },

  // System Administration
  [Permission.CONFIGURE_SYSTEM]: {
    description: 'Configure system settings and parameters',
    category: 'System Administration',
    riskLevel: 'critical',
  },
  [Permission.MANAGE_ENCRYPTION]: {
    description: 'Manage encryption keys and rotation',
    category: 'System Administration',
    riskLevel: 'critical',
  },
  [Permission.MANAGE_SUBSCRIPTIONS]: {
    description: 'Manage billing and subscriptions',
    category: 'System Administration',
    riskLevel: 'high',
  },
  [Permission.VIEW_ANALYTICS]: {
    description: 'View system usage analytics',
    category: 'System Administration',
    riskLevel: 'medium',
  },
  [Permission.MANAGE_CONSENT]: {
    description: 'Manage patient consent status, revocation, and audit visibility',
    category: 'System Administration',
    riskLevel: 'critical',
  },
  [Permission.MANAGE_PRIVACY]: {
    description: 'Manage privacy center workflows and PHI access-log requests',
    category: 'System Administration',
    riskLevel: 'critical',
  },

  // Emergency & Safety
  [Permission.TRIGGER_EMERGENCY_PROTOCOL]: {
    description: 'Initiate emergency response protocols',
    category: 'Emergency & Safety',
    riskLevel: 'critical',
  },
  [Permission.OVERRIDE_SAFETY_CHECKS]: {
    description: 'Override system safety warnings',
    category: 'Emergency & Safety',
    riskLevel: 'critical',
  },

  // Two-Factor Authentication
  [Permission.ENFORCE_MFA]: {
    description: 'Require 2FA for specific users',
    category: 'Two-Factor Authentication',
    riskLevel: 'high',
  },
  [Permission.MANAGE_MFA]: {
    description: 'Configure MFA settings for users',
    category: 'Two-Factor Authentication',
    riskLevel: 'high',
  },
};
