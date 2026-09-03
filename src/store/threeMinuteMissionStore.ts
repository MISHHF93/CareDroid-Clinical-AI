import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThreeMinuteMission } from '../config/threeMinuteMissionModel';

type ThreeMinuteMissionStoreState = Readonly<{
  missions: ThreeMinuteMission[];
  lastSyncedAt: string | null;
  setMissions: (missions: readonly ThreeMinuteMission[]) => void;
  upsertMission: (mission: ThreeMinuteMission) => void;
  removeMission: (missionId: string) => void;
  clearAcknowledgedMissions: () => void;
}>;

export const useThreeMinuteMissionStore = create<ThreeMinuteMissionStoreState>()(
  persist(
    (set) => ({
      missions: [],
      lastSyncedAt: null,
      setMissions: (missions) =>
        set({
          missions: [...missions],
          lastSyncedAt: new Date().toISOString(),
        }),
      upsertMission: (mission) =>
        set((state) => {
          const index = state.missions.findIndex((entry) => entry.missionId === mission.missionId);
          const next = [...state.missions];
          if (index >= 0) next[index] = mission;
          else next.unshift(mission);
          return { missions: next, lastSyncedAt: new Date().toISOString() };
        }),
      removeMission: (missionId) =>
        set((state) => ({
          missions: state.missions.filter((mission) => mission.missionId !== missionId),
          lastSyncedAt: new Date().toISOString(),
        })),
      clearAcknowledgedMissions: () =>
        set((state) => ({
          missions: state.missions.filter((mission) => !mission.acknowledgedAt),
          lastSyncedAt: new Date().toISOString(),
        })),
    }),
    {
      name: 'caredroid-three-minute-missions',
      partialize: (state) => ({
        missions: state.missions.filter((mission) => !mission.acknowledgedAt),
        lastSyncedAt: state.lastSyncedAt,
      }),
    },
  ),
);

export function getThreeMinuteMissionStoreState() {
  return useThreeMinuteMissionStore.getState();
}
