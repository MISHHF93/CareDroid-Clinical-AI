export enum PlatformAssetType {
  TOOL = 'tool',
  CLINICAL_TOOL = 'clinical-tool',
  CALCULATOR = 'calculator',
  PROTOCOL = 'protocol',
  SIMULATION = 'simulation',
  WORKFLOW = 'workflow',
  DASHBOARD = 'dashboard',
  MAP = 'map',
  IOT = 'iot',
  FLEET = 'fleet',
  LABORATORY = 'laboratory',
  GOVERNANCE = 'governance',
  REPORT = 'report',
  INTEGRATION = 'integration',
  TEMPLATE = 'template',
  AI_AGENT = 'ai_agent',
  PLUGIN = 'plugin',
}

export enum AssetAccessState {
  ALLOWED = 'allowed',
  HIDDEN = 'hidden',
  LOCKED = 'locked',
  RESTRICTED = 'restricted',
  REQUIRES_ADMIN = 'requires-admin',
  REQUIRES_REVIEW = 'requires-review',
  UNSUPPORTED = 'unsupported',
  DEMO_ONLY = 'demo-only',
}

export enum ClinicalRiskLevel {
  INFORMATIONAL = 'informational',
  OPERATIONAL = 'operational',
  CLINICAL_DECISION_SUPPORT = 'clinical-decision-support',
  HIGH_RISK = 'high-risk',
  GOVERNANCE_REQUIRED = 'governance-required',
}

export enum BackendAssetStatus {
  WIRED = 'wired',
  PARTIAL = 'partial',
  PLATFORM = 'platform',
  UNSUPPORTED = 'unsupported',
  DEMO = 'demo',
}

export enum PlatformAssetLifecycle {
  DRAFT = 'draft',
  BETA = 'beta',
  ACTIVE = 'active',
  DEPRECATED = 'deprecated',
  ARCHIVED = 'archived',
}

export enum PricingTier {
  CORE = 'core',
  STANDARD = 'standard',
  ENTERPRISE = 'enterprise',
  ADDON = 'addon',
}

export enum OrganizationType {
  HOSPITAL = 'hospital',
  ACADEMIC_MEDICAL_CENTER = 'academic_medical_center',
  CLINIC = 'clinic',
  EMS = 'ems',
  RESEARCH_INSTITUTE = 'research_institute',
  RESEARCH_CENTER = 'research_center',
  HEALTH_SYSTEM = 'health_system',
  LONG_TERM_CARE = 'long_term_care',
  HOME_CARE = 'home_care',
  TELEHEALTH = 'telehealth',
  UNIVERSITY = 'university',
  RACETRACK = 'racetrack',
}

export enum EntitlementStatus {
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  TRIAL = 'trial',
}
