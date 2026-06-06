import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAutomationAuditEventDto } from './dto/automation-audit.dto';
import {
  AutomationAuditEvent,
  AutomationAuditStatus,
} from './entities/automation-audit-event.entity';

export interface AutomationAuditTenantContext {
  organizationId?: string;
  organizationName?: string;
  workspaceId?: string;
  workspaceName?: string;
}

export interface AutomationAuditActorContext {
  id?: string;
  userId?: string;
  sub?: string;
  email?: string;
  name?: string;
}

function requireContextValue(value: string | undefined, fallback: string) {
  return value && value.trim() ? value : fallback;
}

@Injectable()
export class AutomationAuditService {
  constructor(
    @InjectRepository(AutomationAuditEvent)
    private readonly automationAuditRepository: Repository<AutomationAuditEvent>,
  ) {}

  async createEvent(
    dto: CreateAutomationAuditEventDto,
    tenantContext: AutomationAuditTenantContext = {},
    actorContext: AutomationAuditActorContext = {},
  ) {
    this.validateOutcome(dto);

    const tenantId = requireContextValue(tenantContext.organizationId, dto.tenant.id);
    const workspaceId = requireContextValue(tenantContext.workspaceId, dto.workspace.id);
    const userId = requireContextValue(actorContext.id || actorContext.userId || actorContext.sub, dto.user.id);

    const event = this.automationAuditRepository.create({
      triggerFired: dto.triggerFired,
      conditionsEvaluated: dto.conditionsEvaluated,
      actionSelected: dto.actionSelected,
      userId,
      userName: requireContextValue(actorContext.name || actorContext.email, dto.user.name),
      tenantId,
      tenantName: requireContextValue(tenantContext.organizationName, dto.tenant.name),
      workspaceId,
      workspaceName: requireContextValue(tenantContext.workspaceName, dto.workspace.name),
      aiInvolved: dto.aiInvolvement.involved,
      aiSummary: dto.aiInvolvement.summary,
      toolCalled: dto.toolCalled,
      backendEndpoint: dto.backendEndpoint,
      status: dto.status,
      reason: dto.reason,
      error: dto.error,
      timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
      reviewerRequired: dto.reviewer.required,
      reviewerName: dto.reviewer.name,
    });

    return this.automationAuditRepository.save(event);
  }

  async listEvents(filters: { tenantId?: string; status?: AutomationAuditStatus; limit?: number } = {}) {
    const tenantId = filters.tenantId;
    const limit = Math.min(Math.max(filters.limit || 100, 1), 500);

    return this.automationAuditRepository.find({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  private validateOutcome(dto: CreateAutomationAuditEventDto) {
    if (dto.status === AutomationAuditStatus.BLOCKED && !dto.reason?.trim()) {
      throw new BadRequestException('Blocked automation audit events must include a reason.');
    }

    if (dto.status === AutomationAuditStatus.FAILED && !dto.error?.trim()) {
      throw new BadRequestException('Failed automation audit events must include an error.');
    }
  }
}
