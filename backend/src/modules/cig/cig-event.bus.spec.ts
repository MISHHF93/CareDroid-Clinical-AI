import { CigEventBus } from './cig-event.bus';
import { buildCigDomainEvent } from '../../../../lib/cig';

describe('CigEventBus', () => {
  it('delivers domain events and graph-updated notifications', () => {
    const bus = new CigEventBus();
    const domain: unknown[] = [];
    const graph: unknown[] = [];

    const offD = bus.onDomainEvent((e) => domain.push(e));
    const offG = bus.onGraphUpdated((p) => graph.push(p));

    const event = buildCigDomainEvent({
      name: 'cig.graph.updated',
      tenantId: 't1',
      producer: 'test',
      eventId: 'e1',
      payload: { snapshotVersion: 1 },
    });
    bus.emitDomainEvent(event);
    bus.emitGraphUpdated({
      tenantId: 't1',
      snapshotVersion: 1,
      projectorGeneration: 'test',
      durability: 'session',
      degraded: true,
      nodeCount: 2,
      edgeCount: 1,
      emittedAt: new Date().toISOString(),
    });

    expect(domain).toHaveLength(1);
    expect(graph).toHaveLength(1);
    expect(bus.subscriberCounts).toEqual({ domain: 1, graph: 1 });

    offD();
    offG();
    expect(bus.subscriberCounts).toEqual({ domain: 0, graph: 0 });
    bus.onModuleDestroy();
  });
});
