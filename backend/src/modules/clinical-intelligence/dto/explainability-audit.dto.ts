import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AiExplainabilityQueryDto {
  @ApiProperty({ required: false, example: 'differential-ai' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  toolId?: string;

  @ApiProperty({ required: false, example: 'Clinical reasoning run from the last AI workflow.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  clinicalQuestion?: string;

  @ApiProperty({ required: false, example: '25' })
  @IsOptional()
  @IsString()
  @MaxLength(4)
  limit?: string;
}

export class ClinicalAuditQueryDto {
  @ApiProperty({ required: false, example: 'ai_query' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  action?: string;

  @ApiProperty({ required: false, example: '50' })
  @IsOptional()
  @IsString()
  @MaxLength(4)
  limit?: string;
}

export interface SanitizedExecutionLogDto {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  capabilityId: string;
  status: string;
  phiAccessed: boolean;
  integrityVerified: boolean;
  hashPreview: string;
  metadataSummary: Record<string, unknown>;
}

export interface AiExplainabilityResponseDto {
  runId: string;
  capabilityId: 'ai-explainability';
  contractVersion: string;
  confidence: {
    score: number;
    label: 'high' | 'medium' | 'low';
    rationale: string;
  };
  source: Array<{
    label: string;
    detail: string;
  }>;
  reasoning: string[];
  toolChain: string[];
  executionLogs: SanitizedExecutionLogDto[];
  safety: {
    warnings: string[];
  };
}

export interface ClinicalAuditResponseDto {
  runId: string;
  capabilityId: 'clinical-audit';
  contractVersion: string;
  status: 'logs_available' | 'no_logs';
  summary: {
    logCount: number;
    phiAccessCount: number;
    integrityVerifiedCount: number;
    uniqueCapabilities: string[];
  };
  toolChain: string[];
  executionLogs: SanitizedExecutionLogDto[];
  safety: {
    warnings: string[];
  };
}
