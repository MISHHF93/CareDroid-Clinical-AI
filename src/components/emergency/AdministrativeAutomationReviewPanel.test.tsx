import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdministrativeAutomationReviewPanel from './AdministrativeAutomationReviewPanel';
import type { AdministrativeAutomationTask } from '../../types/administrativeAutomation';

const reviewMock = vi.fn();

const aiTask: AdministrativeAutomationTask = {
  id: 'auto-route-p-1',
  category: 'patient_routing',
  status: 'pending_review',
  patientId: 'p-1',
  patientName: 'Jamie Lee',
  title: 'Route Jamie Lee to triage',
  summary: 'Registration complete. AI triage advisory: P2.',
  proposedAction: 'Send patient to triage nurse queue.',
  proposedPayload: {
    patientId: 'p-1',
    aiDecision: {
      nodeId: 'CareDroidUnifiedAINode',
      generatedAt: '2026-07-01T12:00:00.000Z',
      triage: {
        data: { recommendedTriageLevel: 'P2' },
        redFlags: ['Hypoxia risk'],
      },
      intake: {
        data: { missingFields: ['insuranceId', 'emergencyContact'] },
      },
      critical: {
        data: { severity: 'high' },
        redFlags: ['Chest pain with diaphoresis'],
      },
      redFlags: ['Hypoxia risk', 'Chest pain with diaphoresis'],
      requiresClinicianReview: true,
    },
  },
  ownerRole: 'Charge Nurse',
  priority: 'high',
  automationId: 'emergency-queue-routing-assistant',
  aiGenerated: true,
  humanReviewRequired: true,
  createdAt: '2026-07-01T12:00:00.000Z',
  updatedAt: '2026-07-01T12:00:00.000Z',
};

vi.mock('../../hooks/useAdministrativeAutomations', () => ({
  default: () => ({
    snapshot: {
      engineId: 'unified-clinical-workflow-orchestrator',
      generatedAt: aiTask.updatedAt,
      tasks: [aiTask],
      metrics: {
        pendingReview: 1,
        executedToday: 0,
        overridden: 0,
        byCategory: {
          patient_routing: 1,
          documentation_handoff: 0,
          ai_patient_summary: 0,
          triage_preparation: 0,
          department_notification: 0,
          staff_assignment: 0,
          queue_prioritization: 0,
          escalation_workflow: 0,
        },
      },
      safetyStatement: 'Human review required.',
    },
    pendingTasks: [aiTask],
    review: reviewMock,
  }),
}));

describe('AdministrativeAutomationReviewPanel', () => {
  it('renders AI decision fields from proposedPayload.aiDecision', () => {
    render(<AdministrativeAutomationReviewPanel />);

    expect(screen.getByRole('region', { name: 'AI decision support' })).toBeInTheDocument();
    expect(screen.getByText('Recommended triage')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
    expect(screen.getByText('Critical severity')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('Registration gaps')).toBeInTheDocument();
    expect(screen.getByText('insuranceId, emergencyContact')).toBeInTheDocument();
    expect(screen.getByText(/Hypoxia risk/)).toBeInTheDocument();
    expect(screen.getByText('Clinician review required')).toBeInTheDocument();
  });
});