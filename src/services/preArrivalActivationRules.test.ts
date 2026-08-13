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
        injuries: 'Multiple trauma',
        signs: 'Tachycardic, low BP',
        treatments: 'IV fluids',
      },
    };
    const alert = evaluatePreArrivalFormActivation(input);
    expect(alert?.type).toBe('trauma-team');
    expect(alert?.title).toBe('Trauma Team Activation');
  });

  // HEAL-180: chest-pain/stroke pre-arrivals with unstable signs but no trauma mechanism used to
  // be unconditionally labeled "Trauma Team Activation" and page the trauma team lead instead of
  // cardiology/stroke.
  it('routes a hypotensive chest-pain pre-arrival to cardiac-alert, not trauma-team', () => {
    const input = {
      ...emptyPreArrivalFormInput(),
      framework: 'sbar' as const,
      sbar: {
        situation: 'Severe chest pain',
        background: '',
        assessment: 'Tachycardic, hypotensive',
        recommendation: '',
      },
    };
    const alert = evaluatePreArrivalFormActivation(input);
    expect(alert?.type).toBe('cardiac-alert');
    expect(alert?.title).toBe('Cardiac Alert');
    expect(alert?.chargeNurseAction).toContain('cardiology');
  });

  it('routes an altered stroke pre-arrival to stroke-team, not trauma-team', () => {
    const input = {
      ...emptyPreArrivalFormInput(),
      framework: 'sbar' as const,
      sbar: {
        situation: 'Possible stroke',
        background: '',
        assessment: 'Altered, GCS 13',
        recommendation: '',
      },
    };
    const alert = evaluatePreArrivalFormActivation(input);
    expect(alert?.type).toBe('stroke-team');
    expect(alert?.title).toBe('Stroke Team Activation');
    expect(alert?.chargeNurseAction).toContain('stroke team');
  });

  it('still routes to trauma-team when a real trauma mechanism is present, even with a chest-pain complaint', () => {
    const input = {
      ...emptyPreArrivalFormInput(),
      framework: 'mist' as const,
      mist: {
        mechanism: 'Car accident',
        injuries: 'Chest pain',
        signs: 'Tachycardic, low BP',
        treatments: 'IV fluids',
      },
    };
    const alert = evaluatePreArrivalFormActivation(input);
    expect(alert?.type).toBe('trauma-team');
  });

  it('does not activate when mechanism and signs are benign', () => {
    const input = {
      ...emptyPreArrivalFormInput(),
      framework: 'mist' as const,
      mist: {
        mechanism: 'Walk-in referral',
        injuries: 'Ankle sprain',
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
      notes: '',
      status: 'Inbound',
      prearrivalComplaint: 'Major trauma',
      priority: Priority.P1,
      mechanismOfInjury: 'Motor vehicle collision',
      preArrivalNotification: {
        framework: 'mist',
        source: 'ems-crew',
        mist: {
          mechanism: 'Motor vehicle collision',
          injuries: 'Chest trauma',
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