import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformGovernanceModule, PlatformGovernanceService } from '../platform-governance';

@Injectable()
export class ModelRegistryService {
  listModels() {
    return [
      {
        modelName: 'CareDroid Clinical Router',
        version: 'v1',
        status: 'active',
        approvalState: 'approved',
      },
      {
        modelName: 'Clinical Draft Composer',
        version: 'v1',
        status: 'guarded',
        approvalState: 'pending',
      },
      {
        modelName: 'Synthetic Validation Runner',
        version: 'v1',
        status: 'sandbox',
        approvalState: 'approved',
      },
    ];
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
    const readiness = await this.platformGovernance.getSummary();
    return {
      status: readiness.status,
      readiness,
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

@Module({
  imports: [PlatformGovernanceModule],
  controllers: [GovernanceController],
  providers: [
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
  ],
})
export class GovernanceModule {}
