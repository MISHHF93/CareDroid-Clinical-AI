import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ArtifactType } from '../entities/artifact.entity';
import { ArtifactRelationshipDto } from './artifact-relationship.dto';

export class UpdateArtifactDto {
  @IsOptional()
  @IsEnum(ArtifactType)
  type?: ArtifactType;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArtifactRelationshipDto)
  relationships?: ArtifactRelationshipDto[];

  @IsOptional()
  @IsString()
  @MaxLength(32)
  version?: string;
}
