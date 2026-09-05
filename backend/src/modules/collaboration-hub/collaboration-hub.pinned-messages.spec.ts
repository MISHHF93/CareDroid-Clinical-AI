import { FindOperator } from 'typeorm';
import { CollaborationHubService } from './collaboration-hub.service';

/**
 * listPinnedMessages used to run `where: { channelId }` and then drop the
 * unpinned rows in JavaScript, so every message in the channel was hydrated as
 * an entity first. Measured in the development database on 2026-09-05: 48,036
 * messages, 0 of them pinned — every row loaded and thrown away. The predicate
 * belongs in the query; the result set is identical either way.
 */
describe('CollaborationHubService.listPinnedMessages', () => {
  function buildService(messages: Array<Record<string, unknown>>) {
    const messageRepo = { find: jest.fn().mockResolvedValue(messages) };
    const service = new CollaborationHubService(
      {} as never, // channelRepo
      {} as never, // membershipRepo
      messageRepo as never,
      {} as never, // reactionRepo
      {} as never, // attachmentRepo
      {} as never, // externalLinkRepo
      {} as never, // realtimeService
      {} as never, // providerRegistry
      {} as never, // attachmentStorage
      {} as never, // auditService
      {} as never, // notificationService
    );
    // getChannel/assertAccess guard membership and are exercised elsewhere;
    // this spec is about the query shape.
    const internals = service as unknown as Record<string, jest.Mock>;
    internals.getChannel = jest
      .fn()
      .mockResolvedValue({ id: 'channel-1', organizationId: 'org-1' });
    internals.assertAccess = jest.fn().mockResolvedValue(undefined);
    return { service, messageRepo };
  }

  it('asks the database for pinned rows only, instead of filtering afterwards', async () => {
    const { service, messageRepo } = buildService([]);

    await service.listPinnedMessages('user-1', 'org-1', 'channel-1');

    expect(messageRepo.find).toHaveBeenCalledTimes(1);
    const [options] = messageRepo.find.mock.calls[0];
    expect(options.where.channelId).toBe('channel-1');
    // A NOT NULL predicate, not an unfiltered channel read.
    expect(options.where.pinnedAt).toBeInstanceOf(FindOperator);
    expect(options.order).toEqual({ pinnedAt: 'DESC' });
  });

  it('returns what the query returned, unchanged', async () => {
    const pinned = [
      { id: 'm-2', channelId: 'channel-1', pinnedAt: new Date('2026-09-02T00:00:00.000Z') },
      { id: 'm-1', channelId: 'channel-1', pinnedAt: new Date('2026-09-01T00:00:00.000Z') },
    ];
    const { service } = buildService(pinned);

    await expect(service.listPinnedMessages('user-1', 'org-1', 'channel-1')).resolves.toEqual(
      pinned,
    );
  });
});
