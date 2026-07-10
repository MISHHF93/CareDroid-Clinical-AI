import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { AdministrativeAutomationTask } from '../../../../src/types/administrativeAutomation';
import { AdministrativeAutomationTaskEntity } from './entities/administrative-automation-task.entity';

const ACTIVE_STATUSES = ['pending_review', 'approved', 'modified'];

@Injectable()
export class AdministrativeAutomationQueueService {
  constructor(
    @InjectRepository(AdministrativeAutomationTaskEntity)
    private readonly repository: Repository<AdministrativeAutomationTaskEntity>,
  ) {}

  private scope(organizationId: string, workspaceId: string) {
    return { organizationId, workspaceId };
  }

  async listActiveTasks(
    organizationId: string,
    workspaceId: string,
  ): Promise<AdministrativeAutomationTask[]> {
    const rows = await this.repository.find({
      where: {
        ...this.scope(organizationId, workspaceId),
        status: In(ACTIVE_STATUSES),
      },
      order: { updatedAt: 'DESC' },
    });
    return rows.map((row) => row.task as AdministrativeAutomationTask);
  }

  async upsertTasks(
    organizationId: string,
    workspaceId: string,
    tasks: AdministrativeAutomationTask[],
  ): Promise<void> {
    if (!tasks.length) return;
    const entities = tasks.map((task) =>
      this.repository.create({
        id: task.id,
        organizationId,
        workspaceId,
        category: task.category,
        status: task.status,
        priority: task.priority,
        patientId: task.patientId,
        task: task as unknown as Record<string, unknown>,
      }),
    );
    await this.repository.save(entities);
  }

  async replaceSnapshot(
    organizationId: string,
    workspaceId: string,
    tasks: AdministrativeAutomationTask[],
  ): Promise<AdministrativeAutomationTask[]> {
    await this.repository.delete(this.scope(organizationId, workspaceId));
    await this.upsertTasks(organizationId, workspaceId, tasks);
    return tasks;
  }
}
