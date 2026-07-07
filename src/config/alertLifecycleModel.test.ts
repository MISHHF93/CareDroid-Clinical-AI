import { describe, expect, it } from 'vitest';
import { resolveAlertLifecycle } from './alertLifecycleModel';

describe('alertLifecycleModel', () => {
  it('maps critical tier to toast + persistent banner', () => {
    const envelope = resolveAlertLifecycle('critical');
    expect(envelope.state).toBe('critical');
    expect(envelope.showToast).toBe(true);
    expect(envelope.showPersistentBanner).toBe(true);
    expect(envelope.primarySurface).toBe('shell-dock');
  });

  it('maps informational tier to drawer-only disclosure', () => {
    const envelope = resolveAlertLifecycle('informational');
    expect(envelope.state).toBe('information');
    expect(envelope.showToast).toBe(false);
    expect(envelope.primarySurface).toBe('drawer');
  });

  it('resolves acknowledged alerts to history', () => {
    const envelope = resolveAlertLifecycle('critical', { acknowledged: true });
    expect(envelope.state).toBe('acknowledged');
    expect(envelope.showToast).toBe(false);
    expect(envelope.showInHistory).toBe(true);
  });
});