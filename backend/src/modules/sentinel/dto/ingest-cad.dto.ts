import { IsArray, IsOptional, IsString } from 'class-validator';
import { NemsisClinicalFieldsDto } from './nemsis-clinical-fields.dto';

/**
 * "Vendor-agnostic" here means a bounded, finite alias table, not truly
 * arbitrary fields -- confirmed by reading both real consumers of this body:
 * normalizeWebhookPayload() (adapters/cad-avl.adapter.ts, positional
 * CAD/AVL data, fields below) and KNOWN_ALIASES in lib/sentinel/nemsisMap.ts
 * (NEMSIS-like clinical data, inherited from NemsisClinicalFieldsDto, via
 * upsertFromCadOrNemsis()). Every field is one either function actually
 * reads; anything not listed was already being silently discarded by those
 * functions before this DTO existed, so Nest's whitelist stripping changes
 * nothing functionally for a real caller using any of these documented
 * alternate spellings.
 *
 * (An earlier version of this DTO tried a route-local
 * `ValidationPipe({whitelist: false})` override instead of enumerating
 * fields -- that doesn't work because Nest chains the global ValidationPipe
 * with any param-level pipe; the global one's forbidNonWhitelisted:true
 * already rejects unknown fields before a param-level override ever runs,
 * confirmed by a real e2e test failing with 400 until this enumeration was
 * written instead -- see test/sentinel-webhook-ingest.e2e-spec.ts.)
 */
export class IngestCadDto extends NemsisClinicalFieldsDto {
  @IsOptional()
  @IsArray()
  events?: unknown[];

  @IsOptional()
  @IsArray()
  units?: unknown[];

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  unitExternalId?: string;

  @IsOptional()
  @IsString()
  ems_unit_id?: string;

  @IsOptional()
  @IsString()
  callSign?: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  lat?: number;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  lng?: number;

  @IsOptional()
  lon?: number;

  @IsOptional()
  heading?: number;

  @IsOptional()
  speedKmh?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  sequence?: number;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;
}
