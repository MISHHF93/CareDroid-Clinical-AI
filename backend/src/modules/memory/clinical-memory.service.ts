import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateClinicalMemoryDto } from './dto/create-clinical-memory.dto';
import { ClinicalMemoryQueryDto } from './dto/memory-query.dto';
import { ClinicalMemoryEntry, ClinicalMemoryType } from './entities/clinical-memory-entry.entity';
import { compactTitle, normalizeLimit } from './memory.constants';

@Injectable()
export class ClinicalMemoryService {
  constructor(
    @InjectRepository(ClinicalMemoryEntry)
    private readonly clinicalMemoryRepository: Repository<ClinicalMemoryEntry>,
  ) {}

  async record(userId: string, dto: CreateClinicalMemoryDto) {
    const entry = this.clinicalMemoryRepository.create({
      userId,
      workspaceId: dto.workspaceId || null,
      patientId: dto.patientId || null,
      type: dto.type,
      title: compactTitle(dto.title),
      content: dto.content || {},
      source: dto.source || null,
    });
    return this.serialize(await this.clinicalMemoryRepository.save(entry));
  }

  async listForUser(userId: string, query: ClinicalMemoryQueryDto = {}) {
    const entries = await this.clinicalMemoryRepository.find({
      where: {
        userId,
        ...(query.type ? { type: query.type } : {}),
        ...(query.patientId ? { patientId: query.patientId } : {}),
      },
      order: { updatedAt: 'DESC' },
      take: normalizeLimit(query.limit, 30, 100),
    });
    return entries.map((entry) => this.serialize(entry));
  }

  async getClinicalContext(userId: string) {
    const entries = await this.listForUser(userId, { limit: '100' });
    return {
      findings: entries.filter((entry) => entry.type === ClinicalMemoryType.FINDINGS).slice(0, 10),
      summaries: entries.filter((entry) => entry.type === ClinicalMemoryType.SUMMARIES).slice(0, 10),
      scores: entries.filter((entry) => entry.type === ClinicalMemoryType.SCORES).slice(0, 10),
    };
  }

  serialize(entry: ClinicalMemoryEntry) {
    return {
      id: entry.id,
      type: entry.type,
      title: entry.title,
      content: entry.content || {},
      patientId: entry.patientId,
      source: entry.source,
      workspaceId: entry.workspaceId,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
