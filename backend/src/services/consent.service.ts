export interface ConsentRecord {
  patientId: string;
  consentType: string;
  granted: boolean;
  updatedBy?: string;
  updatedAt: string;
}

export class ConsentService {
  private readonly consents = new Map<string, ConsentRecord>();

  getConsentStatus(patientId: string, consentType = 'emergency-os-ai'): ConsentRecord {
    const key = this.key(patientId, consentType);
    return (
      this.consents.get(key) || {
        patientId,
        consentType,
        granted: false,
        updatedAt: new Date(0).toISOString(),
      }
    );
  }

  updateConsent(
    patientId: string,
    consentType: string,
    granted: boolean,
    updatedBy?: string,
  ): ConsentRecord {
    const record: ConsentRecord = {
      patientId,
      consentType,
      granted,
      updatedBy,
      updatedAt: new Date().toISOString(),
    };
    this.consents.set(this.key(patientId, consentType), record);
    return { ...record };
  }

  checkHealth() {
    return {
      status: 'ready',
      consentRecords: this.consents.size,
    };
  }

  private key(patientId: string, consentType: string): string {
    return `${patientId}:${consentType}`;
  }
}

export const consentService = new ConsentService();
