import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { createHash, randomUUID } from 'crypto';
import {
  PlatformClinicalReleaseGate,
  PlatformClinicalSafetyFinding,
  PlatformConsentRecord,
  PlatformEquityMetric,
  PlatformGovernancePolicy,
  PlatformGovernanceStatus,
  PlatformObservabilityEvent,
  PlatformPrivacyRequest,
  PlatformRegulatoryClassification,
  PlatformReviewItem,
  PlatformSecurityEvent,
  PlatformSourceProvenance,
  PlatformValidationScenario,
} from './entities/platform-governance.entities';
import {
  PlatformGateDecisionDto,
  PlatformGovernanceSummaryDto,
  PlatformSyntheticConnectorDto,
} from './dto/platform-governance.dto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { AutomationAuditService } from '../automation-audit/automation-audit.service';
import { AutomationAuditStatus } from '../automation-audit/entities/automation-audit-event.entity';

const P0_CAPABILITIES = [
  'clinical-governance',
  'ai-security',
  'regulatory-classification',
  'equity-monitoring',
  'validation-sandbox',
  'human-review-queue',
  'consent-center',
  'privacy-center',
  'audit-trail-spine',
  'deployment-observability',
  'source-provenance',
];

@Injectable()
export class PlatformGovernanceService {
  private readonly logger = new Logger(PlatformGovernanceService.name);

  constructor(
    @InjectRepository(PlatformGovernancePolicy)
    private readonly policies: Repository<PlatformGovernancePolicy>,
    @InjectRepository(PlatformClinicalReleaseGate)
    private readonly releaseGates: Repository<PlatformClinicalReleaseGate>,
    @InjectRepository(PlatformClinicalSafetyFinding)
    private readonly safetyFindings: Repository<PlatformClinicalSafetyFinding>,
    @InjectRepository(PlatformSecurityEvent)
    private readonly securityEvents: Repository<PlatformSecurityEvent>,
    @InjectRepository(PlatformRegulatoryClassification)
    private readonly classifications: Repository<PlatformRegulatoryClassification>,
    @InjectRepository(PlatformEquityMetric)
    private readonly equityMetrics: Repository<PlatformEquityMetric>,
    @InjectRepository(PlatformValidationScenario)
    private readonly validationScenarios: Repository<PlatformValidationScenario>,
    @InjectRepository(PlatformReviewItem)
    private readonly reviewItems: Repository<PlatformReviewItem>,
    @InjectRepository(PlatformConsentRecord)
    private readonly consentRecords: Repository<PlatformConsentRecord>,
    @InjectRepository(PlatformPrivacyRequest)
    private readonly privacyRequests: Repository<PlatformPrivacyRequest>,
    @InjectRepository(PlatformObservabilityEvent)
    private readonly observabilityEvents: Repository<PlatformObservabilityEvent>,
    @InjectRepository(PlatformSourceProvenance)
    private readonly sourceProvenance: Repository<PlatformSourceProvenance>,
    @Optional() private readonly auditService?: AuditService,
    @Optional() private readonly automationAuditService?: AutomationAuditService,
  ) {}

  async getSummary(): Promise<PlatformGovernanceSummaryDto> {
    const [
      policyCount,
      releaseGateCount,
      safetyFindingCount,
      securityEventCount,
      classificationCount,
      equityMetricCount,
      validationScenarioCount,
      reviewItemCount,
      consentRecordCount,
      privacyRequestCount,
      observabilityEventCount,
      sourceProvenanceCount,
    ] = await Promise.all([
      this.policies.count(),
      this.releaseGates.count(),
      this.safetyFindings.count(),
      this.securityEvents.count(),
      this.classifications.count(),
      this.equityMetrics.count(),
      this.validationScenarios.count(),
      this.reviewItems.count(),
      this.consentRecords.count(),
      this.privacyRequests.count(),
      this.observabilityEvents.count(),
      this.sourceProvenance.count(),
    ]);

    const blockers = [
      policyCount === 0 ? 'clinical_governance_policy_required' : null,
      classificationCount === 0 ? 'regulatory_classification_required' : null,
      validationScenarioCount === 0 ? 'validation_scenarios_required' : null,
      consentRecordCount === 0 ? 'consent_policy_required' : null,
    ].filter(Boolean) as string[];

    return {
      status: blockers.length ? 'blocked_until_configured' : 'ready_for_controlled_pilot',
      generatedAt: new Date().toISOString(),
      readiness: {
        criticality: 'P0',
        blocked: blockers.length > 0,
        blockers,
      },
      counts: {
        policies: policyCount,
        releaseGates: releaseGateCount,
        safetyFindings: safetyFindingCount,
        securityEvents: securityEventCount,
        classifications: classificationCount,
        equityMetrics: equityMetricCount,
        validationScenarios: validationScenarioCount,
        reviewItems: reviewItemCount,
        consentRecords: consentRecordCount,
        privacyRequests: privacyRequestCount,
        observabilityEvents: observabilityEventCount,
        sourceProvenance: sourceProvenanceCount,
      },
      safety: {
        autonomousActionTaken: false,
        failClosed: true,
        demoExternalConnectors: true,
      },
    };
  }

  async listPolicies(capabilityId?: string) {
    return this.policies.find({
      where: capabilityId ? { capabilityId } : {},
      order: { updatedAt: 'DESC' },
      take: 50,
    });
  }

  async createPolicy(input: Record<string, any> = {}) {
    const policy = await this.policies.save(
      this.policies.create({
        organizationId: input.organizationId,
        capabilityId: input.capabilityId || 'clinical-governance',
        policyType: input.policyType || 'clinical_safety',
        version: input.version || 'v1',
        status: input.status || PlatformGovernanceStatus.DRAFT,
        content: input.content || {
          intendedUse: input.intendedUse,
          excludedUses: input.excludedUses,
          humanReviewPolicy: input.humanReviewPolicy,
          blockedActions: input.blockedActions,
          modelPolicy: input.modelPolicy,
          privacyPolicy: input.privacyPolicy,
          evidenceRequirements: input.evidenceRequirements,
        },
        createdBy: input.createdBy,
      }),
    );
    await this.logGovernanceAudit('clinical.policy.created', policy.capabilityId, {
      policyId: policy.id,
      policyType: policy.policyType,
      version: policy.version,
      status: policy.status,
      actorUserId: policy.createdBy,
    });
    return policy;
  }

  async updatePolicy(policyId: string, input: Record<string, any> = {}) {
    const policy = await this.policies.findOne({ where: { id: policyId } });
    if (!policy) return null;

    policy.policyType = input.policyType || policy.policyType;
    policy.version = input.version || policy.version;
    policy.status = input.status || policy.status;
    policy.content = input.content || policy.content;
    policy.retiredAt = input.retiredAt ? new Date(input.retiredAt) : policy.retiredAt;
    const saved = await this.policies.save(policy);
    await this.logGovernanceAudit('clinical.policy.updated', saved.capabilityId, {
      policyId: saved.id,
      policyType: saved.policyType,
      version: saved.version,
      status: saved.status,
      actorUserId: input.updatedBy,
    });
    return saved;
  }

  async approvePolicy(policyId: string, decision: Record<string, any> = {}) {
    const policy = await this.policies.findOne({ where: { id: policyId } });
    if (!policy) return null;

    policy.status = PlatformGovernanceStatus.ACTIVE;
    policy.approvedBy = decision.approvedBy;
    policy.effectiveAt = decision.effectiveAt ? new Date(decision.effectiveAt) : new Date();
    policy.content = {
      ...(policy.content || {}),
      approval: {
        decision: decision.decision || 'approve',
        notes: decision.notes,
        approvedAt: policy.effectiveAt.toISOString(),
      },
    };
    const saved = await this.policies.save(policy);
    await this.logGovernanceAudit('clinical.policy.approved', saved.capabilityId, {
      policyId: saved.id,
      policyType: saved.policyType,
      version: saved.version,
      approvedBy: saved.approvedBy,
      effectiveAt: saved.effectiveAt,
    });
    return saved;
  }

  async listReleaseGates(capabilityId?: string) {
    return this.releaseGates.find({
      where: capabilityId ? { capabilityId } : {},
      order: { updatedAt: 'DESC' },
      take: 50,
    });
  }

  async createReleaseGate(input: Record<string, any> = {}) {
    const gate = await this.releaseGates.save(
      this.releaseGates.create({
        capabilityId: input.capabilityId || 'clinical-governance',
        changeType: input.changeType || 'policy',
        artifactVersion: input.artifactVersion || input.version,
        riskLevel: input.riskLevel || 'high',
        validationRunId: input.validationRunId,
        status: input.status || PlatformGovernanceStatus.NEEDS_REVIEW,
        requiredApprovals: input.requiredApprovals || [
          { role: 'clinical_safety_reviewer', required: true },
          { role: 'governance_owner', required: true },
        ],
        decision: input.decision,
      }),
    );
    await this.logGovernanceAudit('release.gate.created', gate.capabilityId, {
      releaseGateId: gate.id,
      changeType: gate.changeType,
      riskLevel: gate.riskLevel,
      validationRunId: gate.validationRunId,
      status: gate.status,
    });
    return gate;
  }

  async decideReleaseGate(gateId: string, decision: Record<string, any> = {}) {
    const gate = await this.releaseGates.findOne({ where: { id: gateId } });
    if (!gate) return null;

    gate.status =
      decision.decision === 'approve'
        ? PlatformGovernanceStatus.ACTIVE
        : decision.decision === 'rollback'
          ? PlatformGovernanceStatus.REVOKED
          : PlatformGovernanceStatus.BLOCKED;
    gate.decision = {
      ...decision,
      decidedAt: new Date().toISOString(),
    };
    const saved = await this.releaseGates.save(gate);
    await this.logGovernanceAudit('release.gate.decided', saved.capabilityId, {
      releaseGateId: saved.id,
      changeType: saved.changeType,
      decision: saved.decision,
      status: saved.status,
    });
    return saved;
  }

  async listSafetyFindings(capabilityId?: string) {
    return this.safetyFindings.find({
      where: capabilityId ? { capabilityId } : {},
      order: { updatedAt: 'DESC' },
      take: 50,
    });
  }

  async createSafetyFinding(input: Record<string, any> = {}) {
    const finding = await this.safetyFindings.save(
      this.safetyFindings.create({
        runId: input.runId,
        capabilityId: input.capabilityId || 'clinical-governance',
        severity: input.severity || 'high',
        findingType: input.findingType || 'clinical_safety',
        source: input.source || 'governance',
        description: input.description || 'Governance safety finding requires triage.',
        ownerUserId: input.ownerUserId,
        status: input.status || PlatformGovernanceStatus.NEEDS_REVIEW,
        resolution: input.resolution,
      }),
    );
    await this.logGovernanceAudit('safety.finding.created', finding.capabilityId, {
      safetyFindingId: finding.id,
      runId: finding.runId,
      severity: finding.severity,
      findingType: finding.findingType,
      status: finding.status,
    });
    return finding;
  }

  async reviewSafetyFinding(findingId: string, review: Record<string, any> = {}) {
    const finding = await this.safetyFindings.findOne({ where: { id: findingId } });
    if (!finding) return null;

    finding.status =
      review.decision === 'resolve'
        ? PlatformGovernanceStatus.RESOLVED
        : review.decision === 'accept_risk'
          ? PlatformGovernanceStatus.ACTIVE
          : PlatformGovernanceStatus.BLOCKED;
    finding.resolution = {
      ...review,
      reviewedAt: new Date().toISOString(),
    };
    const saved = await this.safetyFindings.save(finding);
    await this.logGovernanceAudit('safety.finding.reviewed', saved.capabilityId, {
      safetyFindingId: saved.id,
      runId: saved.runId,
      severity: saved.severity,
      decision: saved.resolution,
      status: saved.status,
    });
    return saved;
  }

  async evaluateGate(input: {
    runId?: string;
    capabilityId: string;
    patientId?: string;
    phiAccessed?: boolean;
    prompt?: string;
    action?: string;
    userId?: string;
    tenantId?: string;
    workspaceId?: string;
  }): Promise<PlatformGateDecisionDto> {
    const reasons: string[] = [];
    const blockedActions = [
      'autonomous_clinical_decision',
      'ehr_writeback_without_confirmation',
      'auto_sign_documentation',
      'submit_prior_authorization',
      'patient_outreach_without_review',
    ];
    const classification = await this.classifications.findOne({
      where: { capabilityId: input.capabilityId, status: PlatformGovernanceStatus.ACTIVE },
    });
    const activePolicy = await this.policies.findOne({
      where: { capabilityId: input.capabilityId, status: PlatformGovernanceStatus.ACTIVE },
    });
    const consentRequired = Boolean(input.phiAccessed || input.patientId);
    const hasConsent = consentRequired
      ? await this.hasActiveConsent(input.patientId || 'unknown', 'clinical_ai')
      : true;
    const injectionRisk = this.detectPromptInjection(input.prompt || '');

    const classificationRequired =
      P0_CAPABILITIES.includes(input.capabilityId) || Boolean(input.phiAccessed);
    const policyRequired =
      P0_CAPABILITIES.includes(input.capabilityId) || Boolean(input.phiAccessed);

    if (classificationRequired && !classification) {
      reasons.push('active_regulatory_classification_missing');
    }
    if (policyRequired && !activePolicy) {
      reasons.push('active_governance_policy_missing');
    }
    if (!hasConsent) reasons.push('active_consent_missing');
    if (injectionRisk) reasons.push('prompt_security_review_required');

    const allowed = reasons.length === 0;

    await this.recordObservabilityEvent({
      correlationId: input.runId,
      capabilityId: input.capabilityId,
      eventType: allowed ? 'platform.gate.allowed' : 'platform.gate.blocked',
      severity: allowed ? 'info' : 'warning',
      status: allowed ? 'allowed' : 'blocked',
      phiAccessed: Boolean(input.phiAccessed),
      metadata: { reasons, action: input.action },
    });

    if (!allowed) {
      await this.recordBlockedAutomationGate(input, reasons);
    }

    if (injectionRisk) {
      await this.recordSecurityEvent({
        runId: input.runId,
        capabilityId: input.capabilityId,
        eventType: 'ai.security.prompt_injection_suspected',
        severity: 'high',
        action: 'blocked_or_review_required',
        metadata: { promptHash: this.hash(input.prompt || '') },
      });
    }

    return {
      runId: input.runId,
      capabilityId: input.capabilityId,
      allowed,
      requiresHumanReview: true,
      consentRequired,
      regulatoryClassificationRequired: classificationRequired && !classification,
      blockedActions,
      reasons,
      metadata: {
        hasActivePolicy: Boolean(activePolicy),
        hasActiveClassification: Boolean(classification),
        classificationRequired,
        policyRequired,
        hasConsent,
        injectionRisk,
      },
    };
  }

  private async recordBlockedAutomationGate(
    input: {
      runId?: string;
      capabilityId: string;
      action?: string;
      userId?: string;
      tenantId?: string;
      workspaceId?: string;
      phiAccessed?: boolean;
      prompt?: string;
    },
    reasons: string[],
  ) {
    if (!this.automationAuditService) return;

    try {
      await this.automationAuditService.createEvent(
        {
          triggerFired: 'Platform governance gate evaluated',
          conditionsEvaluated: reasons.map((reason) => ({ label: reason, result: false })),
          actionSelected: input.action || input.capabilityId,
          user: {
            id: input.userId || 'system',
            name: input.userId || 'System',
          },
          tenant: {
            id: input.tenantId || 'unknown-tenant',
            name: input.tenantId || 'Unknown tenant',
          },
          workspace: {
            id: input.workspaceId || 'unknown-workspace',
            name: input.workspaceId || 'Unknown workspace',
          },
          aiInvolvement: {
            involved: Boolean(input.prompt),
            summary: input.prompt
              ? 'AI prompt or automation request required governance review.'
              : 'Governance gate evaluated a non-prompt automation request.',
          },
          toolCalled: input.capabilityId,
          backendEndpoint: '/api/platform-governance/gate/evaluate',
          status: AutomationAuditStatus.BLOCKED,
          reason: reasons.join(', '),
          timestamp: new Date().toISOString(),
          reviewer: {
            required: true,
            name: 'Platform governance reviewer',
          },
        },
        {
          organizationId: input.tenantId,
          workspaceId: input.workspaceId,
        },
        {
          id: input.userId,
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to record blocked automation gate: ${error}`);
    }
  }

  async recordSecurityEvent(input: Partial<PlatformSecurityEvent>) {
    const event = await this.securityEvents.save(
      this.securityEvents.create({
        capabilityId: input.capabilityId || 'unknown',
        runId: input.runId,
        eventType: input.eventType || 'ai.security.event',
        severity: input.severity || 'medium',
        status: input.status || PlatformGovernanceStatus.NEEDS_REVIEW,
        action: input.action,
        inputHash: input.inputHash,
        metadata: input.metadata || {},
      }),
    );
    await this.logGovernanceAudit('ai.security.event', event.capabilityId, {
      runId: event.runId,
      eventType: event.eventType,
      severity: event.severity,
      status: event.status,
    });
    return event;
  }

  async recordObservabilityEvent(input: Partial<PlatformObservabilityEvent>) {
    try {
      return await this.observabilityEvents.save(
        this.observabilityEvents.create({
          correlationId: input.correlationId,
          capabilityId: input.capabilityId || 'unknown',
          eventType: input.eventType || 'platform.event',
          severity: input.severity || 'info',
          status: input.status || 'recorded',
          durationMs: input.durationMs,
          phiAccessed: Boolean(input.phiAccessed),
          metadata: input.metadata || {},
        }),
      );
    } catch (error) {
      this.logger.warn(`Unable to record platform observability event: ${error}`);
      return null;
    }
  }

  async createReviewItem(input: Partial<PlatformReviewItem>) {
    const item = await this.reviewItems.save(
      this.reviewItems.create({
        organizationId: input.organizationId,
        patientId: input.patientId,
        runId: input.runId,
        capabilityId: input.capabilityId || 'clinical-governance',
        reviewType: input.reviewType || 'clinical_ai',
        severity: input.severity || 'high',
        status: PlatformGovernanceStatus.NEEDS_REVIEW,
        assignedTo: input.assignedTo,
        dueAt: input.dueAt,
        payload: input.payload || {},
      }),
    );
    await this.logGovernanceAudit('review.item.created', item.capabilityId, {
      runId: item.runId,
      patientId: item.patientId,
      reviewType: item.reviewType,
      severity: item.severity,
      status: item.status,
    });
    return item;
  }

  // HEAL-338: was unscoped -- VIEW_REVIEW_QUEUE/REVIEW_CLINICAL_AI are held by
  // PHYSICIAN (org-scoped role, never platform-wide), so any physician could
  // approve/reject another hospital's AI clinical-safety review item by id.
  // NotFoundException-equivalent (return null, matching the existing
  // not-found contract) on a cross-org id mirrors a genuinely missing item.
  async decideReviewItem(itemId: string, decision: Record<string, any>, organizationId?: string) {
    const item = await this.reviewItems.findOne({ where: { id: itemId } });
    if (!item || (organizationId && item.organizationId && item.organizationId !== organizationId)) {
      return null;
    }
    item.status =
      decision.decision === 'approve'
        ? PlatformGovernanceStatus.RESOLVED
        : PlatformGovernanceStatus.BLOCKED;
    item.decision = decision;
    const saved = await this.reviewItems.save(item);
    await this.logGovernanceAudit('review.item.decided', item.capabilityId, {
      reviewItemId: item.id,
      runId: item.runId,
      decision,
      status: item.status,
    });
    return saved;
  }

  // HEAL-338: was unscoped -- any user with VIEW_REVIEW_QUEUE (PHYSICIAN)
  // could list every organization's clinical-AI safety review queue.
  async listReviewItems(organizationId?: string) {
    const items = await this.reviewItems.find({
      where: organizationId ? { organizationId } : undefined,
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return items.length
      ? items
      : [
          {
            id: 'demo-review',
            capabilityId: 'clinical-governance',
            reviewType: 'clinical_ai',
            severity: 'high',
            status: PlatformGovernanceStatus.NEEDS_REVIEW,
            payload: { source: 'synthetic' },
          },
        ];
  }

  async getReviewItem(itemId: string, organizationId?: string) {
    const item = await this.reviewItems.findOne({ where: { id: itemId } });
    if (!item || (organizationId && item.organizationId && item.organizationId !== organizationId)) {
      return null;
    }
    return item;
  }

  async listPatientReviewItems(patientId: string, organizationId?: string) {
    return this.reviewItems.find({
      where: organizationId ? { patientId, organizationId } : { patientId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  // HEAL-338: neither method previously threaded organizationId at all,
  // despite PlatformConsentRecord already carrying the column -- any user
  // with MANAGE_CONSENT could read or overwrite another organization's
  // patient consent status by patientId. getConsent additionally matches
  // legacy (pre-fix) organizationId-null rows so consent recorded before
  // this fix doesn't silently vanish from its own org's view.
  async upsertConsent(
    patientId: string,
    scope: string,
    body: Record<string, any> = {},
    organizationId?: string,
  ) {
    const existing = await this.consentRecords.findOne({
      where: organizationId ? { patientId, scope, organizationId } : { patientId, scope },
    });
    const record =
      existing ||
      this.consentRecords.create({
        patientId,
        scope,
        organizationId: organizationId || undefined,
      });
    record.status = body.status || PlatformGovernanceStatus.ACTIVE;
    record.grantedAt = record.grantedAt || new Date();
    record.expiresAt = body.expiresAt ? new Date(body.expiresAt) : record.expiresAt;
    record.revokedAt =
      body.status === PlatformGovernanceStatus.REVOKED ? new Date() : record.revokedAt;
    record.source = body.source || 'platform';
    record.metadata = body.metadata || {};
    const saved = await this.consentRecords.save(record);
    await this.logGovernanceAudit('consent.changed', 'consent-center', {
      patientId,
      scope,
      status: saved.status,
      consentRecordId: saved.id,
    });
    return saved;
  }

  async getConsent(patientId: string, organizationId?: string) {
    const records = await this.consentRecords.find({
      where: organizationId
        ? [
            { patientId, organizationId },
            { patientId, organizationId: IsNull() },
          ]
        : { patientId },
      order: { updatedAt: 'DESC' },
    });
    return {
      patientId,
      records,
      effectiveStatus: records.some((record) => record.status === PlatformGovernanceStatus.ACTIVE)
        ? 'active'
        : 'missing_or_inactive',
    };
  }

  async createPrivacyRequest(
    patientId: string,
    requestType: string,
    body: Record<string, any> = {},
  ) {
    const request = await this.privacyRequests.save(
      this.privacyRequests.create({
        patientId,
        requestType,
        status: PlatformGovernanceStatus.NEEDS_REVIEW,
        requestedBy: body.requestedBy,
        dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
        metadata: body,
      }),
    );
    await this.logGovernanceAudit('privacy.request.created', 'privacy-center', {
      patientId,
      requestType,
      privacyRequestId: request.id,
      status: request.status,
    });
    return request;
  }

  async listPrivacyRequests(patientId?: string) {
    return this.privacyRequests.find({
      where: patientId ? { patientId } : {},
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async reviewPrivacyRequest(requestId: string, decision: Record<string, any>) {
    const request = await this.privacyRequests.findOne({ where: { id: requestId } });
    if (!request) return null;
    request.status =
      decision.decision === 'approve'
        ? PlatformGovernanceStatus.RESOLVED
        : PlatformGovernanceStatus.BLOCKED;
    request.reviewedBy = decision.reviewedBy;
    request.metadata = { ...(request.metadata || {}), review: decision };
    const saved = await this.privacyRequests.save(request);
    await this.logGovernanceAudit('privacy.request.reviewed', 'privacy-center', {
      patientId: request.patientId,
      privacyRequestId: request.id,
      requestType: request.requestType,
      status: request.status,
    });
    return saved;
  }

  async getPrivacyAccessLog(patientId?: string) {
    const events = await this.observabilityEvents.find({
      order: { createdAt: 'DESC' },
      take: 50,
    });
    return {
      patientId,
      accessLog: events
        .filter((event) => event.phiAccessed || !patientId)
        .map((event) => ({
          id: event.id,
          runId: event.correlationId,
          capabilityId: event.capabilityId,
          accessType: event.eventType,
          phiAccessed: event.phiAccessed,
          timestamp: event.createdAt,
          metadata: event.metadata,
        })),
      safety: {
        rawPhiSuppressed: true,
        autonomousExportAllowed: false,
      },
    };
  }

  async getSourceProvenance(sourceId = 'synthetic-source') {
    const existing = await this.sourceProvenance.findOne({
      where: { externalResourceId: sourceId },
    });
    if (existing) return existing;
    return this.sourceProvenance.save(
      this.sourceProvenance.create({
        sourceSystem: 'CareDroid Synthetic Interoperability',
        sourceType: 'synthetic',
        externalResourceId: sourceId,
        patientId: 'demo-patient',
        resourceType: 'Bundle',
        fetchedAt: new Date(),
        freshness: 'demo',
        normalizedHash: this.hash(sourceId),
        metadata: { connector: 'synthetic' },
      }),
    );
  }

  async getPatientSourceData(patientId: string) {
    const sources = await this.sourceProvenance.find({
      where: { patientId },
      order: { fetchedAt: 'DESC' },
      take: 50,
    });
    return {
      patientId,
      sources: sources.length
        ? sources
        : [await this.getSourceProvenance(`synthetic-${patientId}`)],
      safety: {
        provenanceRequired: true,
        writebackAllowed: false,
        manualConflictResolutionRequired: true,
      },
    };
  }

  async createValidationScenario(body: Record<string, any> = {}) {
    const scenario = await this.validationScenarios.save(
      this.validationScenarios.create({
        capabilityId: body.capabilityId || 'clinical-governance',
        scenarioType: body.scenarioType || 'synthetic_clinical_safety',
        riskLevel: body.riskLevel || 'high',
        version: body.version || 'v1',
        status: PlatformGovernanceStatus.DEMO,
        inputFixture: body.inputFixture || this.syntheticFhirBundle().payload,
        expectedAssertions: body.expectedAssertions || [
          { assertion: 'requiresHumanReview', expected: true },
          { assertion: 'autonomousActionTaken', expected: false },
        ],
      }),
    );
    await this.logGovernanceAudit('validation.scenario.created', scenario.capabilityId, {
      scenarioId: scenario.id,
      scenarioType: scenario.scenarioType,
      riskLevel: scenario.riskLevel,
    });
    return scenario;
  }

  async listValidationScenarios() {
    const scenarios = await this.validationScenarios.find({
      order: { updatedAt: 'DESC' },
      take: 50,
    });
    return scenarios.length ? scenarios : [await this.createValidationScenario()];
  }

  syntheticFhirBundle(): PlatformSyntheticConnectorDto {
    const connectorId = 'synthetic-fhir-demo';
    return {
      connectorId,
      connectorType: 'fhir',
      status: 'synthetic_ready',
      sourceSystem: 'CareDroid Synthetic FHIR R4',
      payload: {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
          { resource: { resourceType: 'Patient', id: 'demo-patient', gender: 'unknown' } },
          { resource: { resourceType: 'Observation', id: 'demo-observation', status: 'final' } },
        ],
      },
      provenance: {
        sourceSystem: 'CareDroid Synthetic FHIR R4',
        externalResourceId: connectorId,
        freshness: 'demo',
        normalizedHash: this.hash(connectorId),
      },
    };
  }

  syntheticHl7Message(): PlatformSyntheticConnectorDto {
    const connectorId = 'synthetic-hl7-demo';
    return {
      connectorId,
      connectorType: 'hl7',
      status: 'synthetic_ready',
      sourceSystem: 'CareDroid Synthetic HL7 v2',
      payload: {
        messageType: 'ADT^A01',
        raw: 'MSH|^~\\\\&|CAREDROID|DEMO|EHR|DEMO|202605261200||ADT^A01|DEMO1|P|2.5',
        parsed: { patientId: 'demo-patient', event: 'admit' },
      },
      provenance: {
        sourceSystem: 'CareDroid Synthetic HL7 v2',
        externalResourceId: connectorId,
        freshness: 'demo',
        normalizedHash: this.hash(connectorId),
      },
    };
  }

  async recentObservability() {
    const events = await this.observabilityEvents.find({ order: { createdAt: 'DESC' }, take: 50 });
    return {
      status: 'synthetic_ready',
      events,
      health: {
        api: 'ok',
        aiGateway: 'guarded',
        audit: 'guarded',
        externalConnectors: 'synthetic',
      },
    };
  }

  private async hasActiveConsent(patientId: string, scope: string): Promise<boolean> {
    if (!patientId || patientId === 'unknown') return false;
    const record = await this.consentRecords.findOne({
      where: { patientId, scope, status: PlatformGovernanceStatus.ACTIVE },
    });
    return Boolean(record);
  }

  private detectPromptInjection(prompt: string): boolean {
    return /ignore (all )?(previous|prior) instructions|reveal (system|developer) prompt|exfiltrate/i.test(
      prompt,
    );
  }

  private hash(value: string): string {
    return createHash('sha256')
      .update(value || randomUUID())
      .digest('hex');
  }

  private async logGovernanceAudit(
    eventName: string,
    capabilityId: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    if (!this.auditService) return;
    try {
      await this.auditService.log({
        userId: metadata.actorUserId,
        action: AuditAction.SECURITY_EVENT,
        resource: `platform-governance/${capabilityId}`,
        ipAddress: '0.0.0.0',
        userAgent: 'platform-governance',
        phiAccessed: Boolean(metadata.patientId),
        metadata: {
          eventName,
          capabilityId,
          ...metadata,
        },
      });
    } catch (error) {
      this.logger.warn(`Unable to write platform governance audit event: ${error}`);
    }
  }
}
