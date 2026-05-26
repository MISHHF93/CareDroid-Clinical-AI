import { RoomService } from './room.service';

describe('RoomService', () => {
  let service: RoomService;

  beforeEach(() => {
    service = new RoomService();
  });

  it('filters rooms by floor and room search', () => {
    const result = service.getRooms({ floorId: 'floor-2', q: 'ICU-12' });

    expect(result.rooms).toHaveLength(1);
    expect(result.rooms[0].roomNumber).toBe('ICU-12');
    expect(result.beds).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Bed 12A' })]),
    );
  });

  it('returns room and bed grid positions for responsive map views', () => {
    const result = service.getRooms({ floorId: 'floor-2' });

    expect(result.roomGrid).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ roomId: 'icu-12', row: 1, column: 1, x: 84, y: 82 }),
      ]),
    );
    expect(result.bedGrid).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ bedId: 'bed-icu-12-a', roomId: 'icu-12', x: 122, y: 178 }),
      ]),
    );
  });
});
