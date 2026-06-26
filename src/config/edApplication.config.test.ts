import { afterEach, describe, expect, it, vi } from 'vitest';

describe('edApplication.config', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to single-application ED mode', async () => {
    vi.stubEnv('VITE_ED_SINGLE_APPLICATION', '');
    const mod = await import('./edApplication.config');
    expect(mod.isEdSingleApplicationMode()).toBe(true);
    expect(mod.getEdApplicationHomeRoute()).toBe('/emergency/whiteboard');
  });

  it('redirects extension prefixes into ED surfaces', async () => {
    vi.stubEnv('VITE_ED_SINGLE_APPLICATION', 'true');
    const mod = await import('./edApplication.config');
    expect(mod.resolveEdExtensionRedirect('/fleet/command')).toBe('/emergency/ems');
    expect(mod.resolveEdExtensionRedirect('/start')).toBe('/emergency/whiteboard');
    expect(mod.resolveEdExtensionRedirect('/cosmos/viewer')).toBe('/emergency/whiteboard');
  });

  it('allows extension routes when single-application mode is disabled', async () => {
    vi.stubEnv('VITE_ED_SINGLE_APPLICATION', 'false');
    const mod = await import('./edApplication.config');
    expect(mod.resolveEdExtensionRedirect('/fleet/command')).toBeNull();
  });
});