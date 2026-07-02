import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Patient } from '../../types/emergency';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import {
  COPILOT_SAFETY_BOUNDED_DISCLAIMER,
  PATIENT_COPILOT_QUICK_ACTIONS,
  PATIENT_STATUS_SUMMARY_PROMPT,
  SAFETY_BOUNDED_ASSISTANT_LABEL,
} from '../../config/copilotSafety.config';
import { invokeUnifiedAiConversational } from '../../services/careDroidUnifiedAiNode';
import { getAIPrompt } from '../../lib/ai/promptRegistry';
import usePatientOrchestration from '../../hooks/usePatientOrchestration';
import { buildCopilotPatientArtifactContext } from '../../services/patientAiContext';
import { launchOrchestrationRecommendation } from '../../services/orchestrationToolLaunch';
import {
  formatPatientOrchestrationForCopilot,
  formatPatientToolRecommendationsForCopilot,
} from '../../../lib/patient-orchestration';
import { persistCopilotInteractionSafely } from '../../services/emergencyOsApi';
import './PatientCardCopilot.css';

type CopilotMessage = {
  id: string;
  role: 'staff' | 'copilot';
  content: string;
};

type PatientCardCopilotProps = {
  patient: Patient;
  defaultExpanded?: boolean;
};

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function PatientCardCopilot({
  patient,
  defaultExpanded = true,
}: PatientCardCopilotProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'copilot',
      content: `${SAFETY_BOUNDED_ASSISTANT_LABEL} for ${patient.firstName} ${patient.lastName}. ${COPILOT_SAFETY_BOUNDED_DISCLAIMER}`,
    },
  ]);

  const orchestration = usePatientOrchestration(patient);
  const patientContextPrompt = useMemo(
    () => formatPatientOrchestrationForCopilot(orchestration),
    [orchestration],
  );
  const toolRecommendationsPrompt = useMemo(
    () => formatPatientToolRecommendationsForCopilot(orchestration),
    [orchestration],
  );

  useEffect(() => {
    const onFocus = (event: Event) => {
      const detail = (event as CustomEvent<{ patientId?: string }>).detail;
      if (!detail?.patientId || detail.patientId === patient.id) {
        setExpanded(true);
      }
    };
    window.addEventListener('ed:patient-copilot-focus', onFocus);
    return () => window.removeEventListener('ed:patient-copilot-focus', onFocus);
  }, [patient.id]);

  const sendMessage = useCallback(
    async (promptText: string) => {
      const trimmed = promptText.trim();
      if (!trimmed || loading) return;

      const staffMessage: CopilotMessage = {
        id: createId('staff'),
        role: 'staff',
        content: trimmed,
      };
      const assistantId = createId('copilot');
      const assistantMessage: CopilotMessage = {
        id: assistantId,
        role: 'copilot',
        content: '',
      };

      const summaryPrompt = getAIPrompt('patient-status-summarizer');
      const artifactContext = buildCopilotPatientArtifactContext(patient, orchestration);
      const systemPrompt = [
        summaryPrompt.prompt,
        summaryPrompt.requiredDisclaimer,
        `Selected patient context:\n${patientContextPrompt}`,
        toolRecommendationsPrompt ? `Tool recommendations:\n${toolRecommendationsPrompt}` : null,
        artifactContext ? `Structured source data:\n${JSON.stringify(artifactContext, null, 2)}` : null,
      ]
        .filter(Boolean)
        .join('\n\n');

      setMessages((current) => [...current, staffMessage, assistantMessage]);
      setInput('');
      setLoading(true);

      try {
        const response = await invokeUnifiedAiConversational({
          capabilityId: trimmed === PATIENT_STATUS_SUMMARY_PROMPT ? 'referralSummarization' : 'copilot',
          platformServiceId: trimmed === PATIENT_STATUS_SUMMARY_PROMPT ? 'referralSummarization' : 'copilot',
          requestType: trimmed === PATIENT_STATUS_SUMMARY_PROMPT ? 'CLINICAL_SUMMARY' : 'COPILOT_CHAT',
          systemPrompt,
          message: trimmed,
          patientId: patient.id,
          sourceScreen: 'patient_card_copilot',
          context: {
            aiRequest: {
              requestType: trimmed === PATIENT_STATUS_SUMMARY_PROMPT ? 'CLINICAL_SUMMARY' : 'COPILOT_CHAT',
              patientId: patient.id,
              patientContext: patientContextPrompt,
              complaint: patient.chiefComplaint || patient.complaint,
              patientArtifactContext: artifactContext,
            },
          },
        });

        const responseText =
          typeof response.content === 'string'
            ? response.content
            : typeof response.data === 'object' && response.data && 'content' in response.data
              ? String((response.data as { content?: string }).content || '')
              : `${EMERGENCY_OS_BRANDING.copilotName} unavailable — continue with human clinical review.`;

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, content: responseText } : message,
          ),
        );
        persistCopilotInteractionSafely({
          question: trimmed,
          patientId: patient.id,
          patientContextSummary: patientContextPrompt,
          draftGuidance: responseText,
          requiresHumanReview: true,
        });
      } catch {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content:
                    'Copilot is unavailable. Use the patient chart, vitals, and pathway tools directly with human review.',
                }
              : message,
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, orchestration, patient, patientContextPrompt, toolRecommendationsPrompt],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  return (
    <section className="patient-card-copilot" aria-label="Patient card CareDroid Copilot">
      <header className="patient-card-copilot__header">
        <div className="patient-card-copilot__title-block">
          <h3 className="patient-card-copilot__title">
            {EMERGENCY_OS_BRANDING.copilotName} · {patient.firstName} {patient.lastName}
          </h3>
          <span className="patient-card-copilot__safety-badge">{SAFETY_BOUNDED_ASSISTANT_LABEL}</span>
        </div>
        <button
          type="button"
          className="patient-card-copilot__toggle"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </header>

      {expanded ? (
        <div className="patient-card-copilot__body">
          <aside className="patient-card-copilot__sidebar" aria-label="Copilot quick actions">
            <h4>Quick actions</h4>
            {PATIENT_COPILOT_QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                className="patient-card-copilot__quick-action"
                onClick={() => void sendMessage(action)}
                disabled={loading}
              >
                {action}
              </button>
            ))}

            <h4>Recommended tools</h4>
            {(orchestration?.prioritizedRecommendations?.length ?? 0) > 0 ? (
              (orchestration?.prioritizedRecommendations ?? []).map((recommendation) => (
                <button
                  key={recommendation.id}
                  type="button"
                  className="patient-card-copilot__tool-action"
                  disabled={loading || recommendation.completed}
                  onClick={() =>
                    launchOrchestrationRecommendation({
                      patientId: patient.id,
                      recommendation,
                      source: 'patient-card',
                    })
                  }
                >
                  {recommendation.label}
                  <small>{recommendation.reason}</small>
                </button>
              ))
            ) : (
              <p style={{ margin: 0, color: 'var(--medical-card-fg-muted, #6b7280)', fontSize: 12 }}>
                No complaint- or vitals-based tool recommendations yet.
              </p>
            )}
          </aside>

          <div className="patient-card-copilot__chat">
            <div className="patient-card-copilot__messages" aria-live="polite">
              {messages.map((message) => (
                <div key={message.id} className="patient-card-copilot__message" data-role={message.role}>
                  <div className="patient-card-copilot__bubble">
                    {message.content || (loading && message.role === 'copilot' ? 'Thinking…' : null)}
                  </div>
                </div>
              ))}
            </div>
            <form className="patient-card-copilot__composer" onSubmit={onSubmit}>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about this patient…"
                aria-label="Patient Copilot message"
                disabled={loading}
              />
              <button type="submit" disabled={loading || !input.trim()}>
                Send
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}