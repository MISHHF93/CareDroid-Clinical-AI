import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { EntitlementStatus } from './enums/platform-asset.enums';

@Injectable()
export class OrganizationAnalyticsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @InjectRepository(OrganizationEntitlement)
    private readonly entitlementRepository: Repository<OrganizationEntitlement>,
  ) {}

  async getOrganizationSummary(organizationId: string) {
    const entitlements = await this.entitlementRepository.find({
      where: { organizationId, status: EntitlementStatus.ENABLED },
    });

    const recentLogs = await this.auditRepository.find({
      where: { organizationId },
      order: { timestamp: 'DESC' },
      take: 100,
    });

    const toolUsage = new Map<string, number>();
    const aiSessions = { count: 0 };
    for (const log of recentLogs) {
      const resource = log.resource || '';
      if (resource.includes('tool') || resource.includes('calculator')) {
        toolUsage.set(resource, (toolUsage.get(resource) || 0) + 1);
      }
      if (resource.includes('chat') || resource.includes('assistant')) {
        aiSessions.count += 1;
      }
    }

    const topTools = [...toolUsage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([resource, count]) => ({ resource, count }));

    return {
      organizationId,
      enabledPackCount: entitlements.length,
      enabledPackIds: entitlements.map((row) => row.packId),
      auditEventCount: recentLogs.length,
      aiSessionCount: aiSessions.count,
      topTools,
      packAdoption: entitlements.map((row) => ({
        packId: row.packId,
        status: row.status,
        enabledAt: row.createdAt,
      })),
      generatedAt: new Date().toISOString(),
    };
  }
}
