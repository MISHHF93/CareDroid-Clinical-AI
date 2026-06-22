import { describe, expect, it } from 'vitest';
import {
  CARE_DROID_SCREEN_MODES,
} from '../central-node/careDroidCentralNode';
import { resolveWhiteboardDisplayProfile } from './useWhiteboardDisplayMode';

describe('resolveWhiteboardDisplayProfile', () => {
  it('enables display-mode behavior for read-only screen modes', () => {
    const profile = resolveWhiteboardDisplayProfile({
      screenMode: CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
      wallDisplayRefreshInterval: 30000,
      displayQueryReadOnly: false,
    });

    expect(profile.isDisplayMode).toBe(true);
    expect(profile.canMutate).toBe(false);
    expect(profile.autoRefresh).toBe(true);
    expect(profile.operationalAwarenessOnly).toBe(true);
    expect(profile.isReadOnlyWhiteboardDisplay).toBe(true);
    expect(profile.refreshIntervalMs).toBe(30000);
  });

  it('honors display query override for kiosk URLs', () => {
    const profile = resolveWhiteboardDisplayProfile({
      screenMode: CARE_DROID_SCREEN_MODES.commandCenter,
      wallDisplayRefreshInterval: 20000,
      displayQueryReadOnly: true,
    });

    expect(profile.isDisplayMode).toBe(true);
    expect(profile.canMutate).toBe(false);
  });

  it('allows mutations on command center when not in display mode', () => {
    const profile = resolveWhiteboardDisplayProfile({
      screenMode: CARE_DROID_SCREEN_MODES.commandCenter,
      wallDisplayRefreshInterval: 45000,
      displayQueryReadOnly: false,
    });

    expect(profile.isDisplayMode).toBe(false);
    expect(profile.canMutate).toBe(true);
    expect(profile.autoRefresh).toBe(true);
    expect(profile.refreshIntervalMs).toBe(45000);
  });

  it('clamps refresh interval to a safe minimum', () => {
    const profile = resolveWhiteboardDisplayProfile({
      screenMode: CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
      wallDisplayRefreshInterval: 5000,
      displayQueryReadOnly: false,
    });

    expect(profile.refreshIntervalMs).toBe(15000);
  });
});
