import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_AI_COPILOT,
  EMERGENCY_CHIEF_COMPLAINT_ROUTES,
  buildEmergencyCopilotGuidance,
  routeEmergencyChiefComplaint,
} from './emergencyOperatingSystem';

describe('emergencyOperatingSystem complaint router', () => {
  it('defines the required complaint-driven workflow routes', () => {
    expect(EMERGENCY_CHIEF_COMPLAINT_ROUTES.map((route) => route.complaint)).toEqual([
      'Chest Pain',
      'Stroke Symptoms',
      'Sepsis Concern',
      'Shortness of Breath',
    ]);
  });

  it('routes required chief complaints to workflow guidance without diagnosis', () => {
    expect(routeEmergencyChiefComplaint('chest pressure')).toEqual(
      expect.objectContaining({
        complaint: 'Chest Pain',
        calculators: [expect.objectContaining({ label: 'HEART' })],
        workflows: ['ACS Workflow'],
        referrals: ['Cardiology Referral'],
        routingMode: 'workflow-guidance',
        safetyStatement: expect.stringMatching(/does not diagnose ACS/i),
      })
    );
    expect(routeEmergencyChiefComplaint('facial droop and slurred speech')).toEqual(
      expect.objectContaining({
        complaint: 'Stroke Symptoms',
        calculators: [expect.objectContaining({ label: 'NIHSS' })],
        workflows: ['Stroke Workflow'],
        safetyStatement: expect.stringMatching(/does not diagnose stroke/i),
      })
    );
    expect(routeEmergencyChiefComplaint('possible sepsis')).toEqual(
      expect.objectContaining({
        complaint: 'Sepsis Concern',
        calculators: [
          expect.objectContaining({ label: 'qSOFA' }),
          expect.objectContaining({ label: 'NEWS2' }),
        ],
        workflows: ['Sepsis Workflow'],
        safetyStatement: expect.stringMatching(/does not diagnose sepsis/i),
      })
    );
    expect(routeEmergencyChiefComplaint('dyspnea')).toEqual(
      expect.objectContaining({
        complaint: 'Shortness of Breath',
        calculators: [expect.objectContaining({ label: 'Wells PE' })],
        protocols: ['Respiratory Protocol'],
        safetyStatement: expect.stringMatching(/does not diagnose PE/i),
      })
    );
  });

  it('returns null for unsupported complaint text', () => {
    expect(routeEmergencyChiefComplaint('medication refill')).toBeNull();
  });

  it('builds explainable ED Copilot workflow guidance without autonomous decisions', () => {
    expect(EMERGENCY_AI_COPILOT.inputSchema).toEqual([
      'complaint',
      'vitals',
      'workspaceContext',
      'selectedCalculators',
    ]);
    expect(EMERGENCY_AI_COPILOT.outputSchema).toEqual(
      expect.arrayContaining([
        'recommendedTools',
        'protocols',
        'nextWorkflowStep',
        'simulations',
        'escalationSuggestions',
        'reasoning',
      ])
    );

    const guidance = buildEmergencyCopilotGuidance({
      complaint: 'chest pressure',
      vitals: 'HR 118, RR 22, SpO2 94%',
      workspaceContext: 'Emergency Command Center',
      selectedCalculators: ['HEART'],
    });

    expect(guidance).toEqual(
      expect.objectContaining({
        copilotId: 'emergency-ai-copilot',
        matchedRouteId: 'chief-complaint-chest-pain',
        protocols: ['ACS/chest pain pathway'],
        nextWorkflowStep: expect.stringMatching(/ACS Workflow/i),
        safetyBoundary: expect.stringMatching(/No autonomous diagnosis/i),
      })
    );
    expect(guidance.recommendedTools.map((tool) => tool.label)).toContain('HEART');
    expect(guidance.escalationSuggestions.join(' ')).toMatch(/verify whether any local escalation threshold/i);
    expect(guidance.reasoning.every((reason) => reason.explanation)).toBe(true);
  });
});
