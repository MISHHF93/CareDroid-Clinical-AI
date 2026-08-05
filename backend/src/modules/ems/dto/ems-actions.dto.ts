import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

class EmsAlertPatientDto {
  @IsOptional() unknown?: boolean;
  @IsOptional() @IsString() age?: string;
  @IsOptional() @IsString() sex?: string;
  @IsOptional() @IsString() chief_complaint?: string;
}

export class EmsAlertDto {
  @IsOptional() @IsString() ems_unit_id?: string;
  @IsOptional() @IsString() unitId?: string;
  @IsOptional() @IsObject() patient?: EmsAlertPatientDto;
  @IsOptional() @IsObject() vitals?: Record<string, number>;
  @IsOptional() eta_minutes?: number;
  @IsOptional() @IsString() triage_code?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsArray() risk_flags?: string[];
  @IsOptional() @IsString() notes?: string;
}

export class EmsStatusUpdateDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() eta_minutes?: number;
}

export class EmsArrivalDto {
  @IsOptional() @IsString() real_name?: string;
  @IsOptional() @IsString() real_age?: string;
}
