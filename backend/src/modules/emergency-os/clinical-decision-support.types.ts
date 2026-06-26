export type ClinicalCalculatorId = 'qsofa' | 'heart' | 'wells-pe' | 'gcs' | 'news2' | 'nihss';

export interface ClinicalCalculatorResultRecord {
  id: string;
  calculatorId: ClinicalCalculatorId;
  patientId?: string;
  encounterId?: string;
  tenantId?: string;
  userId?: string;
  inputs: Record<string, unknown>;
  score: number | string | null;
  riskCategory: string;
  interpretation: string;
  disclaimer: string;
  referenceLine: string;
  computedAt: string;
}

export interface CopilotInteractionRecord {
  id: string;
  patientId?: string;
  encounterId?: string;
  tenantId?: string;
  userId?: string;
  userRole?: string;
  question: string;
  patientContextSummary?: string;
  draftGuidance: string;
  requiresHumanReview: boolean;
  safetyDisclaimer: string;
  safetyCheckPassed: boolean;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedByUserId?: string | null;
}

export interface RecordClinicalCalculatorDto {
  calculatorId: ClinicalCalculatorId;
  patientId?: string;
  encounterId?: string;
  inputs: Record<string, unknown>;
  score: number | string | null;
  riskCategory: string;
  interpretation: string;
  disclaimer: string;
  referenceLine: string;
}

export interface RecordCopilotInteractionDto {
  question: string;
  patientId?: string;
  encounterId?: string;
  userRole?: string;
  patientContextSummary?: string;
  draftGuidance: string;
  requiresHumanReview?: boolean;
  safetyCheckPassed?: boolean;
}