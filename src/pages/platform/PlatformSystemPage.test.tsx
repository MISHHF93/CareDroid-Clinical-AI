import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PlatformSystemPage from './PlatformSystemPage';

vi.mock('./PlatformSystemPage.css', () => ({}));

const platformSystemsApiMock = vi.hoisted(() => ({
  fetchPlatformSystemHub: vi.fn(),
  fetchPlatformSystemCapability: vi.fn(),
  postPlatformSystemContract: vi.fn(),
}));

vi.mock('../../services/platformSystemsApi', () => ({
  fetchPlatformSystemHub: platformSystemsApiMock.fetchPlatformSystemHub,
  fetchPlatformSystemCapability: platformSystemsApiMock.fetchPlatformSystemCapability,
  postPlatformSystemContract: platformSystemsApiMock.postPlatformSystemContract,
}));

function renderRoute(path) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<PlatformSystemPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PlatformSystemPage header actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platformSystemsApiMock.fetchPlatformSystemHub.mockResolvedValue({ ok: true, data: {} });
  });

  it('renders exactly one control that navigates to the tool library, not a duplicate pair (HEAL-140)', async () => {
    renderRoute('/governance');

    await screen.findByTestId('cd-page-title-text');

    const toolLibraryControls = [
      ...screen.queryAllByRole('link', { name: /tool library/i }),
      ...screen.queryAllByRole('button', { name: /open tools|tool library/i }),
    ];
    expect(toolLibraryControls).toHaveLength(1);
    expect(toolLibraryControls[0]).toHaveAttribute('href', '/tools');
  });
});
