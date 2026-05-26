import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ArtifactType } from '../entities/artifact.entity';

export class ArtifactQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @IsOptional()
  @IsEnum(ArtifactType)
  type?: ArtifactType;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  tag?: string;
}
