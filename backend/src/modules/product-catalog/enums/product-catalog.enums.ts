export enum ProductType {
  EMERGENCY_DEPARTMENT = 'emergency_department',
  ICU = 'icu',
  CARDIOLOGY = 'cardiology',
  LABORATORY = 'laboratory',
  HOSPITAL_OPERATIONS = 'hospital_operations',
  MEDICAL_IOT = 'medical_iot',
  FLEET_EMS = 'fleet_ems',
  DIGITAL_TWIN = 'digital_twin',
  SIMULATION_TRAINING = 'simulation_training',
  GOVERNANCE_COMPLIANCE = 'governance_compliance',
  RESEARCH = 'research',
}

export enum CommercialPlanId {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  ACADEMIC = 'academic',
  GOVERNMENT = 'government',
}

export enum IntegrationCategory {
  FHIR = 'fhir',
  HL7 = 'hl7',
  LABORATORY = 'laboratory',
  PACS = 'pacs',
  EMR_EHR = 'emr_ehr',
  IDENTITY = 'identity',
  GOVERNMENT_APIS = 'government_apis',
  SCHEDULING = 'scheduling',
  TELEHEALTH = 'telehealth',
}

export enum IntegrationStatus {
  AVAILABLE = 'available',
  ROADMAP = 'roadmap',
  BETA = 'beta',
}

export enum IntegrationReadinessStatus {
  SUPPORTED = 'supported',
  PLANNED = 'planned',
  DEMO = 'demo',
  UNAVAILABLE = 'unavailable',
}

export enum MaturityDimension {
  DIGITAL_MATURITY = 'digital_maturity',
  AI_READINESS = 'ai_readiness',
  INTEROPERABILITY = 'interoperability',
  GOVERNANCE = 'governance',
  SIMULATION_CAPABILITY = 'simulation_capability',
  IOT_MATURITY = 'iot_maturity',
}
