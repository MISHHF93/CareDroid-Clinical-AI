import { IsArray, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class PredictDeteriorationDto {
  @IsOptional() @IsNumber() age?: number;
  @IsOptional() @IsString() triageCode?: string;
  @IsOptional() @IsString() triage_code?: string;
  @IsOptional() @IsObject() vitals?: Record<string, number>;
  @IsOptional() @IsArray() riskFlags?: string[];
  @IsOptional() @IsArray() risk_flags?: string[];
}
