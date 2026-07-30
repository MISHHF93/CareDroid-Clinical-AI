import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';

export class SurgeResourceStatusDto {
  @IsNumber()
  @Min(0)
  traumaBedsAvailable: number;

  @IsNumber()
  @Min(0)
  traumaBedsTotal: number;

  @IsNumber()
  @Min(0)
  surgeonsAvailable: number;

  @IsNumber()
  @Min(0)
  surgeonsTotal: number;

  @IsNumber()
  @Min(0)
  anaesthetistsAvailable: number;

  @IsNumber()
  @Min(0)
  anaesthetistsTotal: number;

  @IsNumber()
  @Min(0)
  bloodUnitsAvailable: number;

  @IsNumber()
  @Min(0)
  bloodUnitsTotal: number;

  @IsNumber()
  @Min(0)
  ventilatorsAvailable: number;

  @IsNumber()
  @Min(0)
  ventilatorsTotal: number;
}

export class ActivateSurgeDto {
  @IsIn(['mci', 'disaster', 'local_surge'])
  type: 'mci' | 'disaster' | 'local_surge';

  @IsNumber()
  @Min(0)
  estimatedPatientCount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualPatientCount?: number;

  @ValidateNested()
  @Type(() => SurgeResourceStatusDto)
  resourceStatus: SurgeResourceStatusDto;
}
