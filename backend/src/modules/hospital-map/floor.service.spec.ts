import { NotFoundException } from '@nestjs/common';
import { FloorService } from './floor.service';

describe('FloorService', () => {
  let service: FloorService;

  beforeEach(() => {
    service = new FloorService();
  });

  it('returns SVG coordinate mapping with floors, rooms, and beds', () => {
    const plan = service.getFloorPlan('floor-2');

    expect(plan.floors).toHaveLength(1);
    expect(plan.floors[0]).toMatchObject({
      id: 'floor-2',
      coordinateSystem: 'svg-viewbox-1000x620',
      viewBox: '0 0 1000 620',
    });
    expect(plan.coordinateMapping).toMatchObject({ type: 'svg', width: 1000, height: 620 });
    expect(plan.rooms.every((room) => room.floorId === 'floor-2')).toBe(true);
    expect(plan.beds.length).toBeGreaterThan(0);
  });

  it('raises for unknown floors', () => {
    expect(() => service.getFloorPlan('floor-not-real')).toThrow(NotFoundException);
  });
});
