import { Injectable, Logger, Optional } from '@nestjs/common';
import {
  IntentClassification,
  EmergencySeverity,
} from '../intent-classifier/dto/intent-classification.dto';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';
import { MetricsService } from '../../metrics/metrics.service';
import { CollaborationHubService } from '../../collaboration-hub/collaboration-hub.service';

// Re-export EmergencySeverity for tests
export { EmergencySeverity } from '../intent-classifier/dto/intent-classification.dto';

/**
 * Emergency Escalation DTO
 */
export interface EmergencyEscalationDto {
  severity: EmergencySeverity;
  category: string;
  keywords: string[];
  context: {
    userId: string;
    organizationId?: string;
    conversationId?: number | string;
    message: string;
    timestamp: Date;
    location?: string;
  };
}

/**
 * Escalation Result DTO
 */
export interface EscalationResult {
  escalated: boolean;
  severity: EmergencySeverity;
  actions: EscalationAction[];
  message: string;
  recommendations: string[];
  requiresImmediate911: boolean;
  medicalDirectorNotified: boolean;
  simulationMode: boolean;
  /** Collaboration Hub incident channel opened for this escalation, if the module is available. */
  collaborationChannelId?: string;
}

/**
 * Escalation Action types
 */
export enum EscalationActionType {
  CALL_911 = 'call_911',
  NOTIFY_MEDICAL_DIRECTOR = 'notify_medical_director',
  PAGE_ON_CALL = 'page_on_call',
  RAPID_RESPONSE_TEAM = 'rapid_response_team',
  ACTIVATE_PROTOCOL = 'activate_protocol',
  DOCUMENT_INCIDENT = 'document_incident',
}

export interface EscalationAction {
  type: EscalationActionType;
  priority: number; // 1 = highest
  description: string;
  executed: boolean;
  simulated?: boolean;
  externalIntegrationRequired?: boolean;
  timestamp?: Date;
}

/**
 * Emergency Escalation Service
 *
 * Handles automatic escalation of medical emergencies:
 * - 911 dispatch for critical emergencies
 * - Medical director notification
 * - Protocol activation
 * - Audit trail logging
 *
 * Batch 15 Phase 2: Emergency Escalation Intelligence
 */
@Injectable()
export class EmergencyEscalationService {
  private readonly logger = new Logger(EmergencyEscalationService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly metricsService: MetricsService,
    @Optional() private readonly collaborationHubService?: CollaborationHubService,
  ) {}

  /**
   * Process emergency escalation based on intent classification
   */
  async escalate(
    classification: IntentClassification,
    dto: EmergencyEscalationDto,
  ): Promise<EscalationResult> {
    const startTime = Date.now();

    this.logger.warn(
      `🚨 EMERGENCY ESCALATION: ${dto.severity} - ${dto.category} (Keywords: ${dto.keywords.join(', ')})`,
    );

    // Determine escalation actions based on severity
    const actions = this.getEscalationActions(dto.severity, dto.category);

    // Execute escalation workflow
    const executedActions: EscalationAction[] = [];
    let requires911 = false;
    let medicalDirectorNotified = false;

    for (const action of actions) {
      const executed = await this.executeAction(action, dto);
      if (executed) {
        executedActions.push({ ...action, executed: true, timestamp: new Date() });

        if (action.type === EscalationActionType.CALL_911) {
          requires911 = true;
        }
        if (action.type === EscalationActionType.NOTIFY_MEDICAL_DIRECTOR) {
          medicalDirectorNotified = true;
        }
      }
    }

    // Build escalation message
    const message = this.buildEscalationMessage(dto.severity, dto.category, executedActions);

    // Get clinical recommendations
    const recommendations = this.getRecommendations(dto.severity, dto.category);

    // Audit log the escalation
    await this.auditService.log({
      userId: dto.context.userId,
      action: AuditAction.SECURITY_EVENT, // Repurpose for emergency events
      resource: 'emergency/escalation',
      details: {
        severity: dto.severity,
        category: dto.category,
        keywords: dto.keywords,
        message: dto.context.message.substring(0, 200),
        actions: executedActions.map((a) => a.type),
        requires911,
        medicalDirectorNotified,
        conversationId: dto.context.conversationId,
        simulationMode: true,
        externalIntegrationsConfigured: false,
      },
      ipAddress: '0.0.0.0',
      userAgent: 'system',
    });

    // Open (or reuse) an incident channel for this escalation so staff can
    // coordinate in-context instead of only seeing this in the audit log.
    // Never allowed to fail the escalation itself — best-effort side effect.
    let collaborationChannelId: string | undefined;
    if (this.collaborationHubService) {
      try {
        const organizationId = dto.context.organizationId || 'default-organization';
        const incidentSeverityLabel =
          dto.severity === EmergencySeverity.CRITICAL
            ? 'critical'
            : dto.severity === EmergencySeverity.URGENT
              ? 'high'
              : 'moderate';
        const { channel, created } = await this.collaborationHubService.createIncidentChannel(
          organizationId,
          {
            title: `${dto.severity.toUpperCase()} escalation: ${dto.category}`,
            description: dto.context.message.substring(0, 500),
            severity: incidentSeverityLabel,
            triggerType: 'emergency_escalation',
            sourceId: dto.context.conversationId ? String(dto.context.conversationId) : undefined,
            createdByUserId: dto.context.userId,
          },
        );
        collaborationChannelId = channel.id;
        if (created) {
          await this.collaborationHubService.postSystemMessage(channel.id, { body: message });
        }
      } catch (error) {
        this.logger.warn(
          `Collaboration hub incident channel creation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    // Record metrics using existing MetricsService methods
    const severityLabel =
      dto.severity === EmergencySeverity.CRITICAL
        ? 'critical'
        : dto.severity === EmergencySeverity.URGENT
          ? 'high'
          : 'low';
    this.metricsService.recordEmergencyDetection(dto.category, severityLabel);

    const latencyMs = Date.now() - startTime;
    // Note: MetricsService doesn't have a generic histogram method, so we log latency
    this.logger.debug(`Emergency escalation latency: ${latencyMs}ms`);

    this.logger.log(
      `✅ Emergency escalation completed in ${latencyMs}ms - 911: ${requires911}, Medical Director: ${medicalDirectorNotified}`,
    );

    return {
      escalated: true,
      severity: dto.severity,
      actions: executedActions,
      message,
      recommendations,
      requiresImmediate911: requires911,
      medicalDirectorNotified,
      simulationMode: true,
      collaborationChannelId,
    };
  }

  /**
   * Determine escalation actions based on severity and category
   */
  private getEscalationActions(severity: EmergencySeverity, category: string): EscalationAction[] {
    const actions: EscalationAction[] = [];

    // CRITICAL: Immediate life-threatening emergencies
    if (severity === EmergencySeverity.CRITICAL) {
      actions.push({
        type: EscalationActionType.CALL_911,
        priority: 1,
        description: 'SIMULATED 911 escalation placeholder - Life-threatening emergency detected',
        executed: false,
        simulated: true,
        externalIntegrationRequired: true,
      });

      actions.push({
        type: EscalationActionType.NOTIFY_MEDICAL_DIRECTOR,
        priority: 2,
        description: 'SIMULATED medical director notification placeholder',
        executed: false,
        simulated: true,
        externalIntegrationRequired: true,
      });

      actions.push({
        type: EscalationActionType.RAPID_RESPONSE_TEAM,
        priority: 3,
        description: 'SIMULATED rapid response activation placeholder',
        executed: false,
        simulated: true,
        externalIntegrationRequired: true,
      });

      actions.push({
        type: EscalationActionType.ACTIVATE_PROTOCOL,
        priority: 4,
        description: `Review ${this.getCriticalProtocol(category)} protocol`,
        executed: false,
      });
    }

    // URGENT: Serious but not immediately life-threatening
    if (severity === EmergencySeverity.URGENT) {
      actions.push({
        type: EscalationActionType.NOTIFY_MEDICAL_DIRECTOR,
        priority: 1,
        description:
          'SIMULATED medical director notification placeholder - urgent assessment needed',
        executed: false,
        simulated: true,
        externalIntegrationRequired: true,
      });

      actions.push({
        type: EscalationActionType.PAGE_ON_CALL,
        priority: 2,
        description: 'SIMULATED on-call physician page placeholder',
        executed: false,
        simulated: true,
        externalIntegrationRequired: true,
      });

      actions.push({
        type: EscalationActionType.ACTIVATE_PROTOCOL,
        priority: 3,
        description: `Review ${category} management protocol`,
        executed: false,
      });
    }

    // MODERATE: Concerning but stable
    if (severity === EmergencySeverity.MODERATE) {
      actions.push({
        type: EscalationActionType.NOTIFY_MEDICAL_DIRECTOR,
        priority: 1,
        description: 'SIMULATED medical director notification placeholder - monitoring recommended',
        executed: false,
        simulated: true,
        externalIntegrationRequired: true,
      });

      actions.push({
        type: EscalationActionType.ACTIVATE_PROTOCOL,
        priority: 2,
        description: `📋 Review ${category} monitoring protocol`,
        executed: false,
      });
    }

    // Always document
    actions.push({
      type: EscalationActionType.DOCUMENT_INCIDENT,
      priority: 99,
      description: 'Document emergency incident in audit trail',
      executed: false,
    });

    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute a specific escalation action
   */
  private async executeAction(
    action: EscalationAction,
    dto: EmergencyEscalationDto,
  ): Promise<boolean> {
    try {
      switch (action.type) {
        case EscalationActionType.CALL_911:
          this.logger.error(
            `SIMULATED 911 escalation placeholder: ${dto.category} emergency - User: ${dto.context.userId} - Location: ${dto.context.location || 'Unknown'}`,
          );
          return true;

        case EscalationActionType.NOTIFY_MEDICAL_DIRECTOR:
          this.logger.warn(
            `SIMULATED medical director notification placeholder: ${dto.severity} ${dto.category} - User: ${dto.context.userId}`,
          );
          return true;

        case EscalationActionType.PAGE_ON_CALL:
          this.logger.warn(`SIMULATED on-call physician page placeholder for ${dto.category}`);
          return true;

        case EscalationActionType.RAPID_RESPONSE_TEAM:
          this.logger.error(
            `SIMULATED rapid response team activation placeholder: ${dto.category}`,
          );
          return true;

        case EscalationActionType.ACTIVATE_PROTOCOL:
          this.logger.log(`📋 Protocol activated: ${action.description}`);
          return true;

        case EscalationActionType.DOCUMENT_INCIDENT:
          this.logger.log(`📝 Incident documented in audit trail`);
          return true;

        default:
          this.logger.warn(`Unknown escalation action type: ${action.type}`);
          return false;
      }
    } catch (error) {
      this.logger.error(
        `Failed to execute escalation action ${action.type}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Get critical protocol name based on category
   */
  private getCriticalProtocol(category: string): string {
    const protocols: Record<string, string> = {
      cardiac: 'ACLS (Advanced Cardiac Life Support)',
      respiratory: 'Airway Management / ARDS',
      neurological: 'Stroke / Neuro ICU',
      trauma: 'ATLS (Advanced Trauma Life Support)',
      sepsis: 'Sepsis Bundle',
      psychiatric: 'Psychiatric Emergency',
    };

    return protocols[category] || 'Emergency Management';
  }

  /**
   * Build escalation message for display
   */
  private buildEscalationMessage(
    severity: EmergencySeverity,
    category: string,
    actions: EscalationAction[],
  ): string {
    const severityEmoji = {
      [EmergencySeverity.CRITICAL]: '🚨',
      [EmergencySeverity.URGENT]: '⚠️',
      [EmergencySeverity.MODERATE]: '⚠️',
    };

    const emoji = severityEmoji[severity];
    const severityLabel = severity.toUpperCase();

    let message = `${emoji} **${severityLabel} EMERGENCY DETECTED: ${category}**\n\n`;
    message += `**Simulated / Local Actions Recorded:**\n`;
    actions.forEach((action, index) => {
      message += `${index + 1}. ${action.description}\n`;
    });

    message += `\n⚠️ **This is an automated emergency detection system running in simulated escalation mode.**\n`;
    message += `**Do NOT rely solely on this system for medical emergencies.**\n\n`;

    if (severity === EmergencySeverity.CRITICAL) {
      message += `**IF THIS IS A REAL EMERGENCY:**\n`;
      message += `- Call 911 or your local emergency number IMMEDIATELY\n`;
      message += `- Begin CPR/first aid if trained\n`;
      message += `- Do not wait for further instructions from this system\n`;
    }

    return message;
  }

  /**
   * Get clinical recommendations based on severity and category
   */
  private getRecommendations(severity: EmergencySeverity, category: string): string[] {
    const recommendations: string[] = [];

    // General recommendations by severity
    if (severity === EmergencySeverity.CRITICAL) {
      recommendations.push('Activate emergency response system (911)');
      recommendations.push('Begin immediate life-saving interventions');
      recommendations.push('Establish IV access and obtain vital signs');
      recommendations.push('Prepare for advanced airway management');
    }

    // Category-specific recommendations
    const categoryRecs: Record<string, string[]> = {
      cardiac: [
        'Obtain 12-lead ECG immediately',
        'Administer aspirin 325mg PO if not contraindicated',
        'Establish continuous cardiac monitoring',
        'Prepare for possible PCI/thrombolysis',
      ],
      respiratory: [
        'Administer supplemental oxygen to maintain SpO2 > 90%',
        'Assess airway patency',
        'Prepare for possible intubation',
        'Obtain arterial blood gas',
      ],
      neurological: [
        'Perform rapid neurological assessment (GCS, NIHSS)',
        'Obtain CT head STAT',
        'Document time of symptom onset',
        'Prepare for possible tPA administration',
      ],
      trauma: [
        'Follow ATLS protocol',
        'Control external bleeding',
        'Assess for internal injuries',
        'Obtain FAST exam or CT',
      ],
      sepsis: [
        'Obtain blood cultures before antibiotics',
        'Administer broad-spectrum antibiotics within 1 hour',
        'Begin IV fluid resuscitation',
        'Monitor lactate levels',
      ],
    };

    if (categoryRecs[category]) {
      recommendations.push(...categoryRecs[category]);
    }

    // Always add documentation
    recommendations.push('Document all interventions and patient responses');

    return recommendations;
  }

  /**
   * Check if escalation is required based on classification
   */
  shouldEscalate(classification: IntentClassification): boolean {
    return classification.isEmergency && classification.emergencySeverity !== undefined;
  }
}
