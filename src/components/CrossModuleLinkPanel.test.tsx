import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CrossModuleLinkPanel from './CrossModuleLinkPanel';

vi.mock('./CrossModuleLinkPanel.css', () => ({}));

describe('CrossModuleLinkPanel', () => {
  it('renders related module links with rationale and routes', () => {
    render(
      <MemoryRouter>
        <CrossModuleLinkPanel moduleId="protocols" title="Connected decision support" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /connected decision support/i })).toBeVisible();
    expect(screen.getByText(/protocols -> calculators -> ai agents/i)).toBeVisible();
    expect(screen.getByRole('link', { name: /calculators/i })).toHaveAttribute(
      'href',
      '/emergency/tools?filter=calculator',
    );
    expect(screen.getByRole('link', { name: /ai agents/i })).toHaveAttribute('href', '/assistant');
    expect(screen.getByText(/clinical pathways already reference calculators/i)).toBeVisible();
  });
});
