/**
 * Tools / fleet catch-all fallback — redirects and tool-not-found UX.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ToolsAreaFallback from './ToolsAreaFallback';

function renderFallback(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/tools/*" element={<ToolsAreaFallback />} />
        <Route path="/fleet/*" element={<ToolsAreaFallback />} />
        <Route path="/assistant" element={<div data-testid="assistant-page">Assistant</div>} />
        <Route path="/tools/calculator/sofa" element={<div data-testid="sofa-page">SOFA</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ToolsAreaFallback', () => {
  it('shows calculator not found for unknown subpath under hub', () => {
    renderFallback('/tools/calculators/unknown-calc-xyz');
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(/Calculator not found/i)).toBeTruthy();
    expect(screen.getByText(/unknown-calc-xyz/, { selector: '.tool-not-found-message' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Developer Catalog \/ Source Audit/i })).toHaveAttribute(
      'href',
      '/tools/catalog'
    );
  });

  it('redirects mistyped /tools/calculators/sofa to canonical legacy route', async () => {
    renderFallback('/tools/calculators/sofa');
    expect(await screen.findByTestId('sofa-page')).toBeTruthy();
  });

  it('redirects chat-assisted mistyped subpath to Assistant', async () => {
    renderFallback('/tools/calculators/wells-pe');
    expect(await screen.findByTestId('assistant-page')).toBeTruthy();
  });

  it('shows fleet not found for unknown fleet path', () => {
    renderFallback('/fleet/unknown-page-xyz');
    expect(screen.getByText(/Fleet page not found/i)).toBeTruthy();
  });
});
