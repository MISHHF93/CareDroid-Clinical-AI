import { Injectable, NotFoundException } from '@nestjs/common';
import { buildHospitalMapSnapshot } from './hospital-map.data';

@Injectable()
export class FloorService {
  getFloorPlan(floorId?: string) {
    const snapshot = buildHospitalMapSnapshot();
    const floors = floorId
      ? snapshot.floors.filter((floor) => floor.id === floorId)
      : snapshot.floors;

    if (floorId && floors.length === 0) {
      throw new NotFoundException(`Hospital floor ${floorId} was not found`);
    }

    const selectedFloorIds = new Set(floors.map((floor) => floor.id));
    const rooms = snapshot.rooms.filter((room) => selectedFloorIds.has(room.floorId));
    const roomIds = new Set(rooms.map((room) => room.id));

    return {
      generatedAt: snapshot.generatedAt,
      floors,
      units: snapshot.units.filter((unit) => selectedFloorIds.has(unit.floorId)),
      rooms,
      beds: snapshot.beds.filter((bed) => roomIds.has(bed.roomId)),
      coordinateMapping: {
        type: 'svg',
        coordinateSystem: 'svg-viewbox-1000x620',
        viewBox: floors[0]?.viewBox || '0 0 1000 620',
        width: floors[0]?.svgWidth || 1000,
        height: floors[0]?.svgHeight || 620,
      },
    };
  }
}
