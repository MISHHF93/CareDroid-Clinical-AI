import { getEnvironmentConfig } from '../config/environment.config';
import { probeHttpEndpoint } from './http-endpoint-probe';

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

/**
 * `connected` reflects the outcome of the LAST real reachability probe run
 * by checkHealth() below -- never config presence alone. `not_connected`
 * covers both "not configured" and "configured but no probe has succeeded
 * yet"; `unreachable` means a probe actually ran and failed (network error,
 * timeout, or a non-5xx-but-not-ok response was still fine -- 5xx/refused/
 * timed-out is what lands here); `degraded` means the configured base URL
 * itself is not a usable URL.
 */
export type MohFhirHealthStatus = 'ready' | 'not_connected' | 'unreachable' | 'degraded';

export interface MohFhirHealthReport {
  status: MohFhirHealthStatus;
  connector: 'MOH FHIR';
  /** Config presence only (baseUrl/clientId/clientSecret set) -- independent of real reachability. */
  configured: boolean;
  baseUrl: string | null;
  error?: string;
}

export class MOHFHIRService {
  /**
   * HEAL: this used to be set from `this.config.enabled` in connect() --
   * a config-presence echo, not a real connectivity signal -- so a fully
   * unreachable MoH FHIR endpoint with credentials configured would report
   * `status: 'ready'` forever. `connected` now only ever changes inside
   * checkHealth() below, and only in response to a real network probe.
   */
  private connected = false;
  private lastError: string | undefined;
  private readonly config = getEnvironmentConfig().externalApis.mohFhir;

  async connect(): Promise<void> {
    // Intentionally a no-op beyond the lifecycle hook itself: real
    // reachability is established by checkHealth()'s live HTTP probe, not
    // by this cheap, synchronous boot-time call. See the `connected` field
    // comment above for why this no longer echoes `config.enabled`.
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

  /** True only when the last real probe (from checkHealth()) succeeded. */
  isConnected(): boolean {
    return this.connected;
  }

  async checkHealth(): Promise<MohFhirHealthReport> {
    if (!this.config.enabled) {
      this.connected = false;
      this.lastError = undefined;
      return {
        status: 'not_connected',
        connector: 'MOH FHIR',
        configured: false,
        baseUrl: this.config.baseUrl || null,
      };
    }

    if (!this.config.baseUrl) {
      this.connected = false;
      this.lastError = 'MOH FHIR is enabled but no base URL is configured.';
      return {
        status: 'not_connected',
        connector: 'MOH FHIR',
        configured: true,
        baseUrl: null,
        error: this.lastError,
      };
    }

    let endpoint: string;
    try {
      endpoint = new URL(this.config.baseUrl).toString();
    } catch {
      this.connected = false;
      this.lastError = 'MOH FHIR base URL is not a valid URL.';
      return {
        status: 'degraded',
        connector: 'MOH FHIR',
        configured: true,
        baseUrl: this.config.baseUrl,
        error: this.lastError,
      };
    }

    try {
      const probe = await probeHttpEndpoint(endpoint);
      this.connected = probe.reachable;
      this.lastError = probe.reachable
        ? undefined
        : `MoH FHIR endpoint returned HTTP ${probe.statusCode}.`;
      return {
        status: probe.reachable ? 'ready' : 'unreachable',
        connector: 'MOH FHIR',
        configured: true,
        baseUrl: endpoint,
        ...(this.lastError ? { error: this.lastError } : {}),
      };
    } catch (error) {
      this.connected = false;
      this.lastError = error instanceof Error ? error.message : String(error);
      return {
        status: 'unreachable',
        connector: 'MOH FHIR',
        configured: true,
        baseUrl: endpoint,
        error: this.lastError,
      };
    }
  }
}

export const mohFhirService = new MOHFHIRService();
