import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import ClinicalCalculatorHub, { CALCULATORS } from './ClinicalCalculatorHub';
import { useEmergencyStore } from '../store/emergencyStore';
import { PatientState, Priority, type Patient } from '../types/emergency';

const navigateMock = vi.fn();
const conversationMock = {
  addMessage: vi.fn(),
  selectTool: vi.fn(),
  setActiveTool: vi.fn(),
};
const originalState = useEmergencyStore.getState();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../contexts/ConversationContext', () => ({
  useConversation: () => conversationMock,
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

const patient: Patient = {
  id: 'hub-patient-1',
  mrn: 'ED-HUB-1',
  firstName: 'Avery',
  lastName: 'Stone',
  dob: '1970-01-01',
  age: 56,
  sex: 'F',
  arrivalTime: '2026-06-13T12:00:00.000Z',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Cardiac',
  state: PatientState.Assessment,
  priority: Priority.P2,
  vitals: [
    {
      hr: 92,
      sbp: 132,
      dbp: 78,
      spo2: 98,
      temp: 36.8,
      rr: 18,
      gcs: 15,
      recordedAt: '2026-06-13T12:05:00.000Z',
    },
  ],
  flags: [],
  assignedStaffId: 's1',
  notes: [],
  timeline: [],
};

afterEach(() => {
  vi.clearAllMocks();
  useEmergencyStore.setState(originalState, true);
});

function renderHub(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ClinicalCalculatorHub />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe('ClinicalCalculatorHub R10 consolidation', () => {
  it('exports calculator registry entries with the required fields', () => {
    expect(CALCULATORS.length).toBeGreaterThan(20);
    expect(CALCULATORS.find((calculator) => calculator.id === 'heart-score')).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        description: expect.any(String),
        category: 'Cardiac',
        component: expect.any(Function),
        keywords: expect.any(Array),
      }),
    );
    expect(CALCULATORS.find((calculator) => calculator.id === 'qsofa')).toEqual(
      expect.objectContaining({
        category: 'Sepsis',
        component: expect.any(Function),
        timeCritical: true,
      }),
    );
    expect(CALCULATORS.find((calculator) => calculator.id === 'nihss')).toEqual(
      expect.objectContaining({
        category: 'Neuro',
        component: expect.any(Function),
        timeCritical: true,
        keywords: expect.arrayContaining([
          'stroke',
          'nihss',
          'neuro',
          'weakness',
          'aphasia',
          'tpa',
        ]),
      }),
    );
    expect(
      CALCULATORS.find((calculator) => calculator.id === 'columbia-suicide-severity-workflow'),
    ).toEqual(
      expect.objectContaining({
        category: 'Psych',
        component: expect.any(Function),
        timeCritical: true,
        keywords: expect.arrayContaining([
          'suicide',
          'cssrs',
          'c-ssrs',
          'columbia',
          'psych',
          'self-harm',
        ]),
      }),
    );
    expect(CALCULATORS.find((calculator) => calculator.id === 'ciwa-ar')).toEqual(
      expect.objectContaining({
        category: 'Psych',
        component: expect.any(Function),
        keywords: expect.arrayContaining([
          'alcohol',
          'withdrawal',
          'ciwa',
          'detox',
          'etoh',
          'delirium',
        ]),
      }),
    );
    expect(CALCULATORS.find((calculator) => calculator.id === 'news2')).toEqual(
      expect.objectContaining({
        category: 'General',
        component: expect.any(Function),
        timeCritical: true,
        keywords: expect.arrayContaining(['news', 'early warning', 'deterioration', 'obs']),
      }),
    );
    expect(CALCULATORS.map((calculator) => calculator.id)).not.toEqual(
      expect.arrayContaining([
        'bed-occupancy-calculator',
        'staffing-ratio-calculator',
        'turnaround-time-calculator',
        'resource-utilization-index',
      ]),
    );
  });

  it('auto-opens a calculator from the open query parameter', () => {
    renderHub('/emergency/tools?open=qsofa');

    expect(screen.getByRole('dialog', { name: /qsofa/i })).toBeTruthy();
  });

  it('auto-opens a calculator from calculator-filtered search params', () => {
    renderHub('/emergency/tools?source=calculators&filter=calculator&q=heart');

    expect(screen.getByRole('dialog', { name: /heart score/i })).toBeTruthy();
  });

  it.each([
    ['/emergency/tools?source=calculators&filter=calculator&q=stroke', /nihss/i],
    ['/emergency/tools?source=calculators&filter=calculator&q=stroke%20scale', /nihss/i],
    [
      '/emergency/tools?source=calculators&filter=calculator&calc=ciwa',
      /ciwa-ar alcohol withdrawal/i,
    ],
    [
      '/emergency/tools?source=calculators&filter=calculator&tool=cssrs',
      /columbia suicide severity/i,
    ],
    [
      '/emergency/tools?source=calculators&filter=calculator&open=c-ssrs',
      /columbia suicide severity/i,
    ],
  ])('resolves calculator URL aliases for %s', (route, expectedDialogName) => {
    renderHub(route);

    expect(screen.getByRole('dialog', { name: expectedDialogName })).toBeTruthy();
  });

  it('removes alias search params when closing a URL-opened calculator', async () => {
    const user = userEvent.setup();
    renderHub(
      '/emergency/tools?source=calculators&filter=calculator&q=heart&open=heart-score&patientId=hub-patient-1',
    );

    expect(screen.getByRole('dialog', { name: /heart score/i })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /close heart score/i }));

    expect(screen.queryByRole('dialog', { name: /heart score/i })).toBeNull();
    expect(screen.getByTestId('location-search')).toHaveTextContent('source=calculators');
    expect(screen.getByTestId('location-search')).toHaveTextContent('filter=calculator');
    expect(screen.getByTestId('location-search')).toHaveTextContent('patientId=hub-patient-1');
    expect(screen.getByTestId('location-search')).not.toHaveTextContent('q=');
    expect(screen.getByTestId('location-search')).not.toHaveTextContent('open=');
  });

  it('does not promote a conflicting known q calculator after closing an explicit open calculator', async () => {
    const user = userEvent.setup();
    renderHub(
      '/emergency/tools?source=calculators&filter=calculator&q=qsofa&open=heart-score&patientId=hub-patient-1',
    );

    expect(screen.getByRole('dialog', { name: /heart score/i })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /close heart score/i }));

    expect(screen.queryByRole('dialog', { name: /heart score/i })).toBeNull();
    expect(screen.queryByRole('dialog', { name: /qsofa/i })).toBeNull();
    expect(screen.getByTestId('location-search')).toHaveTextContent('source=calculators');
    expect(screen.getByTestId('location-search')).toHaveTextContent('filter=calculator');
    expect(screen.getByTestId('location-search')).not.toHaveTextContent('q=');
    expect(screen.getByTestId('location-search')).not.toHaveTextContent('open=');
  });

  it('launches chat-assisted calculator rows directly into Copilot', async () => {
    const user = userEvent.setup();
    renderHub('/emergency/tools?source=calculators&filter=calculator');

    await user.click(screen.getByRole('button', { name: /ask assistant about wells dvt/i }));

    expect(conversationMock.selectTool).toHaveBeenCalledWith('wells-dvt-calculator');
    expect(conversationMock.setActiveTool).toHaveBeenCalledWith('wells-dvt-calculator');
    expect(conversationMock.addMessage).toHaveBeenCalledWith(
      expect.stringMatching(/wells/i),
      'user',
    );
    expect(navigateMock).toHaveBeenCalledWith('/emergency/copilot');
  });

  it('saves score and detail notes, then closes the opened calculator', async () => {
    const user = userEvent.setup();
    useEmergencyStore.setState({ ...originalState, patients: [patient] }, true);

    renderHub('/emergency/tools?open=heart-score&patientId=hub-patient-1');

    await user.click(screen.getByRole('button', { name: /save to patient/i }));

    const savedPatient = useEmergencyStore
      .getState()
      .patients.find((candidate) => candidate.id === patient.id);
    expect(savedPatient?.notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: 'HEART Score: 1/10 — Low risk',
          authorStaffId: 's1',
          metadata: expect.objectContaining({
            scoreId: 'heart-score',
          }),
        }),
      ]),
    );
    expect(screen.queryByRole('dialog', { name: /heart score/i })).toBeNull();
  });
});
