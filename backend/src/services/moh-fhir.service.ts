import { getEnvironmentConfig } from '../config/environment.config';

export interface MohFhirPatientSnapshot {
  healthCardNumber?: string;
  fhirPatientId?: string;
  mrn?: string;
  dateOfBirth?: string;
  birthDate?: string;
  sex?: string;
  gender?: string;
  jurisdiction?: string;
  [key: string]: unknown;
}

export class MOHFHIRService {
  private connected = false;
  private readonly config = getEnvironmentConfig().externalApis.mohFhir;

  async connect(): Promise<void> {
    this.connected = this.config.enabled;
  }

  normalizePatientSnapshot(snapshot: MohFhirPatientSnapshot): MohFhirPatientSnapshot {
    return {
      ...snapshot,
      jurisdiction: snapshot.jurisdiction || 'Ontario',
      dateOfBirth: snapshot.dateOfBirth || snapshot.birthDate,
      sex: snapshot.sex || snapshot.gender,
      externalEhrId: snapshot.fhirPatientId || snapshot.mrn,
    };
  }

  checkHealth() {
    return {
      status: this.connected ? 'ready' : 'not_connected',
      connector: 'MOH FHIR',
      configured: this.config.enabled,
      baseUrl: this.config.baseUrl || null,
    };
  }
}

export const mohFhirService = new MOHFHIRService();
