import { Body, Controller, Get, Injectable, Module, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { patientSafetyContextFromRecord } from '../../../../lib/ai/clinicalSafetyRules';
import { PlatformGovernanceModule, PlatformGovernanceService } from '../platform-governance';
import { AIGovernanceService } from '../../services/ai-governance.service';

interface ModelRegistryDeploymentHistoryEntry {
  at: string;
  event: string;
  actor?: string;
  note?: string;
}

/** Mirrors the real, human-curated `data/model-registry/entries/*.json` schema (validated
 * by `scripts/validate-model-registry.mjs`) -- not every field this service returns comes
 * from here (some are genuinely absent, and are omitted rather than guessed). */
interface ModelRegistryEntry {
  id: string;
  displayName?: string;
  kind?: string;
  status?: string;
  purpose?: string;
  prohibitedUses?: string[];
  owner?: string;
  reviewers?: string[];
  trainingDataLineage?: string;
  benchmarkResults?: unknown;
  regulatoryClass?: string;
  jurisdictions?: string[];
  limitations?: string[];
  deployment?: {
    environments?: string[];
    featureFlag?: string;
    rollback?: string;
    history?: ModelRegistryDeploymentHistoryEntry[];
  };
  expiresAt?: string;
  retirementPlan?: string;
  provider?: string;
  modelIdentifier?: string;
  relatedServiceIds?: string[];
  relatedPaths?: string[];
}

/** Same repo-root-relative-directory pattern as `loadKnowledgeRegistryArtifacts()`
 * (`backend/src/modules/rag/utils/knowledge-registry-enrichment.ts`) -- `process.cwd()` can
 * be either the repo root or `backend/` depending on how the process was launched. */
function loadModelRegistryEntries(repoRoot = process.cwd()): ModelRegistryEntry[] {
  const candidates = [
    join(repoRoot, 'data', 'model-registry', 'entries'),
    join(repoRoot, '..', 'data', 'model-registry', 'entries'),
  ];
  for (const dir of candidates) {
    if (!existsSync(dir)) continue;
    try {
      return readdirSync(dir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as ModelRegistryEntry);
    } catch {
      return [];
    }
  }
  return [];
}

function lastEvaluatedFrom(entry: ModelRegistryEntry): string | undefined {
  const history = entry.deployment?.history;
  if (!history?.length) return undefined;
  return [...history].sort((a, b) => a.at.localeCompare(b.at)).at(-1)?.at;
}

/**
 * Real, governed AI model cards (item 10 of the Care Ops Inbox mega-directive) --
 * previously this returned 3 hardcoded, entirely fictional models ("Clinical Draft
 * Composer", "Synthetic Validation Runner") with fabricated status/approval state, wired
 * through `GET /api/ai-governance/summary`'s `panels.modelInventory` and never noticed
 * because nothing in the frontend renders that panel by name (it only feeds the generic
 * `scoreGovernancePanels`/`controls` surface in `platformGovernanceSurfaces.ts`, so the
 * fake data silently passed as real records to anyone inspecting the API). The real,
 * carefully governed data already existed on disk the whole time
 * (`data/model-registry/entries/*.json`, 5 entries, validated by
 * `scripts/validate-model-registry.mjs`) -- this now serves that instead of fabricating.
 * Fields with no real source (e.g. a formal input-domain/output-type taxonomy) are omitted
 * rather than guessed, per that item's explicit "never fabricate" instruction.
 */
@Injectable()
export class ModelRegistryService {
  listModels() {
    return loadModelRegistryEntries().map((entry) => ({
      modelId: entry.id,
      modelName: entry.displayName || entry.modelIdentifier || entry.id,
      version: entry.modelIdentifier || entry.id,
      provider: entry.provider,
      kind: entry.kind,
      status: entry.status,
      approvalState: entry.status,
      purpose: entry.purpose,
      intendedUse: entry.purpose,
      outOfScopeUse: entry.prohibitedUses || [],
      workflowsUsingIt: entry.relatedServiceIds || [],
      allowedEnvironments: entry.deployment?.environments || [],
      fallback: entry.deployment?.rollback,
      lastEvaluated: lastEvaluatedFrom(entry),
      performanceMeasures: entry.benchmarkResults ?? null,
      knownLimitations: entry.limitations || [],
      changeHistory: entry.deployment?.history || [],
      owner: entry.owner,
      reviewers: entry.reviewers || [],
      regulatoryClass: entry.regulatoryClass,
      expiresAt: entry.expiresAt,
      retirementPlan: entry.retirementPlan,
    }));
  }
}

@Injectable()
export class ApprovalWorkflowService {
  getClinicalReviewPanel() {
    const queue = [
      {
        id: 'approval-clinical-chat-v2',
        capabilityId: 'clinical-chat',
        title: 'Clinical chat prompt policy v2',
        status: 'pending',
        requiredApprovals: 2,
        completedApprovals: 1,
        riskLevel: 'moderate',
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'approval-guideline-rag',
        capabilityId: 'guideline-rag',
        title: 'Guideline RAG evidence refresh',
        status: 'approved',
        requiredApprovals: 1,
        completedApprovals: 1,
        riskLevel: 'low',
        updatedAt: new Date().toISOString(),
      },
    ];

    return {
      approved: queue.filter((item) => item.status === 'approved').length,
      pending: queue.filter((item) => item.status === 'pending').length,
      rejected: queue.filter((item) => item.status === 'rejected').length,
      queue,
    };
  }

  requiresApproval(input: { riskLevel?: string; phiAccessed?: boolean; sideEffecting?: boolean }) {
    const reasons = [
      input.riskLevel === 'high' ? 'high_risk_capability' : null,
      input.phiAccessed ? 'phi_access' : null,
      input.sideEffecting ? 'side_effecting_action' : null,
    ].filter(Boolean);

    return {
      required: reasons.length > 0,
      reasons,
      approverRole: input.riskLevel === 'high' ? 'clinical_governance_owner' : 'clinical_reviewer',
    };
  }
}

@Injectable()
export class RiskClassificationService {
  classify(input: { capabilityId?: string; phiAccessed?: boolean; action?: string } = {}) {
    const action = String(input.action || '').toLowerCase();
    const highRisk =
      input.phiAccessed || /order|prescribe|diagnose|writeback|export|contact/.test(action);
    const cds = highRisk || /recommend|score|summarize|triage|clinical/.test(action);

    return {
      level: highRisk ? 'high' : cds ? 'moderate' : 'low',
      category: highRisk ? 'high_risk_cds' : cds ? 'clinical_decision_support' : 'informational',
      requiresHumanApproval: highRisk,
      counts: { informational: 1, cds: 1, highRisk: 1 },
      rationale: [
        input.phiAccessed ? 'Uses or may expose PHI' : null,
        /order|prescribe|writeback/.test(action)
          ? 'Requested side-effecting clinical action'
          : null,
        cds ? 'Clinical decision support workflow' : 'Informational workflow',
      ].filter(Boolean),
      capabilityId: input.capabilityId || 'unknown',
    };
  }
}

@Injectable()
export class GovernanceAuditService {
  getReleaseHistory() {
    return [
      {
        version: 'enterprise-platform-layer.v1',
        deploymentDate: new Date().toISOString(),
        changeSummary:
          'Governance, security, review, audit, interoperability, and observability layer wired into CareDroid.',
      },
    ];
  }
}

@Controller('ai-governance')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class GovernanceController {
  constructor(
    private readonly modelRegistry: ModelRegistryService,
    private readonly approvalWorkflow: ApprovalWorkflowService,
    private readonly riskClassification: RiskClassificationService,
    private readonly governanceAudit: GovernanceAuditService,
    private readonly platformGovernance: PlatformGovernanceService,
  ) {}

  @Get('summary')
  @Permissions(Permission.VIEW_GOVERNANCE)
  async getSummary() {
    const summary = await this.platformGovernance.getSummary();
    return {
      status: summary.status,
      generatedAt: summary.generatedAt,
      // summary.readiness is the flat { criticality, blocked, blockers } object the
      // frontend's buildPlatformGovernanceSurfaceView reads apiData.readiness.blocked
      // from -- returning the whole `summary` under this same key (as before) made
      // that path undefined, silently falling through to render the raw apiData.status
      // enum ('blocked_until_configured') instead of the human label "Blocked".
      readiness: summary.readiness,
      counts: summary.counts,
      panels: {
        modelInventory: this.modelRegistry.listModels(),
        clinicalReview: this.approvalWorkflow.getClinicalReviewPanel(),
        riskClassification: this.riskClassification.classify({
          capabilityId: 'clinical-chat',
          action: 'clinical recommendation',
          phiAccessed: true,
        }),
        releaseHistory: this.governanceAudit.getReleaseHistory(),
        approvalWorkflow: this.approvalWorkflow.requiresApproval({
          riskLevel: 'high',
          phiAccessed: true,
          sideEffecting: false,
        }),
      },
      integration: {
        dashboard: true,
        assistantLaunchable: true,
        inventorySourceKind: 'platform',
        executorStatus: 'platform',
      },
    };
  }
}

function resolveDateWindow(daysQuery?: string) {
  const parsedDays = Number(daysQuery || 30);
  const days = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 30;
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  return { startDate, endDate };
}

function resolveLimit(limitQuery?: string) {
  const parsedLimit = Number(limitQuery || 50);
  return Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 50;
}

class AIGovernanceEndpointBase {
  constructor(protected readonly aiGovernance: AIGovernanceService) {}

  getRegistry() {
    return this.aiGovernance.getRegistrySnapshot();
  }

  getSafetyRules() {
    return this.aiGovernance.getRegistrySnapshot().safetyRules;
  }

  async getComplianceReport(days?: string) {
    const { startDate, endDate } = resolveDateWindow(days);
    return this.aiGovernance.generateComplianceReport(startDate, endDate);
  }

  async getViolations(limit?: string) {
    const violations = await this.aiGovernance.getSafetyViolations(resolveLimit(limit));
    return { violations };
  }

  validatePrompts() {
    return this.aiGovernance.validateAllPromptTemplates();
  }

  evaluatePriorityChange(body: { patient?: Record<string, unknown>; requestedDps?: number }) {
    const requestedDps = Number(body.requestedDps);
    if (!Number.isFinite(requestedDps) || requestedDps < 1 || requestedDps > 5) {
      return {
        allowed: false,
        requiresHumanReview: true,
        blockReasons: ['invalid_requested_dps'],
        floorReasons: [],
        message: 'requestedDps must be an integer between 1 and 5.',
      };
    }

    return this.aiGovernance.evaluatePriorityChange(
      patientSafetyContextFromRecord(body.patient || {}),
      requestedDps,
    );
  }
}

/**
 * Nest parity for Express `/api/governance/*` (Architect Mode P0).
 * Auth required — Express mount also requires JWT via runtime-auth when Mongoose path is on.
 */
@Controller('governance')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class NestAiGovernanceController extends AIGovernanceEndpointBase {
  constructor(aiGovernance: AIGovernanceService) {
    super(aiGovernance);
  }

  @Get('registry')
  @Permissions(Permission.VIEW_GOVERNANCE)
  getRegistry() {
    return super.getRegistry();
  }

  @Get('safety-rules')
  @Permissions(Permission.VIEW_GOVERNANCE)
  getSafetyRules() {
    return super.getSafetyRules();
  }

  @Get('compliance')
  @Permissions(Permission.VIEW_GOVERNANCE)
  getComplianceReport(@Query('days') days?: string) {
    return super.getComplianceReport(days);
  }

  @Get('violations')
  @Permissions(Permission.VIEW_GOVERNANCE)
  getViolations(@Query('limit') limit?: string) {
    return super.getViolations(limit);
  }

  @Get('validate-prompts')
  @Permissions(Permission.VIEW_GOVERNANCE)
  validatePrompts() {
    return super.validatePrompts();
  }

  @Post('evaluate-priority-change')
  @Permissions(Permission.VIEW_GOVERNANCE)
  evaluatePriorityChange(
    @Body() body: { patient?: Record<string, unknown>; requestedDps?: number },
  ) {
    return super.evaluatePriorityChange(body);
  }
}

@Controller('v1/governance')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class AIGovernanceV1Controller extends AIGovernanceEndpointBase {
  constructor(aiGovernance: AIGovernanceService) {
    super(aiGovernance);
  }

  @Get('registry')
  @Permissions(Permission.VIEW_GOVERNANCE)
  getRegistry() {
    return super.getRegistry();
  }

  @Get('safety-rules')
  @Permissions(Permission.VIEW_GOVERNANCE)
  getSafetyRules() {
    return super.getSafetyRules();
  }

  @Get('compliance')
  @Permissions(Permission.VIEW_GOVERNANCE)
  getComplianceReport(@Query('days') days?: string) {
    return super.getComplianceReport(days);
  }

  @Get('violations')
  @Permissions(Permission.VIEW_GOVERNANCE)
  getViolations(@Query('limit') limit?: string) {
    return super.getViolations(limit);
  }

  @Get('validate-prompts')
  @Permissions(Permission.VIEW_GOVERNANCE)
  validatePrompts() {
    return super.validatePrompts();
  }

  @Post('evaluate-priority-change')
  @Permissions(Permission.VIEW_GOVERNANCE)
  evaluatePriorityChange(
    @Body() body: { patient?: Record<string, unknown>; requestedDps?: number },
  ) {
    return super.evaluatePriorityChange(body);
  }
}

@Controller('emergency/governance')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class EmergencyAIGovernanceController extends AIGovernanceEndpointBase {
  constructor(aiGovernance: AIGovernanceService) {
    super(aiGovernance);
  }

  @Get('registry')
  @Permissions(Permission.VIEW_GOVERNANCE)
  getRegistry() {
    return super.getRegistry();
  }

  @Get('safety-rules')
  @Permissions(Permission.VIEW_GOVERNANCE)
  getSafetyRules() {
    return super.getSafetyRules();
  }

  @Get('compliance')
  @Permissions(Permission.VIEW_GOVERNANCE)
  getComplianceReport(@Query('days') days?: string) {
    return super.getComplianceReport(days);
  }

  @Get('violations')
  @Permissions(Permission.VIEW_GOVERNANCE)
  getViolations(@Query('limit') limit?: string) {
    return super.getViolations(limit);
  }

  @Get('validate-prompts')
  @Permissions(Permission.VIEW_GOVERNANCE)
  validatePrompts() {
    return super.validatePrompts();
  }

  @Post('evaluate-priority-change')
  @Permissions(Permission.VIEW_GOVERNANCE)
  evaluatePriorityChange(
    @Body() body: { patient?: Record<string, unknown>; requestedDps?: number },
  ) {
    return super.evaluatePriorityChange(body);
  }
}

@Module({
  imports: [PlatformGovernanceModule],
  controllers: [
    GovernanceController,
    NestAiGovernanceController,
    AIGovernanceV1Controller,
    EmergencyAIGovernanceController,
  ],
  providers: [
    AIGovernanceService,
    ModelRegistryService,
    ApprovalWorkflowService,
    RiskClassificationService,
    GovernanceAuditService,
  ],
  exports: [
    ModelRegistryService,
    ApprovalWorkflowService,
    RiskClassificationService,
    GovernanceAuditService,
    AIGovernanceService,
  ],
})
export class GovernanceModule {}
