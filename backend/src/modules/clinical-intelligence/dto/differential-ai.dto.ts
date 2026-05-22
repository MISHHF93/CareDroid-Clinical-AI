import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class DifferentialAiRequestDto {
  @ApiProperty({ example: 'Chest pain with diaphoresis and nausea for two hours.' })
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  symptoms: string;

  @ApiProperty({ required: false, example: 'Troponin elevated, ECG nonspecific ST changes.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  labs?: string;

  @ApiProperty({ required: false, example: 'Hypertension, diabetes, prior smoking.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  history?: string;

  @ApiProperty({ required: false, example: { age: 67, sex: 'female' } })
  @IsOptional()
  @IsObject()
  demographics?: Record<string, unknown>;
}

export interface DifferentialAiResponseDto {
  runId: string;
  capabilityId: 'differential-ai';
  contractVersion: string;
  status: 'ranked_differential_generated' | 'needs_more_context';
  rankedDifferentials: Array<{
    rank: number;
    condition: string;
    likelihood: 'higher' | 'moderate' | 'lower';
    supportingEvidence: string[];
    missingEvidence: string[];
    urgencyFlags: string[];
  }>;
  suggestedCalculators: Array<{
    id: string;
    label: string;
    rationale: string;
    route: string;
  }>;
  explainability: {
    reasoningTrace: string[];
    evidenceInputsUsed: string[];
    limitations: string[];
  };
  safety: {
    decisionSupportOnly: true;
    notDiagnosis: true;
    warnings: string[];
  };
}
