import { describe, expect, it } from 'vitest';
import { Priority, type EMSArrival } from '../types/emergency';
import {
  evaluateEmsArrivalActivation,
  evaluatePreArrivalFormActivation,
} from './preArrivalActivationRules';
import { emptyPreArrivalFormInput } from './preArrivalMistModel';

describe('preArrivalActivationRules', () => {
  it('activates trauma team for car accident with unstable signs', () => {
    const input = {
      ...emptyPreArrivalFormInput(),
      framework: 'mist' as const,
      mist: {
        mechanism: 'Car accident',
        injury: 'Multiple trauma',
        signs: 'Tachycardic, low BP',
        treatments: 'IV fluids',
      },
    };
    const alert = evaluatePreArrivalFormActivation(input);
    expect(alert?.type).toBe('trauma-team');
    expect(alert?.title).toBe('Trauma Team Activation');
  });

  it('does not activate when mechanism and signs are benign', () => {
    const input = {
      ...emptyPreArrivalFormInput(),
      framework: 'mist' as const,
      mist: {
        mechanism: 'Walk-in referral',
        injury: 'Ankle sprain',
        signs: 'Stable vitals',
        treatments: 'Ice pack',
      },
    };
    expect(evaluatePreArrivalFormActivation(input)).toBeNull();
  });

  it('evaluates inbound EMS arrivals', () => {
    const arrival: EMSArrival = {
      id: 'ems-1',
      unitId: 'M-12',
      unitName: 'Medic 12',
      crewNames: [],
      patientAge: 42,
      patientSex: 'M',
      chiefComplaint: 'Major trauma',
      eta: 8,
      severity: 'Critical',
      dispatchTime: '2026-06-24T10:00:00.000Z',
      estimatedArrivalTime: '2026-06-24T10:08:00.000Z',
      status: 'Inbound',
      priority: Priority.P1,
      mechanismOfInjury: 'Motor vehicle collision',
      preArrivalNotification: {
        framework: 'mist',
        source: 'ems',
        mist: {
          mechanism: 'Motor vehicle collision',
          injury: 'Chest trauma',
          signs: 'Tachycardic, hypotensive',
          treatments: 'C-collar, fluids',
        },
        sbar: {
          situation: '',
          background: '',
          assessment: '',
          recommendation: '',
        },
      },
    };
    const alert = evaluateEmsArrivalActivation(arrival);
    expect(alert?.severity).toBe('critical');
    expect(alert?.chargeNurseAction).toContain('trauma team');
  });
});