import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PatientSummaryAiRequestDto {
  @ApiProperty({ required: false, example: '72-year-old admitted for CHF exacerbation.' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  patientContext?: string;

  @ApiProperty({ required: false, example: 'CHF, CKD stage 3, diabetes, hypertension.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  problems?: string;

  @ApiProperty({ required: false, example: 'Furosemide, lisinopril, metformin, insulin glargine.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  medications?: string;

  @ApiProperty({ required: false, example: 'Creatinine 1.8 from 1.2, K 5.5, A1c 8.4.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  labs?: string;

  @ApiProperty({
    required: false,
    example: 'Hyperkalemia alert, fall risk, renal dose adjustment.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  alerts?: string;

  @ApiProperty({ required: false, example: 'Age, CKD, diabetes, prior MI, smoking history.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  riskFactors?: string;

  @ApiProperty({ required: false, example: 'Recent note text or handoff context.' })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  notes?: string;
}

export interface PatientSummaryAiResponseDto {
  runId: string;
  capabilityId: 'patient-summary-ai';
  contractVersion: string;
  status: 'summary_generated' | 'needs_more_context';
  activeProblems: Array<{
    label: string;
    evidence: string[];
    priority: 'high' | 'medium' | 'routine';
  }>;
  medications: Array<{
    name: string;
    context: string;
    reviewFlags: string[];
  }>;
  recentLabs: Array<{
    label: string;
    value: string;
    interpretation: 'abnormal' | 'critical_review' | 'monitor' | 'unknown';
  }>;
  alerts: Array<{
    severity: 'urgent_review' | 'watch' | 'info';
    message: string;
    rationale: string;
  }>;
  riskFactors: Array<{
    label: string;
    rationale: string;
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
