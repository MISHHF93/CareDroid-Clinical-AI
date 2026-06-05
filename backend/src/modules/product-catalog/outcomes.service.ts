import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { OrganizationEntitlement } from '../platform-assets/entities/organization-entitlement.entity';
import { EntitlementStatus } from '../platform-assets/enums/platform-asset.enums';

@Injectable()
export class OutcomesService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @InjectRepository(OrganizationEntitlement)
    private readonly entitlementRepository: Repository<OrganizationEntitlement>,
  ) {}

  async getOrganizationOutcomes(organizationId: string) {
    const entitlements = await this.entitlementRepository.find({
      where: { organizationId, status: EntitlementStatus.ENABLED },
    });

    const logs = await this.auditRepository.find({
      where: { organizationId },
      order: { timestamp: 'DESC' },
      take: 500,
    });

    let toolLaunches = 0;
    let aiUsage = 0;
    let workflowCompletions = 0;
    let simulationCompletions = 0;
    let protocolViews = 0;
    const toolUsage = new Map<string, number>();

    for (const log of logs) {
      const resource = (log.resource || '').toLowerCase();
      const action = (log.action || '').toLowerCase();

      if (resource.includes('tool') || resource.includes('calculator')) {
        toolLaunches += 1;
        toolUsage.set(log.resource, (toolUsage.get(log.resource) || 0) + 1);
      }
      if (resource.includes('chat') || resource.includes('assistant') || action.includes('ai')) {
        aiUsage += 1;
      }
      if (
        resource.includes('workflow') &&
        (action.includes('complete') || action.includes('finish'))
      ) {
        workflowCompletions += 1;
      }
      if (
        resource.includes('simulation') &&
        (action.includes('complete') || action.includes('finish'))
      ) {
        simulationCompletions += 1;
      }
      if (resource.includes('protocol')) {
        protocolViews += 1;
      }
    }

    const topTools = [...toolUsage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([resource, count]) => ({ resource, count }));

    const packAdoptionRate =
      entitlements.length > 0 ? Math.min(100, Math.round((entitlements.length / 14) * 100)) : 0;

    const protocolComplianceProxy =
      protocolViews > 0 && toolLaunches > 0
        ? Math.round((protocolViews / (toolLaunches + protocolViews)) * 100)
        : null;

    return {
      organizationId,
      generatedAt: new Date().toISOString(),
      adoption: {
        enabledPackCount: entitlements.length,
        packAdoptionRate,
        packIds: entitlements.map((e) => e.packId),
      },
      simulation: {
        completionCount: simulationCompletions,
      },
      workflows: {
        completionCount: workflowCompletions,
      },
      protocolCompliance: {
        protocolViews,
        complianceProxyPercent: protocolComplianceProxy,
      },
      aiUsage: {
        sessionCount: aiUsage,
      },
      operational: {
        toolLaunchCount: toolLaunches,
        auditEventCount: logs.length,
        topTools,
      },
      responseTimes: {
        note: 'Derived from audit timestamps in future phase',
        averageMs: null,
      },
    };
  }
}
