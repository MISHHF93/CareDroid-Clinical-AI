/**
 * AI Governance Service
 * Manages compliance, auditing, and safety for all AI features.
 *
 * Aligned with:
 * - NIST AI Risk Management Framework
 * - WHO Ethical Guidelines for AI in Healthcare
 * - FDA Software as a Medical Device (SaMD) framework
 */

import { Injectable } from '@nestjs/common';
import {
  checkSuggestedActionSafety,
  evaluatePriorityChange as evaluateClinicalPriorityChange,
  type PatientSafetyContext,
  type PriorityChangeEvaluation,
} from '../../../lib/ai/clinicalSafetyRules';
import {
  AIConfigRegistry,
  AISafetyRules,
  type AIServiceConfig,
  PromptTemplateRegistry,
} from '../config/ai-governance.registry';

export interface AIInteractionAudit {
  id: string;
  timestamp: string;
  userId: string;
  userRole: string;
  serviceName: string;
  input: unknown;
  output: unknown;
  confidence?: number;
  safetyCheckPassed: boolean;
  safetyViolation?: string;
  humanReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  outcome?: string;
  latencyMs: number;
  costCents?: number;
}

export interface AIComplianceReport {
  period: { start: string; end: string };
  totalInteractions: number;
  interactionsByService: Record<string, number>;
  safetyViolations: number;
  averageLatencyMs: number;
  humanReviewRate: number;
  estimatedCost: number;
  topUsers: Array<{ userId: string; count: number }>;
  storageMode: 'in-memory-audit-fixture';
  serviceCount: number;
  promptTemplateCount: number;
}

export interface AIGovernanceRegistrySnapshot {
  services: Readonly<Record<string, AIServiceConfig>>;
  promptTemplates: typeof PromptTemplateRegistry;
  safetyRules: typeof AISafetyRules;
  storageMode: 'in-memory-audit-fixture';
  governanceFrameworks: string[];
}

const SEEDED_AUDIT_TRAIL: AIInteractionAudit[] = [
  {
    id: 'ai_audit_seed_copilot_001',
    timestamp: '2026-06-12T08:00:00.000Z',
    userId: 'charge-nurse-demo',
    userRole: 'charge_nurse',
    serviceName: 'copilot',
    input: { query: 'Which patients are overdue for reassessment?' },
    output: { summary: 'Three patients require human review before operational action.' },
    safetyCheckPassed: true,
    humanReviewed: true,
    reviewedBy: 'charge-nurse-demo',
    reviewedAt: '2026-06-12T08:01:00.000Z',
    latencyMs: 420,
    costCents: 2,
  },
  {
    id: 'ai_audit_seed_triage_001',
    timestamp: '2026-06-12T09:30:00.000Z',
    userId: 'triage-nurse-demo',
    userRole: 'nurse',
    serviceName: 'triageSupport',
    input: { chiefComplaint: 'Chest pain', dps: 2 },
    output: { suggestion: 'Maintain high priority; physician review required.' },
    safetyCheckPassed: true,
    humanReviewed: true,
    reviewedBy: 'triage-nurse-demo',
    reviewedAt: '2026-06-12T09:31:00.000Z',
    latencyMs: 310,
    costCents: 1,
  },
];

@Injectable()
export class AIGovernanceService {
  private readonly auditTrail: AIInteractionAudit[] = [...SEEDED_AUDIT_TRAIL];

  getRegistrySnapshot(): AIGovernanceRegistrySnapshot {
    return {
      services: AIConfigRegistry,
      promptTemplates: PromptTemplateRegistry,
      safetyRules: AISafetyRules,
      storageMode: 'in-memory-audit-fixture',
      governanceFrameworks: [
        'NIST AI RMF',
        'WHO AI healthcare guidance',
        'HIPAA Security Rule',
        'FDA SaMD',
      ],
    };
  }

  async logInteraction(audit: Omit<AIInteractionAudit, 'id' | 'timestamp'>): Promise<void> {
    const fullAudit: AIInteractionAudit = {
      id: `ai_audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      timestamp: new Date().toISOString(),
      ...audit,
    };

    this.auditTrail.push(fullAudit);

    if (!audit.safetyCheckPassed && audit.safetyViolation) {
      await this.escalateSafetyViolation(fullAudit);
    }
  }

  checkSafetyViolation(
    serviceName: string,
    _input: unknown,
    suggestedAction: any,
  ): { safe: boolean; violation?: string; floorReasons?: string[] } {
    const config = AIConfigRegistry[serviceName];
    if (!config) return { safe: true };

    return checkSuggestedActionSafety(suggestedAction);
  }

  evaluatePriorityChange(
    patient: PatientSafetyContext,
    requestedDps: number,
  ): PriorityChangeEvaluation {
    return evaluateClinicalPriorityChange(patient, requestedDps);
  }

  async generateComplianceReport(startDate: Date, endDate: Date): Promise<AIComplianceReport> {
    const memoryAudits = this.auditTrail.filter((audit) => {
      const timestamp = new Date(audit.timestamp);
      return timestamp >= startDate && timestamp <= endDate;
    });
    const relevantAudits = this.mergeAudits(memoryAudits);
    const interactionsByService: Record<string, number> = {};

    for (const audit of relevantAudits) {
      interactionsByService[audit.serviceName] =
        (interactionsByService[audit.serviceName] || 0) + 1;
    }

    const safetyViolations = relevantAudits.filter((audit) => !audit.safetyCheckPassed).length;
    const totalLatency = relevantAudits.reduce((sum, audit) => sum + audit.latencyMs, 0);
    const averageLatencyMs = relevantAudits.length ? totalLatency / relevantAudits.length : 0;
    const reviewedInteractions = relevantAudits.filter((audit) => audit.humanReviewed).length;
    const humanReviewRate = relevantAudits.length
      ? reviewedInteractions / relevantAudits.length
      : 0;
    const totalCost = relevantAudits.reduce((sum, audit) => sum + (audit.costCents || 0), 0);

    const userCounts: Record<string, number> = {};
    for (const audit of relevantAudits) {
      userCounts[audit.userId] = (userCounts[audit.userId] || 0) + 1;
    }

    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      totalInteractions: relevantAudits.length,
      interactionsByService,
      safetyViolations,
      averageLatencyMs,
      humanReviewRate,
      estimatedCost: totalCost / 100,
      topUsers,
      storageMode: 'in-memory-audit-fixture',
      serviceCount: Object.keys(AIConfigRegistry).length,
      promptTemplateCount: Object.keys(PromptTemplateRegistry).length,
    };
  }

  async getSafetyViolations(limit = 50): Promise<AIInteractionAudit[]> {
    return this.auditTrail
      .filter((audit) => !audit.safetyCheckPassed)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, limit);
  }

  validatePromptTemplate(templateId: string): { valid: boolean; issues: string[] } {
    const template = PromptTemplateRegistry[templateId];
    if (!template) {
      return { valid: false, issues: ['Template not found'] };
    }

    const issues: string[] = [];

    if (
      !template.template.includes('Human review required') &&
      !template.template.includes('requires human review') &&
      !template.template.includes('requires clinician review')
    ) {
      issues.push('Missing required disclaimer: "Human review required"');
    }

    const matches = template.template.match(/{{([^}]+)}}/g) || [];
    const usedVariables = matches.map((match) => match.slice(2, -2));
    const missingVars = template.variables.filter((variable) => !usedVariables.includes(variable));
    if (missingVars.length > 0) {
      issues.push(`Variables defined but not used: ${missingVars.join(', ')}`);
    }

    return { valid: issues.length === 0, issues };
  }

  validateAllPromptTemplates(): Record<string, { valid: boolean; issues: string[] }> {
    return Object.keys(PromptTemplateRegistry).reduce(
      (results, templateId) => ({
        ...results,
        [templateId]: this.validatePromptTemplate(templateId),
      }),
      {} as Record<string, { valid: boolean; issues: string[] }>,
    );
  }

  private mergeAudits(audits: AIInteractionAudit[]): AIInteractionAudit[] {
    const byId = new Map<string, AIInteractionAudit>();
    for (const audit of audits) {
      byId.set(audit.id, audit);
    }
    return [...byId.values()];
  }

  private async escalateSafetyViolation(audit: AIInteractionAudit): Promise<void> {
    console.error(`[AI SAFETY VIOLATION] ${audit.safetyViolation}`);
    console.error(`User: ${audit.userId} (${audit.userRole})`);
    console.error(`Service: ${audit.serviceName}`);
    console.error('Input:', audit.input);
    console.error('Output:', audit.output);
  }
}

export const aiGovernanceService = new AIGovernanceService();
