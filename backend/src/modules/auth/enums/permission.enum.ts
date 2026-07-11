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
  VIEW_PHI_AUDIT = 'VIEW_PHI_AUDIT', // View PHI-specific audit timelines

  // System Administration
  CONFIGURE_SYSTEM = 'CONFIGURE_SYSTEM', // System settings and configuration
  MANAGE_ENCRYPTION = 'MANAGE_ENCRYPTION', // Encryption key rotation
  MANAGE_SUBSCRIPTIONS = 'MANAGE_SUBSCRIPTIONS', // Billing and subscription management
  VIEW_ANALYTICS = 'VIEW_ANALYTICS', // System usage analytics
  MANAGE_CONSENT = 'MANAGE_CONSENT', // Patient consent management
  MANAGE_PRIVACY = 'MANAGE_PRIVACY', // Privacy requests and PHI access logs

  // Platform Governance
  VIEW_GOVERNANCE = 'VIEW_GOVERNANCE',
  MANAGE_CLINICAL_POLICY = 'MANAGE_CLINICAL_POLICY',
  APPROVE_CLINICAL_POLICY = 'APPROVE_CLINICAL_POLICY',
  REVIEW_SAFETY_FINDINGS = 'REVIEW_SAFETY_FINDINGS',
  VIEW_AI_SECURITY = 'VIEW_AI_SECURITY',
  MANAGE_AI_SECURITY = 'MANAGE_AI_SECURITY',
  REVIEW_AI_SECURITY_INCIDENTS = 'REVIEW_AI_SECURITY_INCIDENTS',
  VIEW_INTEGRATIONS = 'VIEW_INTEGRATIONS',
  MANAGE_INTEGRATIONS = 'MANAGE_INTEGRATIONS',
  IMPORT_PATIENT_DATA = 'IMPORT_PATIENT_DATA',
  RESOLVE_DATA_CONFLICTS = 'RESOLVE_DATA_CONFLICTS',
  BREAK_GLASS_ACCESS = 'BREAK_GLASS_ACCESS',
  VIEW_REGULATORY = 'VIEW_REGULATORY',
  MANAGE_REGULATORY = 'MANAGE_REGULATORY',
  APPROVE_REGULATORY = 'APPROVE_REGULATORY',
  VIEW_EQUITY_METRICS = 'VIEW_EQUITY_METRICS',
  MANAGE_EQUITY_COHORTS = 'MANAGE_EQUITY_COHORTS',
  REVIEW_BIAS_FINDINGS = 'REVIEW_BIAS_FINDINGS',
  EXPORT_EQUITY_REPORTS = 'EXPORT_EQUITY_REPORTS',
  VIEW_VALIDATION = 'VIEW_VALIDATION',
  MANAGE_VALIDATION = 'MANAGE_VALIDATION',
  RUN_VALIDATION = 'RUN_VALIDATION',
  APPROVE_VALIDATION = 'APPROVE_VALIDATION',
  VIEW_REVIEW_QUEUE = 'VIEW_REVIEW_QUEUE',
  REVIEW_CLINICAL_AI = 'REVIEW_CLINICAL_AI',
  REVIEW_DOCUMENTATION = 'REVIEW_DOCUMENTATION',
  REVIEW_PRIVACY_REQUESTS = 'REVIEW_PRIVACY_REQUESTS',
  REVIEW_GOVERNANCE = 'REVIEW_GOVERNANCE',
  VIEW_PRIVACY_CENTER = 'VIEW_PRIVACY_CENTER',
  VIEW_PHI_ACCESS_LOGS = 'VIEW_PHI_ACCESS_LOGS',
  REQUEST_DATA_EXPORT = 'REQUEST_DATA_EXPORT',
  APPROVE_DATA_RIGHTS_REQUESTS = 'APPROVE_DATA_RIGHTS_REQUESTS',
  VIEW_OPERATIONS = 'VIEW_OPERATIONS',
  VIEW_OBSERVABILITY = 'VIEW_OBSERVABILITY',
  MANAGE_INCIDENTS = 'MANAGE_INCIDENTS',

  // TrackMind Nexus / Racetrack Operations
  VIEW_TRACKMIND = 'VIEW_TRACKMIND',
  VIEW_TRACKMIND_MATURITY = 'VIEW_TRACKMIND_MATURITY',
  VIEW_TRACKMIND_ENTERPRISE = 'VIEW_TRACKMIND_ENTERPRISE',
  VIEW_TRACKMIND_INTELLIGENCE = 'VIEW_TRACKMIND_INTELLIGENCE',
  MANAGE_RACEDAY_OPERATIONS = 'MANAGE_RACEDAY_OPERATIONS',
  MANAGE_STEWARDING = 'MANAGE_STEWARDING',
  MANAGE_EQUINE_WELFARE = 'MANAGE_EQUINE_WELFARE',
  VIEW_VETERINARY_RECORDS = 'VIEW_VETERINARY_RECORDS',
  WRITE_VETERINARY_RECORDS = 'WRITE_VETERINARY_RECORDS',
  MANAGE_SECURITY_OPERATIONS = 'MANAGE_SECURITY_OPERATIONS',
  EXPORT_TRACKMIND_AUDIT = 'EXPORT_TRACKMIND_AUDIT',
  MANAGE_TRACKMIND_APPROVALS = 'MANAGE_TRACKMIND_APPROVALS',
  MANAGE_PLATFORM_TENANTS = 'MANAGE_PLATFORM_TENANTS',

  // Surveillance & IoT Nexus
  VIEW_SURVEILLANCE = 'VIEW_SURVEILLANCE',
  MANAGE_SURVEILLANCE_REGISTRY = 'MANAGE_SURVEILLANCE_REGISTRY',

  // Emergency & Safety
  TRIGGER_EMERGENCY_PROTOCOL = 'TRIGGER_EMERGENCY_PROTOCOL', // Initiate emergency response
  OVERRIDE_SAFETY_CHECKS = 'OVERRIDE_SAFETY_CHECKS', // Override warnings (senior physicians only)

  // CareDroid Sentinel (EMS command, AVL, durable alarms, AI review)
  VIEW_SENTINEL_COMMAND = 'VIEW_SENTINEL_COMMAND',
  MANAGE_SENTINEL_UNITS = 'MANAGE_SENTINEL_UNITS',
  ACK_SENTINEL_ALARMS = 'ACK_SENTINEL_ALARMS',
  MANAGE_SENTINEL_GEOFENCES = 'MANAGE_SENTINEL_GEOFENCES',
  INGEST_SENTINEL_CAD = 'INGEST_SENTINEL_CAD',
  REVIEW_SENTINEL_AI = 'REVIEW_SENTINEL_AI',
  VIEW_SENTINEL_ANALYTICS = 'VIEW_SENTINEL_ANALYTICS',

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
  [Permission.VIEW_PHI_AUDIT]: {
    description: 'View PHI-specific audit timelines and access trails',
    category: 'Audit & Compliance',
    riskLevel: 'critical',
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

  // Platform Governance
  [Permission.VIEW_GOVERNANCE]: {
    description: 'View clinical governance readiness, policy summaries, and blocker state',
    category: 'Platform Governance',
    riskLevel: 'high',
  },
  [Permission.MANAGE_CLINICAL_POLICY]: {
    description: 'Create and update clinical governance policy drafts',
    category: 'Platform Governance',
    riskLevel: 'critical',
  },
  [Permission.APPROVE_CLINICAL_POLICY]: {
    description: 'Approve clinical policies and release gates',
    category: 'Platform Governance',
    riskLevel: 'critical',
  },
  [Permission.REVIEW_SAFETY_FINDINGS]: {
    description: 'Triage and resolve clinical safety findings',
    category: 'Platform Governance',
    riskLevel: 'critical',
  },
  [Permission.VIEW_AI_SECURITY]: {
    description: 'View AI security dashboards, prompt blocks, and incidents',
    category: 'AI Security',
    riskLevel: 'high',
  },
  [Permission.MANAGE_AI_SECURITY]: {
    description: 'Manage prompt firewall and model access policies',
    category: 'AI Security',
    riskLevel: 'critical',
  },
  [Permission.REVIEW_AI_SECURITY_INCIDENTS]: {
    description: 'Review and disposition AI security incidents',
    category: 'AI Security',
    riskLevel: 'critical',
  },
  [Permission.VIEW_INTEGRATIONS]: {
    description: 'View FHIR, HL7, source provenance, and import status',
    category: 'Interoperability',
    riskLevel: 'medium',
  },
  [Permission.MANAGE_INTEGRATIONS]: {
    description: 'Configure and test FHIR/HL7 interfaces',
    category: 'Interoperability',
    riskLevel: 'critical',
  },
  [Permission.IMPORT_PATIENT_DATA]: {
    description: 'Run patient import previews and commits',
    category: 'Interoperability',
    riskLevel: 'critical',
  },
  [Permission.RESOLVE_DATA_CONFLICTS]: {
    description: 'Resolve patient matching and terminology conflicts',
    category: 'Interoperability',
    riskLevel: 'critical',
  },
  [Permission.BREAK_GLASS_ACCESS]: {
    description: 'Use emergency break-glass access with elevated audit requirements',
    category: 'Emergency & Safety',
    riskLevel: 'critical',
  },
  [Permission.VIEW_REGULATORY]: {
    description: 'View regulatory classification and intended-use records',
    category: 'Regulatory',
    riskLevel: 'high',
  },
  [Permission.MANAGE_REGULATORY]: {
    description: 'Draft and edit regulatory classifications',
    category: 'Regulatory',
    riskLevel: 'critical',
  },
  [Permission.APPROVE_REGULATORY]: {
    description: 'Approve regulatory classifications and evidence packages',
    category: 'Regulatory',
    riskLevel: 'critical',
  },
  [Permission.VIEW_EQUITY_METRICS]: {
    description: 'View aggregate equity and missingness metrics',
    category: 'Equity Monitoring',
    riskLevel: 'high',
  },
  [Permission.MANAGE_EQUITY_COHORTS]: {
    description: 'Define equity cohorts and aggregation thresholds',
    category: 'Equity Monitoring',
    riskLevel: 'critical',
  },
  [Permission.REVIEW_BIAS_FINDINGS]: {
    description: 'Review and resolve bias findings',
    category: 'Equity Monitoring',
    riskLevel: 'critical',
  },
  [Permission.EXPORT_EQUITY_REPORTS]: {
    description: 'Export governance committee equity reports',
    category: 'Equity Monitoring',
    riskLevel: 'critical',
  },
  [Permission.VIEW_VALIDATION]: {
    description: 'View validation scenarios and run results',
    category: 'Validation',
    riskLevel: 'high',
  },
  [Permission.MANAGE_VALIDATION]: {
    description: 'Create validation scenarios and synthetic patients',
    category: 'Validation',
    riskLevel: 'critical',
  },
  [Permission.RUN_VALIDATION]: {
    description: 'Execute sandbox validation runs',
    category: 'Validation',
    riskLevel: 'critical',
  },
  [Permission.APPROVE_VALIDATION]: {
    description: 'Approve validation evidence for release gates',
    category: 'Validation',
    riskLevel: 'critical',
  },
  [Permission.VIEW_REVIEW_QUEUE]: {
    description: 'View human review queue items permitted by role',
    category: 'Human Review',
    riskLevel: 'high',
  },
  [Permission.REVIEW_CLINICAL_AI]: {
    description: 'Approve or reject clinical AI output',
    category: 'Human Review',
    riskLevel: 'critical',
  },
  [Permission.REVIEW_DOCUMENTATION]: {
    description: 'Approve documentation drafts for export or filing',
    category: 'Human Review',
    riskLevel: 'critical',
  },
  [Permission.REVIEW_PRIVACY_REQUESTS]: {
    description: 'Review privacy export, delete, and access requests',
    category: 'Human Review',
    riskLevel: 'critical',
  },
  [Permission.REVIEW_GOVERNANCE]: {
    description: 'Review governance release gates and policy exceptions',
    category: 'Human Review',
    riskLevel: 'critical',
  },
  [Permission.VIEW_PRIVACY_CENTER]: {
    description: 'View privacy center workflows and request state',
    category: 'Privacy',
    riskLevel: 'high',
  },
  [Permission.VIEW_PHI_ACCESS_LOGS]: {
    description: 'View patient-level PHI access logs',
    category: 'Privacy',
    riskLevel: 'critical',
  },
  [Permission.REQUEST_DATA_EXPORT]: {
    description: 'Initiate data export workflows',
    category: 'Privacy',
    riskLevel: 'critical',
  },
  [Permission.APPROVE_DATA_RIGHTS_REQUESTS]: {
    description: 'Approve data rights export and delete workflows',
    category: 'Privacy',
    riskLevel: 'critical',
  },
  [Permission.VIEW_OPERATIONS]: {
    description: 'View service health and deployment operations state',
    category: 'Operations',
    riskLevel: 'medium',
  },
  [Permission.VIEW_OBSERVABILITY]: {
    description: 'View platform observability and AI operations metrics',
    category: 'Operations',
    riskLevel: 'medium',
  },
  [Permission.MANAGE_INCIDENTS]: {
    description: 'Create, update, and resolve operations incidents',
    category: 'Operations',
    riskLevel: 'critical',
  },

  [Permission.VIEW_TRACKMIND]: {
    description: 'Access TrackMind Nexus role workspaces',
    category: 'TrackMind',
    riskLevel: 'low',
  },
  [Permission.VIEW_TRACKMIND_MATURITY]: {
    description: 'View TrackMind maturity assessments',
    category: 'TrackMind',
    riskLevel: 'low',
  },
  [Permission.VIEW_TRACKMIND_ENTERPRISE]: {
    description: 'View enterprise operating platform modules',
    category: 'TrackMind',
    riskLevel: 'medium',
  },
  [Permission.VIEW_TRACKMIND_INTELLIGENCE]: {
    description: 'View platform intelligence modules',
    category: 'TrackMind',
    riskLevel: 'medium',
  },
  [Permission.MANAGE_RACEDAY_OPERATIONS]: {
    description: 'Manage race-day operational status and incident command',
    category: 'TrackMind',
    riskLevel: 'high',
  },
  [Permission.MANAGE_STEWARDING]: {
    description: 'Review steward incidents and create governed decisions',
    category: 'TrackMind',
    riskLevel: 'high',
  },
  [Permission.MANAGE_EQUINE_WELFARE]: {
    description: 'Create and review equine welfare observations',
    category: 'TrackMind',
    riskLevel: 'high',
  },
  [Permission.VIEW_VETERINARY_RECORDS]: {
    description: 'View privacy-scoped veterinary records',
    category: 'TrackMind',
    riskLevel: 'critical',
  },
  [Permission.WRITE_VETERINARY_RECORDS]: {
    description: 'Create or update veterinary records',
    category: 'TrackMind',
    riskLevel: 'critical',
  },
  [Permission.MANAGE_SECURITY_OPERATIONS]: {
    description: 'Manage racetrack security incidents and restricted zones',
    category: 'TrackMind',
    riskLevel: 'high',
  },
  [Permission.EXPORT_TRACKMIND_AUDIT]: {
    description: 'Export TrackMind audit and compliance evidence',
    category: 'TrackMind',
    riskLevel: 'critical',
  },
  [Permission.MANAGE_TRACKMIND_APPROVALS]: {
    description: 'Review and decide governed TrackMind approvals',
    category: 'TrackMind',
    riskLevel: 'high',
  },
  [Permission.MANAGE_PLATFORM_TENANTS]: {
    description: 'Manage platform tenants and module entitlements',
    category: 'TrackMind',
    riskLevel: 'critical',
  },
  [Permission.VIEW_SURVEILLANCE]: {
    description: 'View surveillance and IoT nexus dashboards, health, and alerts',
    category: 'Surveillance',
    riskLevel: 'medium',
  },
  [Permission.MANAGE_SURVEILLANCE_REGISTRY]: {
    description: 'Manage camera and IoT device registry entries',
    category: 'Surveillance',
    riskLevel: 'high',
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

  // CareDroid Sentinel
  [Permission.VIEW_SENTINEL_COMMAND]: {
    description: 'View Sentinel EMS command center, units, and inbound patients',
    category: 'Sentinel',
    riskLevel: 'high',
  },
  [Permission.MANAGE_SENTINEL_UNITS]: {
    description: 'Manage Sentinel EMS units and tracking configuration',
    category: 'Sentinel',
    riskLevel: 'high',
  },
  [Permission.ACK_SENTINEL_ALARMS]: {
    description: 'Acknowledge, escalate, and resolve Sentinel alarms',
    category: 'Sentinel',
    riskLevel: 'high',
  },
  [Permission.MANAGE_SENTINEL_GEOFENCES]: {
    description: 'Create and manage Sentinel geofences',
    category: 'Sentinel',
    riskLevel: 'medium',
  },
  [Permission.INGEST_SENTINEL_CAD]: {
    description: 'Ingest CAD/AVL and EMS webhook events into Sentinel',
    category: 'Sentinel',
    riskLevel: 'critical',
  },
  [Permission.REVIEW_SENTINEL_AI]: {
    description: 'Review and accept/reject Sentinel AI recommendations',
    category: 'Sentinel',
    riskLevel: 'high',
  },
  [Permission.VIEW_SENTINEL_ANALYTICS]: {
    description: 'View Sentinel EMS and alarm analytics KPIs',
    category: 'Sentinel',
    riskLevel: 'medium',
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
