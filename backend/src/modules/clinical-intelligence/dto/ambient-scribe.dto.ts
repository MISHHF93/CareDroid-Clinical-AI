import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AmbientScribeNoteType {
  SOAP = 'soap',
  DISCHARGE_SUMMARY = 'discharge-summary',
  REFERRAL = 'referral',
}

export class AmbientScribeGenerateDto {
  @ApiProperty({ enum: AmbientScribeNoteType, example: AmbientScribeNoteType.SOAP })
  @IsEnum(AmbientScribeNoteType)
  noteType: AmbientScribeNoteType;

  @ApiProperty({
    example: 'Patient reports cough for 3 days, low-grade fever, no chest pain...',
  })
  @IsString()
  @MinLength(20)
  @MaxLength(20000)
  transcriptText: string;

  @ApiProperty({
    required: false,
    example: {
      patientLabel: 'Clinic follow-up',
      encounterType: 'primary care',
      clinicianInstructions: 'Include return precautions.',
    },
  })
  @IsOptional()
  @IsObject()
  patientContext?: Record<string, unknown>;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  safetyAcknowledged?: boolean;
}

export interface AmbientScribeDraft {
  title: string;
  sections: Record<string, string>;
  limitations: string[];
}

export interface AmbientScribeResponseDto {
  runId: string;
  capabilityId: 'ambient-scribe';
  contractVersion: string;
  status: 'review_required';
  noteType: AmbientScribeNoteType;
  draft: AmbientScribeDraft;
  reviewRequired: true;
  safety: {
    warnings: string[];
    blockedActions: string[];
    requiresHumanReview: true;
  };
  audit: {
    phiAccessed: true;
  };
}
