import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiFeedbackEntity } from './entities/ai-feedback.entity';
import { SubmitAiFeedbackDto } from './dto/ai-feedback.dto';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * AI feedback capture (item 11). Deliberately thin: this is subjective user
 * sentiment on one response, stored separately from any accuracy/evaluation
 * metric (see AiFeedbackEntity's own doc comment). No aggregation into a
 * "model score" happens here or anywhere else in this codebase.
 */
@Injectable()
export class AiFeedbackService {
  constructor(
    @InjectRepository(AiFeedbackEntity)
    private readonly feedbackRepository: Repository<AiFeedbackEntity>,
  ) {}

  async submit(
    input: SubmitAiFeedbackDto,
    userId: string,
    organizationId?: string,
  ): Promise<{ id: string; createdAt: string }> {
    const entity = this.feedbackRepository.create({
      id: createId('ai-feedback'),
      runId: input.runId,
      capabilityId: input.capabilityId,
      userId,
      organizationId,
      rating: input.rating,
      comment: input.comment,
    });
    const saved = await this.feedbackRepository.save(entity);
    return { id: saved.id, createdAt: saved.createdAt.toISOString() };
  }

  /** Admin/developer inspection (item 12) -- recent feedback for the caller's own org, newest first. */
  async listRecent(organizationId?: string, limit = 100): Promise<AiFeedbackEntity[]> {
    if (!organizationId) return [];
    return this.feedbackRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 500),
    });
  }
}
