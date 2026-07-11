import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ModuleRef } from '@nestjs/core';
import { SentinelOutboxEntity } from './entities/sentinel-outbox.entity';
import { createId, getSentinelRuntimeConfig } from './sentinel.config';

export type OutboxWriteInput = Readonly<{
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  availableAt?: string;
}>;

@Injectable()
export class SentinelOutboxService {
  private readonly logger = new Logger(SentinelOutboxService.name);

  constructor(
    @InjectRepository(SentinelOutboxEntity)
    private readonly outboxRepo: Repository<SentinelOutboxEntity>,
    private readonly moduleRef: ModuleRef,
    @Optional() private readonly realtimePublisher?: { publish(event: { type: string; payload?: unknown }): void },
  ) {}

  async enqueue(input: OutboxWriteInput): Promise<SentinelOutboxEntity> {
    const row = this.outboxRepo.create({
      id: createId('outbox'),
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: input.payload,
      status: 'pending',
      attempts: 0,
      availableAt: input.availableAt || new Date().toISOString(),
      publishedAt: null,
      lastError: null,
    });
    return this.outboxRepo.save(row);
  }

  async enqueueMany(inputs: readonly OutboxWriteInput[]): Promise<SentinelOutboxEntity[]> {
    const rows = inputs.map((input) =>
      this.outboxRepo.create({
        id: createId('outbox'),
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        payload: input.payload,
        status: 'pending',
        attempts: 0,
        availableAt: input.availableAt || new Date().toISOString(),
        publishedAt: null,
        lastError: null,
      }),
    );
    return this.outboxRepo.save(rows);
  }

  async getPendingCount(): Promise<number> {
    return this.outboxRepo.count({ where: { status: 'pending' } });
  }

  async getHealth(): Promise<{
    pending: number;
    failed: number;
    oldestPendingAt: string | null;
  }> {
    const pending = await this.outboxRepo.count({ where: { status: 'pending' } });
    const failed = await this.outboxRepo.count({ where: { status: 'failed' } });
    const oldest = await this.outboxRepo.find({
      where: { status: 'pending' },
      order: { availableAt: 'ASC' },
      take: 1,
    });
    return {
      pending,
      failed,
      oldestPendingAt: oldest[0]?.availableAt ?? null,
    };
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async publishPending(): Promise<void> {
    const config = getSentinelRuntimeConfig();
    if (!config.enabled) return;

    const now = new Date().toISOString();
    const batch = await this.outboxRepo.find({
      where: {
        status: 'pending',
        availableAt: LessThanOrEqual(now),
      },
      order: { availableAt: 'ASC' },
      take: 50,
    });

    for (const row of batch) {
      try {
        await this.publishOne(row);
        row.status = 'published';
        row.publishedAt = new Date().toISOString();
        row.lastError = null;
        await this.outboxRepo.save(row);
      } catch (error) {
        row.attempts += 1;
        row.lastError = error instanceof Error ? error.message : String(error);
        if (row.attempts >= 8) {
          row.status = 'failed';
        } else {
          // Exponential backoff
          const delaySec = Math.min(300, 2 ** row.attempts);
          row.availableAt = new Date(Date.now() + delaySec * 1000).toISOString();
        }
        await this.outboxRepo.save(row);
        this.logger.warn(
          `Outbox publish failed for ${row.id} attempt ${row.attempts}: ${row.lastError}`,
        );
      }
    }
  }

  private async publishOne(row: SentinelOutboxEntity): Promise<void> {
    const type = `sentinel_${row.eventType}`
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_');

    const payload = {
      outboxId: row.id,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      eventType: row.eventType,
      ...row.payload,
    };

    // Prefer injected publisher; otherwise resolve EmergencyRealtimeService lazily.
    if (this.realtimePublisher) {
      this.realtimePublisher.publish({ type, payload });
      return;
    }

    try {
      const { EmergencyRealtimeService } = await import(
        '../emergency-os/emergency-realtime.service'
      );
      const realtime = this.moduleRef.get(EmergencyRealtimeService, { strict: false });
      if (realtime && typeof realtime.publish === 'function') {
        realtime.publish({ type, payload });
        return;
      }
    } catch {
      // Realtime optional — outbox still succeeds for durability
    }

    this.logger.debug(`Outbox event ${row.eventType} published without realtime fan-out`);
  }
}
