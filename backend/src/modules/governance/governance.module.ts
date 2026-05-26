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
    return { approved: 1, pending: 1, rejected: 0 };
  }
}

@Injectable()
export class RiskClassificationService {
  classify() {
    return { informational: 1, cds: 1, highRisk: 1 };
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
        riskClassification: this.riskClassification.classify(),
        releaseHistory: this.governanceAudit.getReleaseHistory(),
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
