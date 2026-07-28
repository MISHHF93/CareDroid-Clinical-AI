import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import * as visibilityModule from '../../config/practitionerSurfaceVisibility';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { EmergencyRoutePage } from './emergencyRouteShared';

/**
 * Regression coverage for a real bug found by rendering the app and looking
 * at it (roadmap item #22): ClinicalAlertsPage and HospitalCommandCenter
 * both pass their real page content to EmergencyRoutePage via an
 * `activeWork` prop — but EmergencyRoutePage never declared that prop, only
 * `children`. Since its props are typed `any`, nothing caught the mismatch:
 * the content was silently dropped, and OperationalZone's
 * `if (children == null) return null` meant the whole zone <section> never
 * even rendered — not just empty, absent — so neither page's actual content
 * (alert list, EMS command panels, etc.) ever appeared, while the
 * surrounding situationBrief summary cards (fed by a different, correctly
 * wired prop) rendered fine, making the pages look mostly OK from a glance.
 */
vi.mock('../../contexts/PractitionerVisibilityContext', () => ({
  usePractitionerSurfaceVisibility: vi.fn(),
}));
vi.mock('../../hooks/useEdOperatingSurface', () => ({
  default: () => ({ situationBrief: undefined, phaseId: null, ownerRole: null, priority: null }),
}));
vi.mock('../../hooks/usePatientWorkflow', () => ({
  default: () => ({ hasPatient: false, step: null, ownerRole: null, primaryAction: null, patient: null }),
}));
vi.mock('../../store/emergencyStore', () => ({
  useEmergencyStore: (selector: any) => selector({ selectedPatientId: null }),
}));
vi.mock('../../contexts/RouteChromeContext', () => ({
  useRouteChromeRegistration: () => {},
}));

const FULL_SURFACES = visibilityModule.getPractitionerSurfaceVisibility();

describe('EmergencyRoutePage — activeWork prop', () => {
  beforeEach(() => {
    vi.mocked(usePractitionerSurfaceVisibility).mockReturnValue(FULL_SURFACES);
  });

  it('renders content passed via the activeWork prop (the real ClinicalAlertsPage/HospitalCommandCenter call shape)', () => {
    const { container, getByText } = render(
      <EmergencyRoutePage
        title="Clinical Alerts"
        situationBrief={{ status: '13 active alerts' }}
        activeWork={<div className="alerts-summary-strip">Real alert list content</div>}
      />,
    );

    expect(container.querySelector('[data-cdl-zone="activeWork"]')).toBeTruthy();
    expect(container.querySelector('.alerts-summary-strip')).toBeTruthy();
    expect(getByText('Real alert list content')).toBeInTheDocument();
  });

  it('still renders content passed via children (every other real page\'s call shape)', () => {
    const { container, getByText } = render(
      <EmergencyRoutePage title="Dispatch Console" situationBrief={{ status: '2 active calls' }}>
        <div className="dispatch-console__body">Real dispatch content</div>
      </EmergencyRoutePage>,
    );

    expect(container.querySelector('[data-cdl-zone="activeWork"]')).toBeTruthy();
    expect(getByText('Real dispatch content')).toBeInTheDocument();
  });

  it('renders nothing in the activeWork zone when neither prop is given (no false positive)', () => {
    const { container } = render(
      <EmergencyRoutePage title="Empty Page" situationBrief={{ status: 'nothing' }} />,
    );

    expect(container.querySelector('[data-cdl-zone="activeWork"]')).toBeFalsy();
  });
});
