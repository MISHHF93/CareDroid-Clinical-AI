import { describe, expect, it } from 'vitest';
import ClinicalIntentRouter, {
  CLINICAL_INTENT_ROUTES,
  COMPLAINT_FIRST_NAVIGATION_STEPS,
  routeClinicalIntent,
} from './clinicalIntentRouter';

describe('ClinicalIntentRouter', () => {
  it('defines supported complaint routes for Emergency workflow paths', () => {
    expect(CLINICAL_INTENT_ROUTES.map((route) => route.complaint)).toEqual([
      'Chest Pain',
      'Stroke Symptoms',
      'Sepsis Concern',
      'Trauma',
      'Shortness of Breath',
      'Abdominal Pain',
      'Psychiatric Crisis',
    ]);
    expect(CLINICAL_INTENT_ROUTES.every((route) => route.navigationSteps === COMPLAINT_FIRST_NAVIGATION_STEPS)).toBe(true);
  });

  it('routes complaints to workflows and surfaced calculators without manual search', () => {
    expect(routeClinicalIntent('chest pressure')).toEqual(
      expect.objectContaining({
        complaint: 'Chest Pain',
        navigationMode: 'complaint-first',
        calculators: [expect.objectContaining({ label: 'HEART' })],
        workflows: ['ACS Workflow'],
      })
    );
    expect(routeClinicalIntent('facial droop')).toEqual(
      expect.objectContaining({
        complaint: 'Stroke Symptoms',
        calculators: [expect.objectContaining({ label: 'NIHSS' })],
        workflows: ['Stroke Workflow'],
      })
    );
    expect(routeClinicalIntent('possible sepsis')).toEqual(
      expect.objectContaining({
        complaint: 'Sepsis Concern',
        calculators: [
          expect.objectContaining({ label: 'qSOFA' }),
          expect.objectContaining({ label: 'NEWS2' }),
        ],
        workflows: ['Sepsis Workflow'],
      })
    );
    expect(routeClinicalIntent('trauma activation')).toEqual(
      expect.objectContaining({
        complaint: 'Trauma',
        workflows: ['Trauma Pathway'],
        protocols: expect.arrayContaining(['Trauma Pathway']),
      })
    );
    expect(routeClinicalIntent('abdominal pain with vomiting')).toEqual(
      expect.objectContaining({
        complaint: 'Abdominal Pain',
        workflows: ['Abdominal Pain Workflow'],
        calculators: expect.arrayContaining([
          expect.objectContaining({ label: 'Ranson Criteria' }),
          expect.objectContaining({ label: 'BISAP' }),
        ]),
      })
    );
    expect(routeClinicalIntent('suicidal ideation')).toEqual(
      expect.objectContaining({
        complaint: 'Psychiatric Crisis',
        workflows: ['Psychiatric Crisis Workflow'],
        calculators: expect.arrayContaining([
          expect.objectContaining({ label: 'C-SSRS' }),
          expect.objectContaining({ label: 'PHQ-9' }),
        ]),
      })
    );
  });

  it('returns every required output category', () => {
    const route = ClinicalIntentRouter.routeComplaint('chest pain');

    expect(route.outputs).toEqual(
      expect.objectContaining({
        complaint: 'Chest Pain',
        workflow: 'ACS Workflow',
        calculators: expect.any(Array),
        protocols: expect.any(Array),
        workflows: expect.any(Array),
        referrals: expect.any(Array),
        aiCopilot: 'ED AI Copilot',
        simulations: expect.any(Array),
      })
    );
    expect(route.navigationFlow.map((step) => step.step)).toEqual(COMPLAINT_FIRST_NAVIGATION_STEPS);
    expect(route.simulations).toEqual(expect.arrayContaining(['ACS chest pain simulation']));
    expect(route.referrals).toEqual(expect.arrayContaining(['Cardiology Referral']));
  });

  it('returns null for unsupported complaint text', () => {
    expect(routeClinicalIntent('medication refill')).toBeNull();
  });
});
