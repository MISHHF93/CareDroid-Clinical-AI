import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TimelineAiEncounterDto {
  @ApiProperty({ required: false, example: '2026-05-01' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  date?: string;

  @ApiProperty({ required: false, example: 'ED visit' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  encounterType?: string;

  @ApiProperty({ required: false, example: 'Shortness of breath follow-up' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @ApiProperty({ example: 'Presented with worsening dyspnea and edema. Started diuresis.' })
  @IsString()
  @MaxLength(5000)
  details: string;

  @ApiProperty({ required: false, example: 'Creatinine 1.4, BNP 900.' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  labs?: string;

  @ApiProperty({ required: false, example: 'SpO2 91%, BP 96/54.' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  vitals?: string;
}

export class TimelineAiRequestDto {
  @ApiProperty({ required: false, example: 'Older adult with CHF and CKD.' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  patientContext?: string;

  @ApiProperty({ required: false, example: 'Cardiopulmonary progression and renal trend.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  focus?: string;

  @ApiProperty({ type: [TimelineAiEncounterDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TimelineAiEncounterDto)
  encounters: TimelineAiEncounterDto[];
}

export interface TimelineAiResponseDto {
  runId: string;
  capabilityId: 'timeline-ai';
  contractVersion: string;
  status: 'timeline_generated' | 'needs_more_context';
  timeline: Array<{
    id: string;
    dateLabel: string;
    encounterType: string;
    title: string;
    summary: string;
    keyFindings: string[];
    abnormalSignals: string[];
  }>;
  trends: Array<{
    id: string;
    label: string;
    direction: 'worsening' | 'improving' | 'stable' | 'unclear';
    evidence: string[];
  }>;
  abnormalProgression: Array<{
    id: string;
    severity: 'watch' | 'urgent_review';
    signal: string;
    rationale: string;
    relatedEncounterIds: string[];
  }>;
  explainability: {
    inputsUsed: string[];
    method: string;
    limitations: string[];
  };
  safety: {
    decisionSupportOnly: true;
    warnings: string[];
  };
  audit: {
    phiAccessed: true;
  };
}
