import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import SystemHealth from './SystemHealth';
import { compareDeploymentCommits } from '../services/systemHealthService';

vi.mock('../services/systemHealthService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchDeploymentTruth: vi.fn().mockResolvedValue({
      backendProbe: {
        ok: true,
        statusCode: 200,
        data: {
          status: 'ok',
          service: 'CareDroid API',
          version: '1.0.0',
          timestamp: '2026-05-30T14:00:00.000Z',
        },
        message: '',
      },
      systemHealth: {
        ok: true,
        statusCode: 200,
        data: {
          apiHealth: 'ok',
          backendVersion: '1.0.0',
          gitCommit: 'unknown',
          buildTimestamp: '2026-05-30T14:00:00.000Z',
          vercelEnvironment: 'preview',
          deploymentStatus: 'guarded',
        },
        message: '',
      },
      backendHealth: {
        status: 'ok',
        service: 'CareDroid backend',
        frontendVersion: '1.0.0',
        backendVersion: '1.0.0',
        gitCommit: 'unknown',
        buildTimestamp: '2026-05-30T14:00:00.000Z',
        vercelEnvironment: 'preview',
        deploymentStatus: 'guarded',
      },
      sourceStatus: 'live',
      message: '',
    }),
  };
});

describe('SystemHealth', () => {
  it('renders deployment truth metadata for frontend, backend, and Vercel', async () => {
    render(
      <MemoryRouter>
        <SystemHealth />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /deployment observability/i })).toBeInTheDocument();
    expect(screen.getByText(/deployment truth panel/i)).toBeInTheDocument();
    expect(screen.getByText('Frontend Version Metadata')).toBeInTheDocument();
    expect(screen.getByText('Backend Health')).toBeInTheDocument();
    expect(screen.getByText('Vercel Environment Status')).toBeInTheDocument();
    expect(screen.getByText('Commit')).toBeInTheDocument();
    expect(screen.getByText('Build time')).toBeInTheDocument();
    expect(screen.getAllByText('Vercel env status').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText('Backend commit')).toBeInTheDocument();
      expect(screen.getByText('Backend health source')).toBeInTheDocument();
      expect(screen.getByText('live')).toBeInTheDocument();
    });
  });

  it('compares frontend and backend commits by full or short hash', () => {
    expect(
      compareDeploymentCommits(
        '335222a1b73f1cd5544074a8c4402a09c990eba6',
        '335222a1b73f1cd5544074a8c4402a09c990eba6'
      ).status
    ).toBe('match');
    expect(compareDeploymentCommits('335222a1b73f', '335222a1b73f1cd5544074a8c').status).toBe(
      'match'
    );
    expect(compareDeploymentCommits('aaaaaaaaaaaa', 'bbbbbbbbbbbb').status).toBe('mismatch');
    expect(compareDeploymentCommits('unknown', 'bbbbbbbbbbbb').status).toBe('unknown');
  });
});
