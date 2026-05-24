import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Version from './Version';
import { buildInfoRows, shortCommit } from '../config/buildInfo';

describe('Version page', () => {
  it('renders build metadata and deployment verification links', () => {
    render(
      <MemoryRouter>
        <Version />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /caredroid build version/i })).toBeInTheDocument();
    expect(screen.getByText('Commit')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /check \/auth/i })).toHaveAttribute('href', '/auth');
    expect(screen.getByRole('link', { name: /check \/tools/i })).toHaveAttribute('href', '/tools');
    expect(buildInfoRows.some((row) => row.label === 'Build time')).toBe(true);
  });

  it('shortens commit hashes for compact UI badges', () => {
    expect(shortCommit('335222a1b73f1cd5544074a8c4402a09c990eba6')).toBe('335222a1b73f');
    expect(shortCommit('unknown')).toBe('unknown');
  });
});
