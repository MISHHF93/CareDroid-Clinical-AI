import { IsBoolean, IsOptional } from 'class-validator';

export class PrepRecommendationDto {
  @IsOptional()
  @IsBoolean()
  preferAi?: boolean;
}
