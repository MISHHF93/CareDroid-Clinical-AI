import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class OrderSetAiRequestDto {
  @ApiProperty({ example: 'Suspected sepsis with hypotension and elevated lactate.' })
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  clinicalScenario: string;

  @ApiProperty({ required: false, example: 'Sepsis, pneumonia, ACS, stroke, COPD exacerbation.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  diagnosis?: string;

  @ApiProperty({ required: false, example: 'CKD stage 3, penicillin allergy, K 5.5.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  patientContext?: string;

  @ApiProperty({ required: false, example: 'Renal dosing, allergy review, local antimicrobial stewardship.' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  constraints?: string;
}

export interface OrderSetAiResponseDto {
  runId: string;
  capabilityId: 'order-set-ai';
  contractVersion: string;
  status: 'suggestions_generated' | 'needs_more_context';
  orderBundles: Array<{
    id: string;
    title: string;
    intent: string;
    suggestedOrders: Array<{
      category: 'labs' | 'imaging' | 'medications' | 'monitoring' | 'consults' | 'nursing' | 'other';
      label: string;
      rationale: string;
      reviewRequired: true;
    }>;
    evidenceLinks: Array<{
      label: string;
      basis: string;
    }>;
    reviewChecklist: string[];
  }>;
  protocolPathways: Array<{
    id: string;
    name: string;
    trigger: string;
    steps: string[];
    escalationCriteria: string[];
  }>;
  explainability: {
    matchedSignals: string[];
    method: string;
    limitations: string[];
  };
  safety: {
    reviewRequired: true;
    autonomousOrderPlacement: false;
    blockedActions: string[];
    warnings: string[];
  };
  audit: {
    phiAccessed: true;
  };
}
