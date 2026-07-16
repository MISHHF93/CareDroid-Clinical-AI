import {
  IsString,
  IsOptional,
  IsObject,
  IsIn,
  IsArray,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CARE_DROID_AI_INTENTS } from '../../../../../lib/ai/careDroidAITypes';
import {
  CARE_DROID_AI_CHANNELS,
  CARE_DROID_AI_TASKS,
} from '../../../../../lib/ai/unifiedAiContracts';

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

/**
 * Canonical Unified AI Node request (AI_EXECUTION_PLAN §4).
 * Validated again in AIService via validateUnifiedAiRequest.
 */
export class UnifiedAiQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  correlationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ example: 'reception' })
  @IsString()
  role: string;

  @ApiProperty({ type: [String], example: ['use_ai_chat'] })
  @IsArray()
  @ArrayMaxSize(64)
  permissions: string[];

  @ApiProperty({ enum: CARE_DROID_AI_CHANNELS, example: 'reception' })
  @IsString()
  @IsIn([...CARE_DROID_AI_CHANNELS])
  channel: string;

  @ApiProperty({ enum: CARE_DROID_AI_TASKS, example: 'answer_question' })
  @IsString()
  @IsIn([...CARE_DROID_AI_TASKS])
  task: string;

  @ApiProperty({ example: 'What documents are missing before triage handoff?' })
  @IsString()
  @MaxLength(16000)
  query: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  patientContext?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  encounterContext?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  emsContext?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  workflowContext?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  documentContext?: Record<string, unknown>;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  requestedTools?: string[];

  @ApiProperty({ enum: ['text', 'structured', 'stream'], example: 'structured' })
  @IsString()
  @IsIn(['text', 'structured', 'stream'])
  responseFormat: 'text' | 'structured' | 'stream';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  locale?: string;
}
