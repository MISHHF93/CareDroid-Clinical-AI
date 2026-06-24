import { FEATURE_FLAGS } from '../config/featureFlags.config';

export const SIMULATION_MODE_STORAGE_KEY = 'caredroid.simulationMode.active';
export const SIMULATION_MODE_CHANGED_EVENT = 'caredroid:simulation-mode-changed';

export type SimulationModeChangedDetail = Readonly<{
  active: boolean;
  enabled: boolean;
}>;

export function isSimulationModeEnabled(): boolean {
  return Boolean(FEATURE_FLAGS.enableSimulationMode);
}

export function readSimulationModeActive(): boolean {
  if (!isSimulationModeEnabled() || typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(SIMULATION_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function isSimulationModeActive(): boolean {
  return isSimulationModeEnabled() && readSimulationModeActive();
}

export function emitSimulationModeChanged(active: boolean): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent<SimulationModeChangedDetail>(SIMULATION_MODE_CHANGED_EVENT, {
      detail: { active, enabled: isSimulationModeEnabled() },
    }),
  );
}

export function setSimulationModeActive(active: boolean): boolean {
  if (!isSimulationModeEnabled() || typeof window === 'undefined') {
    return false;
  }

  try {
    if (active) {
      window.localStorage.setItem(SIMULATION_MODE_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(SIMULATION_MODE_STORAGE_KEY);
    }
  } catch {
    return false;
  }

  emitSimulationModeChanged(active);
  return true;
}

export function toggleSimulationModeActive(): boolean {
  return setSimulationModeActive(!readSimulationModeActive());
}

export function applySimulationModeDocumentState(active = isSimulationModeActive()): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.simulationMode = active ? 'active' : 'inactive';
}