import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  buildAlarmFingerprint,
  evaluateEscalation,
  evaluateSuppression,
  isAlarmTransitionAllowed,
} from '../../../../lib/sentinel/alarmEngine';
import type {
  SentinelAlarmSeverity,
  SentinelAlarmStatus,
  SentinelAlarmUrgency,
} from '../../../../lib/sentinel/types';
import { SentinelAlarmEntity } from './entities/sentinel-alarm.entity';
import { SentinelAlarmEventEntity } from './entities/sentinel-alarm-event.entity';
import { SentinelOutboxService } from './sentinel-outbox.service';
import { createId, getSentinelRuntimeConfig } from './sentinel.config';

export type RaiseAlarmInput = Readonly<{
  source: string;
  category: string;
  ruleId: string;
  subjectId: string;
  severity: SentinelAlarmSeverity;
  urgency: SentinelAlarmUrgency;
  title: string;
  message: string;
  organizationId?: string | null;
  metadata?: Record<string, unknown> | null;
  actorId?: string | null;
}>;

@Injectable()
export class SentinelAlarmService {
  constructor(
    @InjectRepository(SentinelAlarmEntity)
    private readonly alarmRepo: Repository<SentinelAlarmEntity>,
    @InjectRepository(SentinelAlarmEventEntity)
    private readonly eventRepo: Repository<SentinelAlarmEventEntity>,
    private readonly outbox: SentinelOutboxService,
  ) {}

  async listOpen(organizationId?: string): Promise<SentinelAlarmEntity[]> {
    const where: Record<string, unknown> = {
      status: In(['open', 'escalated', 'acknowledged']),
    };
    if (organizationId) where.organizationId = organizationId;
    return this.alarmRepo.find({
      where,
      order: { createdAtIso: 'DESC' },
      take: 200,
    });
  }

  async raise(input: RaiseAlarmInput): Promise<{
    alarm: SentinelAlarmEntity | null;
    suppressed: boolean;
    reason: string | null;
  }> {
    const fingerprint = buildAlarmFingerprint({
      source: input.source,
      category: input.category,
      subjectId: input.subjectId,
      ruleId: input.ruleId,
    });

    const existingOpen = await this.alarmRepo.findOne({
      where: {
        fingerprint,
        status: In(['open', 'escalated', 'acknowledged']),
      },
    });

    const suppression = evaluateSuppression({
      existingOpenFingerprint: Boolean(existingOpen),
      severity: input.severity,
      suppressUntilIso: existingOpen?.suppressUntil,
    });

    if (suppression.suppress) {
      return { alarm: existingOpen, suppressed: true, reason: suppression.reason };
    }

    const now = new Date().toISOString();
    const alarm = this.alarmRepo.create({
      id: createId('salarm'),
      fingerprint,
      source: input.source,
      category: input.category,
      ruleId: input.ruleId,
      subjectId: input.subjectId,
      severity: input.severity,
      urgency: input.urgency,
      status: 'open',
      title: input.title,
      message: input.message,
      createdAtIso: now,
      acknowledgedAt: null,
      acknowledgedBy: null,
      escalatedAt: null,
      resolvedAt: null,
      dismissedAt: null,
      expiredAt: null,
      suppressUntil: null,
      organizationId: input.organizationId ?? null,
      metadata: input.metadata ?? null,
    });
    await this.alarmRepo.save(alarm);
    await this.recordEvent(alarm.id, 'created', input.actorId ?? null, null, null);
    await this.outbox.enqueue({
      aggregateType: 'alarm',
      aggregateId: alarm.id,
      eventType: 'AlarmRaised',
      payload: {
        alarmId: alarm.id,
        severity: alarm.severity,
        title: alarm.title,
        subjectId: alarm.subjectId,
      },
    });
    return { alarm, suppressed: false, reason: null };
  }

  async transition(
    alarmId: string,
    to: SentinelAlarmStatus,
    actor: { actorId?: string | null; actorRole?: string | null; reason?: string | null },
  ): Promise<SentinelAlarmEntity> {
    const alarm = await this.alarmRepo.findOne({ where: { id: alarmId } });
    if (!alarm) throw new NotFoundException(`Alarm ${alarmId} not found`);

    const from = alarm.status as SentinelAlarmStatus;
    if (!isAlarmTransitionAllowed(from, to)) {
      throw new BadRequestException(`Transition ${from} → ${to} is not allowed`);
    }

    const now = new Date().toISOString();
    alarm.status = to;
    if (to === 'acknowledged') {
      alarm.acknowledgedAt = now;
      alarm.acknowledgedBy = actor.actorId ?? null;
    } else if (to === 'escalated') {
      alarm.escalatedAt = now;
    } else if (to === 'resolved') {
      alarm.resolvedAt = now;
    } else if (to === 'dismissed') {
      alarm.dismissedAt = now;
    } else if (to === 'expired') {
      alarm.expiredAt = now;
    } else if (to === 'suppressed') {
      alarm.suppressUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    }

    await this.alarmRepo.save(alarm);
    await this.recordEvent(
      alarm.id,
      to,
      actor.actorId ?? null,
      actor.actorRole ?? null,
      actor.reason ?? null,
    );

    const eventType =
      to === 'acknowledged'
        ? 'AlarmAcknowledged'
        : to === 'escalated'
          ? 'AlarmEscalated'
          : to === 'suppressed'
            ? 'AlarmSuppressed'
            : to === 'expired'
              ? 'AlarmExpired'
              : 'AlarmAcknowledged';

    await this.outbox.enqueue({
      aggregateType: 'alarm',
      aggregateId: alarm.id,
      eventType,
      payload: { alarmId: alarm.id, status: to, actorId: actor.actorId ?? null },
    });

    return alarm;
  }

  async runEscalationSweep(): Promise<number> {
    const config = getSentinelRuntimeConfig();
    if (!config.enabled) return 0;

    const openAlarms = await this.alarmRepo.find({
      where: { status: In(['open']) },
      take: 100,
    });
    let count = 0;
    for (const alarm of openAlarms) {
      const decision = evaluateEscalation({
        status: alarm.status as SentinelAlarmStatus,
        severity: alarm.severity as SentinelAlarmSeverity,
        urgency: alarm.urgency as SentinelAlarmUrgency,
        createdAtIso: alarm.createdAtIso,
        acknowledgedAtIso: alarm.acknowledgedAt,
        escalatedAtIso: alarm.escalatedAt,
        deadlineMs: config.escalationDeadlineMs,
      });
      if (decision.shouldEscalate) {
        await this.transition(alarm.id, 'escalated', {
          actorId: 'system',
          actorRole: 'sentinel-escalation',
          reason: decision.reason,
        });
        count += 1;
      }
    }
    return count;
  }

  async listEvents(alarmId: string): Promise<SentinelAlarmEventEntity[]> {
    return this.eventRepo.find({
      where: { alarmId },
      order: { occurredAt: 'ASC' },
    });
  }

  async performanceSnapshot(): Promise<{
    openCount: number;
    escalatedCount: number;
    medianAckSeconds: number | null;
  }> {
    const openCount = await this.alarmRepo.count({ where: { status: 'open' } });
    const escalatedCount = await this.alarmRepo.count({ where: { status: 'escalated' } });
    const acked = await this.alarmRepo.find({
      where: { status: In(['acknowledged', 'resolved']) },
      take: 100,
      order: { createdAt: 'DESC' },
    });
    const deltas = acked
      .filter((a) => a.acknowledgedAt)
      .map((a) => Date.parse(a.acknowledgedAt as string) - Date.parse(a.createdAtIso))
      .filter((n) => Number.isFinite(n) && n >= 0)
      .sort((a, b) => a - b);
    const medianAckSeconds =
      deltas.length === 0 ? null : Math.round(deltas[Math.floor(deltas.length / 2)] / 1000);
    return { openCount, escalatedCount, medianAckSeconds };
  }

  private async recordEvent(
    alarmId: string,
    action: string,
    actorId: string | null,
    actorRole: string | null,
    reason: string | null,
  ): Promise<void> {
    const event = this.eventRepo.create({
      id: createId('saevt'),
      alarmId,
      action,
      actorId,
      actorRole,
      occurredAt: new Date().toISOString(),
      reason,
      metadata: null,
    });
    await this.eventRepo.save(event);
  }
}
