/**
 * AI Governance Service
 * Manages compliance, auditing, and safety for all AI features.
 *
 * Aligned with:
 * - NIST AI Risk Management Framework
 * - WHO Ethical Guidelines for AI in Healthcare
 * - FDA Software as a Medical Device (SaMD) framework
 */

import mongoose from 'mongoose';
import {
  AIConfigRegistry,
  AISafetyRules,
  PromptTemplateRegistry,
} from '../config/ai-governance.registry';

export interface AIInteractionAudit {
  id: string;
  timestamp: Date;
  userId: string;
  userRole: string;
  serviceName: string;
  input: any;
  output: any;
  confidence?: number;
  safetyCheckPassed: boolean;
  safetyViolation?: string;
  humanReviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: Date;
  outcome?: string;
  latencyMs: number;
  costCents?: number;
}

export interface AIComplianceReport {
  period: { start: Date; end: Date };
  totalInteractions: number;
  interactionsByService: Record<string, number>;
  safetyViolations: number;
  averageLatencyMs: number;
  humanReviewRate: number;
  estimatedCost: number;
  topUsers: Array<{ userId: string; count: number }>;
}

function getMongoDb() {
  return mongoose.connection.db || null;
}

export class AIGovernanceService {
  private auditTrail: AIInteractionAudit[] = [];

  async logInteraction(audit: Omit<AIInteractionAudit, 'id' | 'timestamp'>): Promise<void> {
    const fullAudit: AIInteractionAudit = {
      id: `ai_audit_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      timestamp: new Date(),
      ...audit,
    };

    this.auditTrail.push(fullAudit);

    const db = getMongoDb();
    if (db) {
      await db.collection('ai_audit_logs').insertOne(fullAudit);
    }

    if (!audit.safetyCheckPassed && audit.safetyViolation) {
      await this.escalateSafetyViolation(fullAudit);
    }
  }

  checkSafetyViolation(
    serviceName: string,
    _input: any,
    suggestedAction: any,
  ): { safe: boolean; violation?: string } {
    const config = AIConfigRegistry[serviceName];
    if (!config) return { safe: true };

    if (suggestedAction?.action === 'lower_priority') {
      const patientDps = suggestedAction.patientDps;
      if (AISafetyRules.cannotLowerPriorityFor.dpsScores.includes(patientDps)) {
        return {
          safe: false,
          violation: `Cannot lower priority for DPS ${patientDps} patient (critical acuity)`,
        };
      }
    }

    if (suggestedAction?.clinical && !suggestedAction?.disclaimer) {
      return {
        safe: false,
        violation: 'Clinical recommendations require disclaimer',
      };
    }

    return { safe: true };
  }

  async generateComplianceReport(startDate: Date, endDate: Date): Promise<AIComplianceReport> {
    const persistedAudits = await this.readPersistedAudits(startDate, endDate);
    const memoryAudits = this.auditTrail.filter(
      (audit) => audit.timestamp >= startDate && audit.timestamp <= endDate,
    );
    const relevantAudits = this.mergeAudits([...persistedAudits, ...memoryAudits]);
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
      period: { start: startDate, end: endDate },
      totalInteractions: relevantAudits.length,
      interactionsByService,
      safetyViolations,
      averageLatencyMs,
      humanReviewRate,
      estimatedCost: totalCost / 100,
      topUsers,
    };
  }

  async getSafetyViolations(limit = 50): Promise<AIInteractionAudit[]> {
    const db = getMongoDb();
    if (!db) {
      return this.auditTrail
        .filter((audit) => !audit.safetyCheckPassed)
        .slice(-limit)
        .reverse();
    }

    return (await db
      .collection('ai_audit_logs')
      .find({ safetyCheckPassed: false })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray()) as unknown as AIInteractionAudit[];
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

  private async readPersistedAudits(startDate: Date, endDate: Date): Promise<AIInteractionAudit[]> {
    const db = getMongoDb();
    if (!db) return [];

    return (await db
      .collection('ai_audit_logs')
      .find({ timestamp: { $gte: startDate, $lte: endDate } })
      .toArray()) as unknown as AIInteractionAudit[];
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
