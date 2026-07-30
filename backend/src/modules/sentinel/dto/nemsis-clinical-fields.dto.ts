import { IsOptional } from 'class-validator';

/**
 * Every field KNOWN_ALIASES (lib/sentinel/nemsisMap.ts) actually maps, plus
 * the nested `vitals` object shape and the pass-through `raw`/`metadata`
 * keys mapNemsisLikePayload() explicitly excludes from its "unmapped"
 * tracking. Shared by IngestCadDto and UpsertInboundDto, both of which
 * forward their raw body into upsertFromCadOrNemsis() -> mapNemsisLikePayload().
 * See ingest-cad.dto.ts for the full "why enumerate instead of disabling
 * whitelist" rationale.
 */
export class NemsisClinicalFieldsDto {
  @IsOptional()
  'ePatient.13'?: unknown;

  @IsOptional()
  age?: unknown;

  @IsOptional()
  patientAge?: unknown;

  @IsOptional()
  'ePatient.14'?: unknown;

  @IsOptional()
  gender?: unknown;

  @IsOptional()
  sex?: unknown;

  @IsOptional()
  'eSituation.11'?: unknown;

  @IsOptional()
  chiefComplaint?: unknown;

  @IsOptional()
  chief_complaint?: unknown;

  @IsOptional()
  complaint?: unknown;

  @IsOptional()
  'eVitals.10'?: unknown;

  @IsOptional()
  hr?: unknown;

  @IsOptional()
  heartRate?: unknown;

  @IsOptional()
  'eVitals.06'?: unknown;

  @IsOptional()
  sbp?: unknown;

  @IsOptional()
  systolicBp?: unknown;

  @IsOptional()
  'eVitals.07'?: unknown;

  @IsOptional()
  dbp?: unknown;

  @IsOptional()
  diastolicBp?: unknown;

  @IsOptional()
  'eVitals.12'?: unknown;

  @IsOptional()
  spo2?: unknown;

  @IsOptional()
  o2?: unknown;

  @IsOptional()
  oxygenSaturation?: unknown;

  @IsOptional()
  'eVitals.14'?: unknown;

  @IsOptional()
  rr?: unknown;

  @IsOptional()
  respiratoryRate?: unknown;

  @IsOptional()
  'eTimes.03'?: unknown;

  @IsOptional()
  unitNotifiedAt?: unknown;

  @IsOptional()
  'eTimes.05'?: unknown;

  @IsOptional()
  unitEnRouteAt?: unknown;

  @IsOptional()
  'eTimes.06'?: unknown;

  @IsOptional()
  unitArrivedSceneAt?: unknown;

  @IsOptional()
  'eTimes.09'?: unknown;

  @IsOptional()
  unitLeftSceneAt?: unknown;

  @IsOptional()
  'eTimes.11'?: unknown;

  @IsOptional()
  unitArrivedDestinationAt?: unknown;

  @IsOptional()
  'eResponse.03'?: unknown;

  @IsOptional()
  unitCallSign?: unknown;

  @IsOptional()
  unitId?: unknown;

  @IsOptional()
  unit?: unknown;

  @IsOptional()
  priority?: unknown;

  @IsOptional()
  triage_code?: unknown;

  @IsOptional()
  narrative?: unknown;

  @IsOptional()
  notes?: unknown;

  @IsOptional()
  vitals?: {
    hr?: unknown;
    heartRate?: unknown;
    o2?: unknown;
    spo2?: unknown;
    oxygenSaturation?: unknown;
    rr?: unknown;
    respiratoryRate?: unknown;
    bp?: unknown;
  };

  // Nested clinical patient object, merged into the payload by ingestCad()
  // when present (see sentinel.controller.ts). Reuses this same alias set.
  @IsOptional()
  patient?: Record<string, unknown>;

  // Explicitly excluded from "unmapped" tracking by mapNemsisLikePayload()
  // (i.e. deliberately allowed pass-through keys, not consumed elsewhere).
  @IsOptional()
  raw?: unknown;

  @IsOptional()
  metadata?: unknown;
}
