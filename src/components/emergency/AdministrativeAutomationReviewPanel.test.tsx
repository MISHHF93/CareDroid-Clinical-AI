import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdministrativeAutomationReviewPanel from './AdministrativeAutomationReviewPanel';
import type { AdministrativeAutomationTask } from '../../types/administrativeAutomation';
import type { WorkflowAutomationItem } from '../../config/unifiedWorkflowAutomationModel';

const reviewItemMock = vi.fn();

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

const workflowItem: WorkflowAutomationItem = {
  id: 'uwa-admin-auto-route-p-1',
  domain: 'patient_routing',
  source: 'admin_automation',
  status: 'pending_review',
  priority: 'high',
  title: aiTask.title,
  summary: aiTask.summary,
  proposedAction: aiTask.proposedAction,
  route: '/emergency/whiteboard?patient=p-1',
  patientId: 'p-1',
  patientName: 'Jamie Lee',
  ownerRole: 'Charge Nurse',
  humanReviewRequired: true,
  oneClickAction: 'approve',
  linkedTaskId: aiTask.id,
  updatedAt: aiTask.updatedAt,
};

vi.mock('../../hooks/useUnifiedWorkflowAutomation', () => ({
  default: () => ({
    snapshot: {
      engineId: 'unified-workflow-automation',
      generatedAt: aiTask.updatedAt,
      items: [workflowItem],
      pendingReview: 1,
      metrics: {
        total: 1,
        pendingReview: 1,
        critical: 0,
        byDomain: {
          reception: 0,
          intake: 0,
          triage: 0,
          patient_routing: 1,
          notifications: 0,
          documentation: 0,
          handoffs: 0,
          staff_assignments: 0,
          analytics: 0,
          reporting: 0,
          ai_recommendations: 0,
        },
        bySource: {
          admin_automation: 1,
          ai_chief: 0,
          three_minute_mission: 0,
          backend_event: 0,
        },
        clicksSavedEstimate: 3,
      },
      safetyStatement: 'Human review required.',
      backendEndpoints: [],
    },
    items: [workflowItem],
    pendingItems: [workflowItem],
    pendingCount: 1,
    reviewItem: reviewItemMock,
    acknowledgeItem: vi.fn(),
  }),
}));

const overriddenTask: AdministrativeAutomationTask = {
  ...aiTask,
  id: 'auto-route-p-2',
  patientId: 'p-2',
  patientName: 'Alex Rivera',
  status: 'overridden',
  overrideReason: 'Charge nurse judgment: patient already en route to resus bay.',
  reviewedByStaffId: 'user-1',
  reviewedAt: '2026-07-01T12:05:00.000Z',
};

vi.mock('../../store/emergencyStore', () => ({
  useEmergencyStore: (selector: (state: { administrativeAutomationQueue: AdministrativeAutomationTask[] }) => unknown) =>
    selector({ administrativeAutomationQueue: [aiTask, overriddenTask] }),
}));

vi.mock('../../contexts/UserContext', () => ({
  useUser: () => ({ user: { id: 'user-1', name: 'Test Clinician' } }),
}));

function renderPanel() {
  return render(
    <MemoryRouter>
      <AdministrativeAutomationReviewPanel />
    </MemoryRouter>,
  );
}

describe('AdministrativeAutomationReviewPanel', () => {
  it('renders AI decision fields from proposedPayload.aiDecision', () => {
    renderPanel();

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

  it('P0.4: labels the AI decision block Live, with review required', () => {
    renderPanel();

    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Live');
    expect(label.getAttribute('title')).toMatch(/AI Chief gateway/i);
    expect(label.getAttribute('title')).toMatch(/human review required/i);
  });

  it('renders automation queue charts', () => {
    renderPanel();

    expect(screen.getByText('Queue status')).toBeInTheDocument();
    expect(screen.getByText('By domain')).toBeInTheDocument();
    expect(screen.getByTestId('distribution-donut-chart')).toBeInTheDocument();
    expect(screen.getByTestId('category-bar-chart')).toBeInTheDocument();
  });

  it('reflects real overridden tasks in the status chart instead of a hardcoded 0', () => {
    renderPanel();

    // buildAutomationStatusChart filters out any row with value 0, so before
    // the fix this segment never rendered at all regardless of how many
    // overrides had actually happened -- the mocked queue above has one
    // task with status: 'overridden'.
    expect(screen.getByText('Overridden: 1')).toBeInTheDocument();
  });
});