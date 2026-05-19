/**
 * Intent Classification DTOs
 *
 * Data transfer objects for the intent classification system.
 * Defines the structure of intent classification results.
 */

export enum PrimaryIntent {
  GENERAL_QUERY = 'general_query',
  CLINICAL_TOOL = 'clinical_tool',
  EMERGENCY = 'emergency',
  ADMINISTRATIVE = 'administrative',
  MEDICAL_REFERENCE = 'medical_reference',
}

export enum EmergencySeverity {
  CRITICAL = 'critical', // Immediate life threat (e.g., cardiac arrest, stroke)
  URGENT = 'urgent', // Serious but not immediate (e.g., chest pain, severe bleeding)
  MODERATE = 'moderate', // Concerning but stable (e.g., persistent pain, abnormal labs)
}

export interface EmergencyKeyword {
  keyword: string;
  category: string;
  severity: EmergencySeverity;
}

export interface ExtractedParameter {
  name: string;
  value: any;
  confidence: number;
}

export interface IntentClassification {
  // Primary intent classification
  primaryIntent: PrimaryIntent;

  // Tool identification (if clinical_tool intent)
  toolId?: string;

  // Confidence score (0-1)
  confidence: number;

  // Classification method used
  method: 'keyword' | 'nlu' | 'llm';

  // Extracted parameters from the message
  extractedParameters: Record<string, any>;

  // Emergency detection
  isEmergency: boolean;
  emergencyKeywords: EmergencyKeyword[];
  emergencySeverity?: EmergencySeverity;

  // Supporting information
  matchedPatterns: string[];
  alternativeIntents?: Array<{
    intent: PrimaryIntent;
    toolId?: string;
    confidence: number;
  }>;

  // Timestamp
  classifiedAt: Date;
}

export interface IntentClassificationContext {
  userId: string;
  conversationId?: number;
  previousMessages?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  userRole?: string;
  sessionContext?: Record<string, any>;
}

export class ClassifyIntentDto {
  message: string;
  context?: IntentClassificationContext;
}

export class IntentClassificationResultDto {
  classification: IntentClassification;
  requiresEscalation: boolean;
  suggestedAction?: string;
  warningMessage?: string;
}
