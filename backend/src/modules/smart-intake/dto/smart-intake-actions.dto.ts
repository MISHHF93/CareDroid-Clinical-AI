import { IsArray, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Cycle 284: every field here mirrors exactly what smartIntakeApi.ts (the
 * one real frontend contract point for these 14 routes) sends on the wire,
 * or — for the 8 of 14 methods with zero live UI callers today (documents,
 * ocr-results, ems-evidence, continue-unknown, reconcile-unknown,
 * biometric-consent, biometric-consent/withdraw, audit-log; confirmed by
 * grepping every SmartIntakeApi.* call site) — exactly what the backend
 * service itself reads off the body, so whitelist-stripping changes no
 * real behavior in either case. ocr-results and biometric-consent are the
 * two spread-shaped bodies ({...payload, staff} / {...consent, staff}); an
 * earlier attempt at a route-local ValidationPipe({whitelist:false})
 * override for cases like this was already tried and confirmed not to work
 * in this codebase (backend/src/modules/sentinel/dto/ingest-cad.dto.ts's
 * own header) — Nest chains the global pipe first, so field enumeration is
 * the only real option. Both are enumerated from the one function that
 * actually reads them (ocr.service.ts's normalizePayload,
 * smart-intake.service.ts's captureBiometricConsent) rather than guessed.
 */

export class CreateSmartIntakeSessionDto {
  @IsOptional() @IsString() staff?: string;
  @IsOptional() @IsString() clinician?: string;
}

export class SmartIntakeManualEntryDto {
  @IsOptional() @IsObject() manual?: Record<string, unknown>;
  @IsOptional() @IsString() staff?: string;
  @IsOptional() @IsString() clinician?: string;
}

export class SmartIntakeDocumentDto {
  @IsOptional() @IsObject() document?: Record<string, unknown>;
  @IsOptional() @IsString() staff?: string;
  @IsOptional() @IsString() clinician?: string;
}

/** Fields mirror ocr.service.ts normalizePayload()'s own reads exactly. */
export class SmartIntakeOcrResultDto {
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsObject() demographics?: Record<string, unknown>;
  @IsOptional() @IsArray() medications?: unknown[];
  @IsOptional() @IsArray() allergies?: unknown[];
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsNumber() confidence?: number;
  @IsOptional() @IsString() staff?: string;
  @IsOptional() @IsString() clinician?: string;
}

export class SmartIntakeEmsEvidenceDto {
  @IsOptional() @IsObject() ems?: Record<string, unknown>;
  @IsOptional() @IsString() staff?: string;
  @IsOptional() @IsString() clinician?: string;
}

export class SmartIntakeMatchDto {
  @IsOptional() @IsString() staff?: string;
  @IsOptional() @IsString() clinician?: string;
}

export class SmartIntakeVerifyFieldDto {
  @IsOptional() @IsString() field?: string;
  @IsOptional() @IsString() decision?: string;
  @IsOptional() edited_value?: unknown;
  @IsOptional() @IsString() staff?: string;
  @IsOptional() @IsString() clinician?: string;
}

export class SmartIntakeLinkPatientDto {
  @IsOptional() @IsString() patientId?: string;
  @IsOptional() @IsString() staff?: string;
  @IsOptional() @IsString() clinician?: string;
}

export class SmartIntakeCreatePatientDto {
  @IsOptional() @IsString() staff?: string;
  @IsOptional() @IsString() clinician?: string;
}

export class SmartIntakeContinueUnknownDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() staff?: string;
  @IsOptional() @IsString() clinician?: string;
}

export class SmartIntakeReconcileUnknownDto {
  @IsOptional() @IsString() patientId?: string;
  @IsOptional() @IsString() staff?: string;
  @IsOptional() @IsString() clinician?: string;
}

/** Fields mirror smart-intake.service.ts captureBiometricConsent()'s own reads exactly. */
export class SmartIntakeBiometricConsentDto {
  @IsOptional() enabledByTenant?: boolean;
  @IsOptional() consentGranted?: boolean;
  @IsOptional() @IsString() purposeStatement?: string;
  @IsOptional() @IsString() retentionPolicy?: string;
  @IsOptional() @IsString() staffAttestation?: string;
  @IsOptional() @IsString() providerReference?: string;
  @IsOptional() @IsString() modality?: string;
  @IsOptional() @IsString() staff?: string;
  @IsOptional() @IsString() clinician?: string;
}

export class SmartIntakeWithdrawBiometricConsentDto {
  @IsOptional() @IsString() staff?: string;
  @IsOptional() @IsString() clinician?: string;
}
