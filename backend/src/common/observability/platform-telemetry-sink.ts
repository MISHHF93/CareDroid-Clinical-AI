import type { PlatformTelemetryService } from '../../modules/observability/platform-telemetry.service';

let telemetrySink: PlatformTelemetryService | null = null;

export function registerPlatformTelemetrySink(service: PlatformTelemetryService): void {
  telemetrySink = service;
}

export function getPlatformTelemetrySink(): PlatformTelemetryService | null {
  return telemetrySink;
}

export function recordBackendHttpTelemetry(input: {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  correlationId?: string;
  workflowTraceId?: string;
  requestId?: string;
  userId?: string;
}): void {
  telemetrySink?.recordBackendRequest(input);
}

export function recordBackendWorkflowTelemetry(input: {
  workflowType: string;
  name: string;
  severity?: string;
  correlationId?: string;
  durationMs?: number;
  patientId?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}): void {
  telemetrySink?.recordBackendWorkflow(input);
}

export function recordBackendErrorTelemetry(input: {
  name: string;
  message: string;
  path?: string;
  statusCode?: number;
  correlationId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}): void {
  telemetrySink?.recordBackendError(input);
}

export function recordBackendAuditTelemetry(input: {
  action: string;
  resource: string;
  userId?: string;
  phiAccessed?: boolean;
  organizationId?: string;
  metadata?: Record<string, unknown>;
}): void {
  telemetrySink?.recordBackendAudit(input);
}