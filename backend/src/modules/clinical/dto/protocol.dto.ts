import { IsString, IsOptional, IsNumber, Min, Max, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProtocolDto {
  @ApiProperty({ example: 'ACLS - Cardiac Arrest' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Emergency' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'Advanced Cardiovascular Life Support protocol for cardiac arrest' })
  @IsString()
  description: string;

  @ApiProperty({
    example: ['Check responsiveness', 'Call for help', 'Begin CPR', 'Attach AED/defibrillator'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  steps: string[];

  @ApiProperty({ example: 'High priority emergency protocol' })
  @IsString()
  @IsOptional()
  priority?: string;
}

export class UpdateProtocolDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  steps?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  priority?: string;
}

export class SearchProtocolDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}
