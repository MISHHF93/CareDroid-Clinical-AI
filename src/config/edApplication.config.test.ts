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

  it('redirects retired extension prefixes into ED surfaces', async () => {
    vi.stubEnv('VITE_ED_SINGLE_APPLICATION', 'true');
    const mod = await import('./edApplication.config');
    expect(mod.resolveEdExtensionRedirect('/start')).toBeNull();
    expect(mod.resolveEdExtensionRedirect('/dashboard')).toBe('/emergency/command-center');
    expect(mod.resolveEdExtensionRedirect('/cosmos/viewer')).toBe('/emergency/whiteboard');
    expect(mod.resolveEdExtensionRedirect('/surveillance')).toBe('/emergency/settings');
  });

  it('allows in-shell platform routes through without extension redirects', async () => {
    vi.stubEnv('VITE_ED_SINGLE_APPLICATION', 'true');
    const mod = await import('./edApplication.config');
    expect(mod.resolveEdExtensionRedirect('/discover')).toBeNull();
    expect(mod.resolveEdExtensionRedirect('/knowledge-graph')).toBeNull();
    expect(mod.resolveEdExtensionRedirect('/fleet/command')).toBeNull();
    expect(mod.resolveEdExtensionRedirect('/simulation')).toBeNull();
    expect(mod.resolveEdExtensionRedirect('/live-map')).toBeNull();
    expect(mod.resolveEdExtensionRedirect('/workspace')).toBeNull();
  });

  it('allows extension routes when single-application mode is disabled', async () => {
    vi.stubEnv('VITE_ED_SINGLE_APPLICATION', 'false');
    const mod = await import('./edApplication.config');
    expect(mod.resolveEdExtensionRedirect('/fleet/command')).toBeNull();
  });
});
