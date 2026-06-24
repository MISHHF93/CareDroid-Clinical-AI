import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { WhiteLabelProvider, useWhiteLabel } from './WhiteLabelContext';

const organizationContext = {
  branding: {
    displayName: 'Demo Care',
    logoUrl: 'https://cdn.example.com/logo.svg',
    faviconUrl: 'https://cdn.example.com/favicon.ico',
    primaryColor: '#0f766e',
    accentColor: '#2563eb',
    theme: 'light',
    loginTitle: 'Demo Care Login',
    dashboardTitle: 'Demo Care Command',
  },
  tenant: { tenantId: 'demo-care' },
  organization: { name: 'Demo Hospital', slug: 'demo-care' },
};

vi.mock('./OrganizationContext', () => ({
  useOrganizationContext: () => organizationContext,
}));

vi.mock('../services/whiteLabelApi', () => ({
  cacheWhiteLabelBranding: vi.fn(),
  fetchWhiteLabelBranding: vi.fn(),
  getCachedWhiteLabelBranding: vi.fn(() => null),
  getRequestedWhiteLabelTenantId: vi.fn(() => ''),
}));

vi.mock('../utils/logger', () => ({
  default: { warn: vi.fn() },
}));

function Probe() {
  const { branding, tenantId, isWhiteLabeled } = useWhiteLabel();
  return (
    <div>
      <span>{branding.displayName}</span>
      <span>{tenantId}</span>
      <span>{isWhiteLabeled ? 'white-labeled' : 'default'}</span>
    </div>
  );
}

describe('WhiteLabelProvider', () => {
  beforeEach(() => {
    document.title = '';
    document.documentElement.removeAttribute('style');
    document.querySelectorAll('link[data-white-label-favicon="true"]').forEach((node) => node.remove());
  });

  it('applies tenant branding to document metadata and CSS variables', async () => {
    render(
      <WhiteLabelProvider>
        <Probe />
      </WhiteLabelProvider>,
    );

    expect(screen.getByText('Demo Care')).toBeInTheDocument();
    expect(screen.getByText('demo-care')).toBeInTheDocument();
    expect(screen.getByText('white-labeled')).toBeInTheDocument();

    await waitFor(() => {
      expect(document.title).toBe('Demo Care');
      expect(document.documentElement.style.getPropertyValue('--tenant-primary-color')).toBe('#0f766e');
      expect(document.documentElement.style.getPropertyValue('--tenant-accent-color')).toBe('#2563eb');
      expect(document.querySelector('link[data-white-label-favicon="true"]')).toHaveAttribute(
        'href',
        'https://cdn.example.com/favicon.ico',
      );
    });
  });
});
