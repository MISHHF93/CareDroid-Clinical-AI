import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AIQueryDto {
  @ApiProperty({
    example: 'What are the differential diagnoses for chest pain in a 45-year-old male?',
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    example: { patientAge: 45, gender: 'male', symptoms: ['chest pain'] },
    required: false,
  })
  @IsOptional()
  @IsObject()
  context?: any;
}

export class StructuredJSONDto {
  @ApiProperty({ example: 'Generate a differential diagnosis for acute chest pain' })
  @IsString()
  prompt: string;

  @ApiProperty({
    example: {
      diagnoses: [{ name: 'string', probability: 'string', reasoning: 'string' }],
    },
  })
  @IsObject()
  schema: any;
}
