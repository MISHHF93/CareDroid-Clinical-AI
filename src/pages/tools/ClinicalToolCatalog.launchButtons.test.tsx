/**
 * Catalog launch actions — primary/secondary launch buttons render for tool rows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClinicalToolCatalog from './ClinicalToolCatalog';
import { PractitionerVisibilityProvider } from '../../contexts/PractitionerVisibilityContext';
import { getMedicalToolsCatalogRows } from '../../data/medicalToolsCatalogIndex';

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => ({
    setActiveTool: vi.fn(),
    addMessage: vi.fn(),
  }),
}));

vi.mock('../../services/clinicalToolsApi', () => ({
  fetchBackendClinicalTools: vi.fn().mockResolvedValue({ ok: true, tools: [] }),
}));

vi.mock('../../config/practitionerCleanup.config', async () => {
  const actual = await vi.importActual('../../config/practitionerCleanup.config');
  return {
    ...actual,
    isPractitionerCleanupEnabled: () => false,
  };
});

vi.mock('../../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => ({ role: 'physician' }),
}));

vi.mock('../../hooks/useRouteScreenMode', () => ({
  default: () => 'clinical_workstation',
}));

function renderCatalog() {
  return render(
    <MemoryRouter>
      <PractitionerVisibilityProvider>
        <ClinicalToolCatalog />
      </PractitionerVisibilityProvider>
    </MemoryRouter>
  );
}

describe('ClinicalToolCatalog — launch buttons', () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it('renders catalog search and category quick filters', async () => {
    const { container } = renderCatalog();
    // The page's own <h1> became a <p data-testid="cd-page-title-text">
    // (HEAL: ~58 pages still rendered a raw <h1>, duplicating AppShell's own
    // route-title <h1>) -- the real heading now lives in AppShell chrome via
    // useRouteChromeRegistration, which this isolated render doesn't mount.
    expect(screen.getByTestId('cd-page-title-text')).toHaveTextContent(
      /developer catalog \/ source audit/i
    );
    expect(container.textContent).toMatch(/user-facing tools now live at \/tools/i);
    expect(screen.getByRole('searchbox', { name: /search developer catalog/i })).toBeInTheDocument();
    expect(await screen.findByRole('group', { name: /quick category filters/i })).toBeInTheDocument();
  }, 20000);

  it('shows launch or open actions for launchable medical catalog rows', async () => {
    renderCatalog();
    const launchable = getMedicalToolsCatalogRows().filter((row) => row.launchable !== false);
    expect(launchable.length).toBeGreaterThan(0);

    const medicalHeading = await screen.findByRole('heading', {
      level: 2,
      name: /medical tools & calculators/i,
    });
    const medicalSection = medicalHeading.closest('.catalog-section--medical');
    expect(medicalSection).toBeTruthy();
    if (!medicalSection) throw new Error('expected medical section to be found');

    const scoped = within(medicalSection as HTMLElement);
    expect(scoped.getAllByRole('button', { name: /^open$/i }).length).toBeGreaterThan(0);
    expect(
      scoped.getAllByRole('button', { name: /^(launch|start guided chat)$/i }).length
    ).toBeGreaterThan(0);
  }, 20000);

  it('includes Wells PE launch control discoverable by tool name', async () => {
    renderCatalog();
    const input = screen.getByRole('searchbox', { name: /search developer catalog/i });
    fireEvent.change(input, { target: { value: 'pe-score' } });
    expect((await screen.findAllByText('Wells PE Score')).length).toBeGreaterThan(0);
    const medicalHeading = screen.getByRole('heading', {
      level: 2,
      name: /medical tools & calculators/i,
    });
    const medicalSection = medicalHeading.closest('.catalog-section--medical');
    if (!medicalSection) throw new Error('expected medical section to be found');
    expect(
      within(medicalSection as HTMLElement).getAllByRole('button', { name: /start guided chat/i }).length
    ).toBeGreaterThan(0);
  }, 20000);
});
