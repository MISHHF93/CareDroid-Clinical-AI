import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ArtifactRelationshipDto {
  @IsString()
  @MaxLength(96)
  artifactId: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
