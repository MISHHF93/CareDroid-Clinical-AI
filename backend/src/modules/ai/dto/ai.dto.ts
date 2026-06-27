import { IsString, IsOptional, IsObject, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CARE_DROID_AI_INTENTS } from '../../../../../lib/ai/careDroidAITypes';

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

export class CareDroidAINodeDto {
  @ApiProperty({
    enum: CARE_DROID_AI_INTENTS,
    example: 'triage_recommendation',
  })
  @IsString()
  @IsIn(CARE_DROID_AI_INTENTS)
  intent: string;

  @ApiProperty({
    example: {
      symptoms: ['chest pain', 'shortness of breath'],
      vitals: { bloodPressure: '88/54', heartRate: 132, spo2: 90 },
      painLevel: 8,
      arrivalMode: 'EMS',
    },
  })
  @IsObject()
  input: Record<string, unknown>;

  @ApiProperty({
    required: false,
    example: { sourceScreen: 'triage_queue', userRole: 'triage_nurse' },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
