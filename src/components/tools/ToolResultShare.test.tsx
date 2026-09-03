import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ToolResultShare from './ToolResultShare';

const exportServiceMock = vi.hoisted(() => ({
  exportToPDF: vi.fn(),
  downloadFile: vi.fn(),
  convertToCSV: vi.fn(() => 'csv,data'),
}));

vi.mock('../../services/export/ExportService', () => ({
  getExportService: () => exportServiceMock,
}));

vi.mock('../../config/backendApiCapabilities', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../config/backendApiCapabilities')>();
  return {
    ...actual,
    isBackendCapabilityEnabled: vi.fn(() => true),
  };
});

function openExportTab() {
  render(
    <ToolResultShare
      toolName="SOFA Calculator"
      toolId="sofa"
      results={{ score: 4 }}
      onClose={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /export/i }));
}

describe('ToolResultShare export feedback (HEAL-145)', () => {
  it('reports the real downloaded format, not the requested one, when PDF export silently falls back to JSON', async () => {
    exportServiceMock.exportToPDF.mockResolvedValue({
      filename: 'sofa-results-123.json',
      mimeType: 'application/json',
      size: 42,
    });

    openExportTab();
    fireEvent.click(screen.getByRole('button', { name: /export as pdf/i }));

    await waitFor(() => {
      expect(screen.getByText(/downloaded as json instead/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/exported as pdf/i)).not.toBeInTheDocument();
  });

  it('reports PDF success truthfully when the real PDF export path is used', async () => {
    exportServiceMock.exportToPDF.mockResolvedValue({
      filename: 'sofa-results-123.pdf',
      mimeType: 'application/pdf',
      size: 1024,
    });

    openExportTab();
    fireEvent.click(screen.getByRole('button', { name: /export as pdf/i }));

    await waitFor(() => {
      expect(screen.getByText(/exported as pdf\./i)).toBeInTheDocument();
    });
  });
});
