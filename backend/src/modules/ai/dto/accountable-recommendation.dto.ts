/**
 * Architect Mode Stage G — accountable AI recommendation DTO (Nest).
 * Mirrors src/contracts/accountableAi.ts for API responses.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountableEvidenceDto {
  @ApiProperty()
  sourceId: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiProperty()
  citation: string;

  @ApiPropertyOptional()
  score?: number;

  @ApiPropertyOptional()
  outdated?: boolean;
}

export class AccountableRecommendationDto {
  @ApiProperty()
  content: string;

  @ApiProperty({ type: [AccountableEvidenceDto] })
  evidence: AccountableEvidenceDto[];

  @ApiProperty()
  provenance: {
    retrievedAt: string;
    corpusVersion?: number | string;
    tenantId?: string;
    requestId?: string;
  };

  @ApiPropertyOptional({ nullable: true, description: '0..1 or null when abstain/escalate' })
  confidence: number | null;

  @ApiProperty()
  uncertainty: string;

  @ApiProperty()
  model: { provider: string; name: string; version?: string };

  @ApiProperty()
  promptVersion: string;

  @ApiProperty()
  safety: { status: 'ok' | 'abstain' | 'escalate' | 'degraded'; reasons: string[] };

  @ApiProperty()
  humanReviewRequired: boolean;
}

export function buildAccountableRecommendationDto(input: {
  content: string;
  evidence?: AccountableEvidenceDto[];
  confidence?: number | null;
  uncertainty?: string;
  model: { provider: string; name: string; version?: string };
  promptVersion: string;
  safetyStatus?: 'ok' | 'abstain' | 'escalate' | 'degraded';
  safetyReasons?: string[];
  humanReviewRequired?: boolean;
  tenantId?: string;
  requestId?: string;
  corpusVersion?: number | string;
}): AccountableRecommendationDto {
  const safetyStatus = input.safetyStatus ?? 'ok';
  const forcesReview = safetyStatus === 'abstain' || safetyStatus === 'escalate';
  let confidence = input.confidence;
  if (forcesReview && (confidence === undefined || confidence === null)) {
    confidence = null;
  } else if (confidence === undefined) {
    confidence = 0.5;
  } else if (confidence !== null) {
    confidence = Math.min(1, Math.max(0, confidence));
  }

  return {
    content: input.content,
    evidence: input.evidence ?? [],
    provenance: {
      retrievedAt: new Date().toISOString(),
      corpusVersion: input.corpusVersion,
      tenantId: input.tenantId,
      requestId: input.requestId,
    },
    confidence: confidence ?? null,
    uncertainty:
      input.uncertainty ??
      (forcesReview
        ? 'Model abstained or escalated; do not treat content as clinical advice.'
        : 'Confidence is model-estimated; verify against source evidence.'),
    model: input.model,
    promptVersion: input.promptVersion,
    safety: {
      status: safetyStatus,
      reasons: input.safetyReasons ?? [],
    },
    humanReviewRequired: input.humanReviewRequired ?? forcesReview,
  };
}
