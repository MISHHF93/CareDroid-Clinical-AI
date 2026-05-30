import { TimelineService } from './timeline.service';

describe('TimelineService', () => {
  const service = new TimelineService();

  it('lists unified clinical timeline events', () => {
    expect(service.listEvents().map((event) => event.kind)).toEqual(
      expect.arrayContaining(['calculator', 'ai', 'device', 'fleet', 'audit']),
    );
  });

  it('filters by workspace and event kind', () => {
    const events = service.listEvents({ workspaceId: 'emergency', kind: 'calculator' });
    expect(events).toEqual([expect.objectContaining({ id: 'tl-calc-qsofa' })]);
  });
});
