import type { Room, RoomStatus } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';

type IntegrationEvent = Record<string, unknown>;

const ROOM_STATUS_MAP: Record<string, RoomStatus> = {
  available: 'Available',
  clean: 'Available',
  occupied: 'Occupied',
  dirty: 'Cleaning',
  cleaning: 'Cleaning',
  blocked: 'Blocked',
  reserved: 'Reserved',
};

export function roomStatusFromIntegrationPayload(payload: Record<string, unknown>): RoomStatus | null {
  const raw = String(
    payload.roomStatus || payload.bedStatus || payload.status || payload.metric || '',
  ).toLowerCase();
  return ROOM_STATUS_MAP[raw] || null;
}

export function applyRoomStatusFromIntegrationEvent(event: IntegrationEvent): {
  ok: boolean;
  roomId?: string;
  status?: RoomStatus;
} {
  const payload = (event.payload || {}) as Record<string, unknown>;
  const roomId = String(payload.roomId || payload.locationRef || payload.bedId || '').trim();
  const status = roomStatusFromIntegrationPayload(payload);
  if (!roomId || !status) return { ok: false };

  const state = useEmergencyStore.getState();
  const room = state.rooms.find((entry) => entry.id === roomId || entry.name === roomId);
  if (!room) return { ok: false };

  const nextRooms = state.rooms.map((entry) =>
    entry.id === room.id ? { ...entry, status } : entry,
  );
  useEmergencyStore.setState({ rooms: nextRooms });

  return { ok: true, roomId: room.id, status };
}