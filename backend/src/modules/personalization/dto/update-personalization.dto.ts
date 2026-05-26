import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdatePersonalizationDto {
  @IsOptional()
  @IsString()
  preferredBehavior?: string;

  @IsOptional()
  @IsArray()
  suggestedTools?: string[];

  @IsOptional()
  @IsArray()
  recommendedWorkflows?: Array<Record<string, any>>;
}
