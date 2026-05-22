import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class GuidelineRagQueryDto {
  @ApiProperty({ example: 'What do sepsis guidelines say about initial bundle timing?' })
  @IsString()
  @MinLength(8)
  @MaxLength(2000)
  query: string;

  @ApiProperty({ required: false, example: 'emergency medicine' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  specialty?: string;

  @ApiProperty({ required: false, example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  topK?: number;

  @ApiProperty({ required: false, example: 0.6 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number;
}

export interface GuidelineRagCitation {
  id: number;
  sourceId: string;
  title: string;
  type: string;
  organization?: string;
  date?: string;
  url?: string;
}

export interface GuidelineRagSourceAttribution {
  chunkId: string;
  sourceId: string;
  title: string;
  score: number;
  chunkIndex?: number;
  citationId: number;
}

export interface GuidelineRagResponseDto {
  runId: string;
  capabilityId: 'guideline-rag';
  contractVersion: string;
  status: 'evidence_found' | 'insufficient_evidence';
  query: string;
  confidence: number;
  summary: {
    recommendations: Array<{
      id: string;
      text: string;
      citationIds: number[];
    }>;
    unsupportedClaimNotice: string;
  };
  citations: GuidelineRagCitation[];
  sources: GuidelineRagSourceAttribution[];
  explainability: {
    retrievalMethod: string;
    chunksRetrieved: number;
    sourceCount: number;
    limitations: string[];
  };
  safety: {
    warnings: string[];
  };
}
