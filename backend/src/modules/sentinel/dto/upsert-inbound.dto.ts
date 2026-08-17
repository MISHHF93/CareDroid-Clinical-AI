import { IsNumber, IsOptional } from 'class-validator';
import { NemsisClinicalFieldsDto } from './nemsis-clinical-fields.dto';

/**
 * The full raw body is forwarded as `payload` into upsertFromCadOrNemsis()
 * -> mapNemsisLikePayload(), which reads the same bounded KNOWN_ALIASES set
 * as IngestCadDto (see NemsisClinicalFieldsDto for the full rationale). The
 * fields below are the additional convenience fields this controller reads
 * directly (unitId/eta*) rather than forwarding as payload.
 *
 * HEAL-308: organizationId deliberately does NOT appear here. It's now
 * derived server-side from the caller's own @TenantContext() in the
 * controller -- accepting it from the request body let a caller attribute
 * an inbound patient record to an arbitrary organization.
 */
export class UpsertInboundDto extends NemsisClinicalFieldsDto {
  @IsOptional()
  @IsNumber()
  etaPointMin?: number;

  @IsOptional()
  @IsNumber()
  etaLowMin?: number;

  @IsOptional()
  @IsNumber()
  etaHighMin?: number;
}
