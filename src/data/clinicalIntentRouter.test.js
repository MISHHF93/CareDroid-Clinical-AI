import { describe, expect, it } from 'vitest';
import ClinicalIntentRouter, {
  CLINICAL_INTENT_ROUTES,
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
    ]);
  });

  it('routes complaints to calculators and workflows without manual search', () => {
    expect(routeClinicalIntent('chest pressure')).toEqual(
      expect.objectContaining({
        complaint: 'Chest Pain',
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
  });

  it('returns every required output category', () => {
    const route = ClinicalIntentRouter.routeComplaint('chest pain');

    expect(route.outputs).toEqual(
      expect.objectContaining({
        calculators: expect.any(Array),
        protocols: expect.any(Array),
        workflows: expect.any(Array),
        simulations: expect.any(Array),
        referrals: expect.any(Array),
      })
    );
    expect(route.simulations).toEqual(expect.arrayContaining(['ACS chest pain simulation']));
    expect(route.referrals).toEqual(expect.arrayContaining(['Cardiology Referral']));
  });

  it('returns null for unsupported complaint text', () => {
    expect(routeClinicalIntent('medication refill')).toBeNull();
  });
});
