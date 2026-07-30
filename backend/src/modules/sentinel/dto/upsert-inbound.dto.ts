import { IsNumber, IsOptional, IsString } from 'class-validator';
import { NemsisClinicalFieldsDto } from './nemsis-clinical-fields.dto';

/**
 * The full raw body is forwarded as `payload` into upsertFromCadOrNemsis()
 * -> mapNemsisLikePayload(), which reads the same bounded KNOWN_ALIASES set
 * as IngestCadDto (see NemsisClinicalFieldsDto for the full rationale). The
 * fields below are the additional convenience fields this controller reads
 * directly (unitId/organizationId/eta*) rather than forwarding as payload.
 */
export class UpsertInboundDto extends NemsisClinicalFieldsDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

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
