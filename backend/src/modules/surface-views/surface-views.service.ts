import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SurfaceViewEntity } from './entities/surface-view.entity';

const MAX_SURFACE_KEY_LENGTH = 80;

/**
 * Item 6 -- change-since-last-view. Deliberately thin: this only ever
 * records a per-user timestamp per surface, never any content -- so it
 * carries no PHI and needs no more than the same READ_PHI-gated access as
 * the surfaces that use it (see SurfaceViewsController).
 */
@Injectable()
export class SurfaceViewsService {
  constructor(
    @InjectRepository(SurfaceViewEntity)
    private readonly surfaceViewRepository: Repository<SurfaceViewEntity>,
  ) {}

  /**
   * Records that `userId` viewed `surfaceKey` right now, and returns the
   * PREVIOUS viewedAt (null the first time) in the same call so the caller
   * can diff "what's new since then" without a race between a separate
   * read-then-write.
   */
  async touch(
    surfaceKey: string,
    userId: string,
    organizationId?: string,
  ): Promise<{ surfaceKey: string; previousViewedAt: string | null; viewedAt: string }> {
    const key = surfaceKey.slice(0, MAX_SURFACE_KEY_LENGTH);
    const existing = await this.surfaceViewRepository.findOne({
      where: { userId, surfaceKey: key },
    });
    const previousViewedAt = existing ? existing.viewedAt.toISOString() : null;

    // Save the fetched row back (not a fresh `.create()`) so this is a real
    // UPDATE on repeat views rather than a second INSERT racing the composite
    // primary key -- `@UpdateDateColumn` bumps `viewedAt` on every save either way.
    const entity = existing ?? this.surfaceViewRepository.create({ userId, surfaceKey: key });
    entity.organizationId = organizationId;
    const saved = await this.surfaceViewRepository.save(entity);

    return { surfaceKey: key, previousViewedAt, viewedAt: saved.viewedAt.toISOString() };
  }

  /** All of the caller's own last-viewed timestamps, for a summary/dashboard use. */
  async listForUser(userId: string): Promise<Array<{ surfaceKey: string; viewedAt: string }>> {
    const rows = await this.surfaceViewRepository.find({ where: { userId } });
    return rows.map((row) => ({
      surfaceKey: row.surfaceKey,
      viewedAt: row.viewedAt.toISOString(),
    }));
  }
}
