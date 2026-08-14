import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OrganizationSettings } from './OrganizationPages';
import { PlatformAssetsApi } from '../../services/platformAssetsApi';

vi.mock('./OrganizationPages.css', () => ({}));

const refreshPlatformContext = vi.fn();
const refreshIdentity = vi.fn();
// Stable references: the real UserIdentityContext/OrganizationContext memoize
// their exposed values (see UserIdentityContext.tsx's `value` useMemo), so
// `organization`/`branding`/`subscription` keep the same identity across
// renders unless the underlying state actually changes. OrganizationSettings
// has a `useEffect(..., [branding, organization, subscription])` that calls
// setForm -- returning a fresh object literal per call here (instead of a
// hoisted constant) recreated a new dependency identity on every render and
// looped that effect forever, which crashed the vitest worker thread rather
// than failing the test normally.
const organization = { id: 'org-1', name: 'Demo Hospital', slug: 'demo-hospital' };
const branding = {};
const subscription = {};

vi.mock('../../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    organization,
    refreshPlatformContext,
    refreshIdentity,
  }),
}));

vi.mock('../../contexts/OrganizationContext', () => ({
  useOrganizationContext: () => ({
    branding,
    integrations: [],
    subscription,
    tenant: {},
    supportedOrganizationTypes: ['hospital'],
    refreshOrganizationEngine: vi.fn(),
    saveOrganizationSettings: vi.fn(),
  }),
}));

vi.mock('../../services/platformAssetsApi', () => ({
  PlatformAssetsApi: {
    listPacks: vi.fn().mockResolvedValue([]),
    getContext: vi.fn().mockResolvedValue({ roleProfile: null }),
    listRoleProfiles: vi.fn().mockResolvedValue([
      { id: 'emergency-physician', label: 'Emergency Physician' },
      { id: 'administrator', label: 'Administrator' },
    ]),
    setRoleProfile: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

describe('OrganizationSettings role profile switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes the operational identity (not just platformContext) after switching role profile', async () => {
    // Regression guard (HEAL-198): saveRoleProfile used to call only
    // refreshPlatformContext(), which re-fetches PlatformAssetsApi.getContext()
    // (the 8-row role_profiles catalog) but NOT UserIdentityApi.fetchOperationalProfile()
    // -- the call that carries saasProfile.role/effectiveProfile/accessSummary,
    // the data that actually drives nav visibility and route access. Without
    // refreshIdentity(), a user who switched their role profile here stayed on
    // their old nav/permissions until a full page reload restored the real state.
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <OrganizationSettings />
      </MemoryRouter>,
    );

    const select = await screen.findByDisplayValue('Select role profile');
    await user.selectOptions(select, 'administrator');
    await user.click(screen.getByRole('button', { name: /save role profile/i }));

    await waitFor(() => {
      expect(PlatformAssetsApi.setRoleProfile).toHaveBeenCalledWith('administrator');
    });
    expect(refreshIdentity).toHaveBeenCalled();
    expect(screen.getByText('Role profile updated.')).toBeInTheDocument();
  });
});
