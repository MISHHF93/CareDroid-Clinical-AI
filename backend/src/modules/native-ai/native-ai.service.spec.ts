import { NativeAiService } from './native-ai.service';
import { PatientState, Priority, type Patient } from '../../../../src/types/emergency';

const patient: Patient = {
  id: 'p1',
  mrn: 'ED-1',
  firstName: 'Sam',
  lastName: 'Lee',
  dob: '1980-01-01',
  age: 45,
  sex: 'M',
  arrivalTime: '2026-06-24T08:00:00.000Z',
  chiefComplaint: 'Chest pain',
  complaintCategory: 'Cardiac',
  state: PatientState.Triage,
  priority: Priority.P3,
  vitals: [],
  flags: [],
  notes: [],
  timeline: [],
} as unknown as Patient;

/**
 * 2026-08-09: routePatient/evaluateTriage/inferSpecialists used to hardcode
 * sourceState: 'live' at every call into the shared lib/native-ai heuristic
 * functions (pure keyword/vitals-threshold formulas, zero ML/LLM), overriding
 * those functions' own honest 'demo' self-classification for every consumer
 * of this controller. Regression guard for the fix: these endpoints must let
 * the honest default through.
 */
describe('NativeAiService sourceState honesty (2026-08-09)', () => {
  const service = new NativeAiService();

  it('routePatient reports demo, not live, for its pure-heuristic routing decision', () => {
    const result = service.routePatient(patient);
    expect((result.data as { sourceState: string }).sourceState).toBe('demo');
  });

  it('evaluateTriage reports demo, not live, for its pure-heuristic triage inference', () => {
    const result = service.evaluateTriage(patient);
    expect((result.data as { sourceState: string }).sourceState).toBe('demo');
  });

  it('inferSpecialists reports demo, not live, for both the routing decision and every specialist inference', () => {
    const result = service.inferSpecialists(patient);
    const data = result.data as {
      routing: { sourceState: string };
      specialistInferences: Array<{ sourceState: string }>;
    };
    expect(data.routing.sourceState).toBe('demo');
    expect(data.specialistInferences.length).toBeGreaterThan(0);
    expect(data.specialistInferences.every((entry) => entry.sourceState === 'demo')).toBe(true);
  });
});
