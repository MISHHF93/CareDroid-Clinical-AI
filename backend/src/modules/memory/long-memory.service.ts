import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLongMemoryDto } from './dto/create-long-memory.dto';
import { LongMemoryQueryDto } from './dto/memory-query.dto';
import { LongMemoryEntry, LongMemoryType } from './entities/long-memory-entry.entity';
import { compactTitle, normalizeLimit, normalizeTags } from './memory.constants';

@Injectable()
export class LongMemoryService {
  constructor(
    @InjectRepository(LongMemoryEntry)
    private readonly longMemoryRepository: Repository<LongMemoryEntry>,
  ) {}

  async remember(userId: string, dto: CreateLongMemoryDto) {
    const entry = this.longMemoryRepository.create({
      userId,
      workspaceId: dto.workspaceId || null,
      type: dto.type,
      title: compactTitle(dto.title),
      content: dto.content || {},
      tags: normalizeTags(dto.tags),
    });
    return this.serialize(await this.longMemoryRepository.save(entry));
  }

  async listForUser(userId: string, query: LongMemoryQueryDto = {}) {
    const entries = await this.longMemoryRepository.find({
      where: {
        userId,
        ...(query.type ? { type: query.type } : {}),
      },
      order: { updatedAt: 'DESC' },
      take: normalizeLimit(query.limit, 30, 100),
    });
    return entries.map((entry) => this.serialize(entry));
  }

  async getContext(userId: string) {
    const entries = await this.longMemoryRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: 100,
    });
    const serialized = entries.map((entry) => this.serialize(entry));
    return {
      preferences: serialized
        .filter((entry) => entry.type === LongMemoryType.PREFERENCES)
        .slice(0, 5),
      history: serialized.filter((entry) => entry.type === LongMemoryType.HISTORY).slice(0, 10),
      savedTools: serialized
        .filter((entry) => entry.type === LongMemoryType.SAVED_TOOLS)
        .slice(0, 10),
    };
  }

  async savedWorkflowsForUser(userId: string) {
    const savedTools = await this.listForUser(userId, {
      type: LongMemoryType.SAVED_TOOLS,
      limit: '50',
    });
    return savedTools
      .filter((entry) => {
        const content = entry.content || {};
        return (
          content.kind === 'workflow' ||
          Boolean(content.workflowId) ||
          entry.tags.includes('workflow') ||
          entry.tags.includes('saved-workflow')
        );
      })
      .slice(0, 12);
  }

  async recentToolsForUser(userId: string, limit = 10) {
    const savedTools = await this.listForUser(userId, {
      type: LongMemoryType.SAVED_TOOLS,
      limit: '50',
    });
    return savedTools
      .filter((entry) => {
        const content = entry.content || {};
        return (
          content.kind !== 'workflow' &&
          !content.workflowId &&
          !entry.tags.includes('workflow') &&
          !entry.tags.includes('saved-workflow')
        );
      })
      .slice(0, limit);
  }

  serialize(entry: LongMemoryEntry) {
    return {
      id: entry.id,
      type: entry.type,
      title: entry.title,
      content: entry.content || {},
      tags: entry.tags || [],
      workspaceId: entry.workspaceId,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
