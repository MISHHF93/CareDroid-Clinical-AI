import { Controller, Get, Injectable, Module, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PlatformGovernanceModule, PlatformGovernanceService } from '../platform-governance';

@Injectable()
export class AuditTrailService {
  constructor(private readonly platformGovernance: PlatformGovernanceService) {}

  async getSummary() {
    const observability = await this.platformGovernance.recentObservability();
    return {
      trackedEvents: [
        'tool_launches',
        'ai_responses',
        'calculator_usage',
        'user_actions',
        'model_version',
        'timestamps',
      ],
      events: observability.events || [],
      integrity: { hashChainExpected: true, rawPhiSuppressed: true },
    };
  }
}

@Controller('ehr-audit')
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
export class EhrAuditController {
  constructor(private readonly auditTrail: AuditTrailService) {}

  @Get('summary')
  @Permissions(Permission.VIEW_AUDIT_LOGS)
  getSummary() {
    return this.auditTrail.getSummary();
  }
}

@Module({
  imports: [PlatformGovernanceModule],
  controllers: [EhrAuditController],
  providers: [AuditTrailService],
  exports: [AuditTrailService],
})
export class EhrAuditModule {}
