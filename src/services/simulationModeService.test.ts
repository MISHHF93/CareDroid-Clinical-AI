import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/featureFlags.config', () => ({
  FEATURE_FLAGS: {
    enableSimulationMode: true,
  },
}));

import {
  SIMULATION_MODE_STORAGE_KEY,
  isSimulationModeActive,
  readSimulationModeActive,
  setSimulationModeActive,
  toggleSimulationModeActive,
} from './simulationModeService';

describe('simulationModeService', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('defaults simulation mode to inactive', () => {
    expect(readSimulationModeActive()).toBe(false);
    expect(isSimulationModeActive()).toBe(false);
  });

  it('persists active simulation mode in localStorage', () => {
    expect(setSimulationModeActive(true)).toBe(true);
    expect(window.localStorage.getItem(SIMULATION_MODE_STORAGE_KEY)).toBe('true');
    expect(isSimulationModeActive()).toBe(true);
  });

  it('clears persisted state when simulation mode is turned off', () => {
    setSimulationModeActive(true);
    setSimulationModeActive(false);
    expect(window.localStorage.getItem(SIMULATION_MODE_STORAGE_KEY)).toBeNull();
    expect(isSimulationModeActive()).toBe(false);
  });

  it('toggles simulation mode active state', () => {
    expect(toggleSimulationModeActive()).toBe(true);
    expect(isSimulationModeActive()).toBe(true);
    expect(toggleSimulationModeActive()).toBe(true);
    expect(isSimulationModeActive()).toBe(false);
  });
});