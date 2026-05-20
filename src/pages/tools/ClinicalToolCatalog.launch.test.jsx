import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ClinicalToolCatalog from './ClinicalToolCatalog';
import { getMedicalToolsCatalogRows } from '../../data/medicalToolsCatalogIndex';
import { getAllDiscoveredTools } from '../../data/sourceCodeToolDiscovery';
import { matchesMedicalCatalogCategoryFilter } from '../../utils/catalogSearch';

const navigate = vi.fn();
const setActiveTool = vi.fn();
const addMessage = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('../../contexts/ConversationContext', () => ({
  useConversation: () => ({ setActiveTool, addMessage }),
}));

vi.mock('../../services/clinicalToolsApi', () => ({
  fetchBackendClinicalTools: vi.fn().mockResolvedValue({ ok: true, tools: [] }),
}));

function renderCatalog() {
  return render(
    <MemoryRouter>
      <ClinicalToolCatalog />
    </MemoryRouter>
  );
}

function clickQuickFilter(container, label) {
  const button = [...container.querySelectorAll('.catalog-category-chip')].find(
    (chip) => chip.textContent.trim() === label
  );
  expect(button, label).toBeTruthy();
  fireEvent.click(button);
}

describe('ClinicalToolCatalog launch and search', () => {
  beforeEach(() => {
    navigate.mockClear();
    setActiveTool.mockClear();
    addMessage.mockClear();
  });

  it('finds wells-pe via alias search in the medical table', async () => {
    renderCatalog();
    const input = screen.getByRole('searchbox', { name: /search clinical catalog/i });
    fireEvent.change(input, { target: { value: 'pe-score' } });
    const matches = await screen.findAllByText('Wells PE Score');
    expect(matches.length).toBeGreaterThan(0);
  });

  it('shows global empty state when search has no matches', async () => {
    renderCatalog();
    const input = screen.getByRole('searchbox', { name: /search clinical catalog/i });
    fireEvent.change(input, { target: { value: 'zzz-no-such-tool-xyz' } });
    expect(await screen.findByRole('status')).toHaveTextContent(/No tools match/i);
  });

  it('clears search from global empty state', async () => {
    renderCatalog();
    const input = screen.getByRole('searchbox', { name: /search clinical catalog/i });
    fireEvent.change(input, { target: { value: 'zzz-no-such-tool-xyz' } });
    fireEvent.click(await screen.findByRole('button', { name: /clear search/i }));
    expect(input.value).toBe('');
  });

  it('renders every medical catalog row in the Developer Catalog by default', async () => {
    const { container } = renderCatalog();
    await screen.findByRole('heading', { name: /medical tools & calculators/i });
    const text = container.textContent;

    for (const row of getMedicalToolsCatalogRows()) {
      expect(text, row.primaryId).toContain(row.name);
    }
  }, 10000);

  it.each([
    ['calculator', 'Calculators'],
    ['chat-assisted', 'Chat-assisted'],
    ['checker', 'Checkers'],
    ['interpreter', 'Interpreters'],
    ['reference', 'Reference'],
  ])('quick filter %s keeps matching medical rows visible', (filterValue, filterLabel) => {
    const { container } = renderCatalog();
    const expected = getMedicalToolsCatalogRows().find((row) =>
      matchesMedicalCatalogCategoryFilter(row, filterValue)
    );
    expect(expected, filterValue).toBeTruthy();

    clickQuickFilter(container, filterLabel);

    expect(container.textContent).toContain(expected.name);
  });

  it('shows source-scan phantom records only on the audit surface', () => {
    const phantom = getAllDiscoveredTools().find((row) => row.status === 'phantom');
    expect(phantom).toBeTruthy();
    const { container } = renderCatalog();

    clickQuickFilter(container, 'Phantom');

    expect(container.textContent).toContain(phantom.name);
  });
});
