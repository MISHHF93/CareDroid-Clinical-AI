import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SystemConfigProvider, useSystemConfig } from './SystemConfigContext';
import configService from '../services/configService';

const mockUserState = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
}));

vi.mock('./UserContext', () => ({
  useUser: () => mockUserState,
}));

vi.mock('../services/configService', () => ({
  default: {
    getSystemConfig: vi.fn(),
    getAIRemainingQueries: vi.fn(),
    getAvailableTools: vi.fn(),
    getCurrentSubscription: vi.fn(),
  },
}));

function ConfigProbe() {
  const { loading, configDegraded, aiUsage } = useSystemConfig();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="degraded">{String(configDegraded)}</span>
      <span data-testid="remaining">{aiUsage.remaining}</span>
    </div>
  );
}

function renderProvider() {
  return render(
    <SystemConfigProvider>
      <ConfigProbe />
    </SystemConfigProvider>
  );
}

describe('SystemConfigProvider API polling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserState.isAuthenticated = false;
    mockUserState.isLoading = false;
  });

  it('uses defaults without calling protected config endpoints before sign-in', async () => {
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    expect(configService.getSystemConfig).not.toHaveBeenCalled();
    expect(configService.getAIRemainingQueries).not.toHaveBeenCalled();
    expect(screen.getByTestId('degraded')).toHaveTextContent('false');
    expect(screen.getByTestId('remaining')).toHaveTextContent('10');
  });

  it('does not keep polling usage after a degraded authenticated load', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    mockUserState.isAuthenticated = true;
    vi.mocked(configService.getSystemConfig).mockResolvedValue({
      rag: { enabled: false },
      _meta: { ok: false, fromDefaults: true, error: 'API unavailable' },
    });
    vi.mocked(configService.getAIRemainingQueries).mockResolvedValue({
      remaining: 10,
      _meta: { ok: false, fromDefaults: true, error: 'API unavailable' },
    });
    vi.mocked(configService.getAvailableTools).mockResolvedValue({
      tools: [],
      _meta: { ok: false, fromDefaults: true, error: 'API unavailable' },
    });
    vi.mocked(configService.getCurrentSubscription).mockResolvedValue({
      tier: 'free',
      status: 'active',
      _meta: { ok: false, fromDefaults: true, error: 'API unavailable' },
    });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('degraded')).toHaveTextContent('true'));

    expect(configService.getAIRemainingQueries).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).not.toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);

    setIntervalSpy.mockRestore();
  });
});
