import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateShortMemoryDto } from './dto/create-short-memory.dto';
import { ShortMemoryQueryDto } from './dto/memory-query.dto';
import { ShortMemoryEntry, ShortMemoryType } from './entities/short-memory-entry.entity';
import { compactTitle, normalizeLimit } from './memory.constants';

@Injectable()
export class ShortMemoryService {
  constructor(
    @InjectRepository(ShortMemoryEntry)
    private readonly shortMemoryRepository: Repository<ShortMemoryEntry>,
  ) {}

  async remember(userId: string, dto: CreateShortMemoryDto) {
    const entry = this.shortMemoryRepository.create({
      userId,
      workspaceId: dto.workspaceId || null,
      type: dto.type,
      title: compactTitle(dto.title),
      content: dto.content || {},
    });
    return this.serialize(await this.shortMemoryRepository.save(entry));
  }

  async listForUser(userId: string, query: ShortMemoryQueryDto = {}) {
    const entries = await this.shortMemoryRepository.find({
      where: {
        userId,
        ...(query.type ? { type: query.type } : {}),
      },
      order: { updatedAt: 'DESC' },
      take: normalizeLimit(query.limit, 30, 100),
    });
    return entries.map((entry) => this.serialize(entry));
  }

  async getActiveContext(userId: string) {
    const entries = await this.shortMemoryRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: 50,
    });
    const latestByType = new Map<ShortMemoryType, ReturnType<ShortMemoryService['serialize']>>();
    for (const entry of entries) {
      if (!latestByType.has(entry.type)) {
        latestByType.set(entry.type, this.serialize(entry));
      }
    }
    return {
      activeConversation: latestByType.get(ShortMemoryType.ACTIVE_CONVERSATION) || null,
      activeCalculator: latestByType.get(ShortMemoryType.ACTIVE_CALCULATOR) || null,
      activeDashboard: latestByType.get(ShortMemoryType.ACTIVE_DASHBOARD) || null,
    };
  }

  async recentConversationsForUser(userId: string, limit = 10) {
    return this.listForUser(userId, {
      type: ShortMemoryType.ACTIVE_CONVERSATION,
      limit: String(limit),
    });
  }

  async recentToolsForUser(userId: string, limit = 10) {
    return this.listForUser(userId, {
      type: ShortMemoryType.ACTIVE_CALCULATOR,
      limit: String(limit),
    });
  }

  serialize(entry: ShortMemoryEntry) {
    return {
      id: entry.id,
      type: entry.type,
      title: entry.title,
      content: entry.content || {},
      workspaceId: entry.workspaceId,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
