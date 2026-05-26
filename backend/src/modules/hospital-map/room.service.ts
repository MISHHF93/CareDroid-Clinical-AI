import { Injectable } from '@nestjs/common';
import { buildHospitalMapSnapshot, filterRooms } from './hospital-map.data';
import { HospitalMapFilter, HospitalMapRoom } from './hospital-map.types';

function gridPosition(room: HospitalMapRoom) {
  return {
    roomId: room.id,
    row: room.y < 300 ? 1 : 2,
    column: Math.max(1, Math.round((room.x - 84) / 242) + 1),
    x: room.x,
    y: room.y,
    width: room.width,
    height: room.height,
  };
}

@Injectable()
export class RoomService {
  getRooms(filter: HospitalMapFilter = {}) {
    const snapshot = buildHospitalMapSnapshot();
    const rooms = filterRooms(snapshot.rooms, snapshot.units, filter);
    const roomIds = new Set(rooms.map((room) => room.id));
    const beds = snapshot.beds.filter((bed) => roomIds.has(bed.roomId));

    return {
      generatedAt: snapshot.generatedAt,
      rooms,
      beds,
      roomGrid: rooms.map(gridPosition),
      bedGrid: beds.map((bed) => ({
        bedId: bed.id,
        roomId: bed.roomId,
        label: bed.label,
        status: bed.status,
        x: bed.x,
        y: bed.y,
        width: bed.width,
        height: bed.height,
      })),
    };
  }
}
