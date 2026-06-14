import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { IconSend } from '@tabler/icons-react';
import { PatientFlag, PatientState, Priority, type Alert, type Patient } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { callAI } from '../lib/ai/client';
import { getAIPrompt } from '../lib/ai/promptRegistry';
import { HUMAN_REVIEW_DISCLAIMER } from '../lib/ai/safety/policy';
import { EMERGENCY_OS_BRANDING } from '../config/emergencyOsBranding.config';
import './CopilotPanel.css';
import { formatLongWaitAttentionForCopilot } from '../utils/longWaitRescue';

type CopilotMessage = {
  id: string;
  role: 'staff' | 'copilot';
  content: string;
  timestamp: Date;
};

const QUICK_ACTIONS = [
  'Who needs attention?',
  'Capacity status',
  'EMS update',
  'Reassessment queue',
];

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function waitMinutes(arrivalTime: string): number {
  const arrivedAt = new Date(arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((Date.now() - arrivedAt) / 60000));
}

function patientName(patient: Patient): string {
  return `${patient.firstName} ${patient.lastName}`.trim() || patient.mrn;
}

function isActivePatient(patient: Patient): boolean {
  return patient.state !== PatientState.Discharge;
}

function isHighRiskPatient(patient: Patient): boolean {
  return (
    patient.priority === Priority.P1 ||
    patient.priority === Priority.P2 ||
    patient.flags.includes(PatientFlag.HighRisk) ||
    patient.flags.includes(PatientFlag.DeteriorationRisk) ||
    patient.flags.includes(PatientFlag.SepsisAlert)
  );
}

function isReassessmentDue(patient: Patient): boolean {
  return patient.flags.includes(PatientFlag.ReassessmentDue);
}

function formatAlert(alert: Alert): string {
  return `${alert.severity}: ${alert.title} - ${alert.message}`;
}

function summarizePatient(patient: Patient): string {
  const latestVitals = patient.vitals.at(-1);
  const vitals = latestVitals
    ? `HR ${latestVitals.hr ?? '--'}, SBP ${latestVitals.sbp ?? '--'}, SpO2 ${latestVitals.spo2 ?? '--'}, Temp ${latestVitals.temp ?? '--'}`
    : 'Vitals unavailable';
  return [
    patientName(patient),
    patient.mrn,
    patient.chiefComplaint,
    patient.state,
    patient.priority,
    `Wait ${waitMinutes(patient.arrivalTime)}m`,
    vitals,
    patient.flags.length ? `Flags: ${patient.flags.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' | ');
}

function buildDepartmentPrompt({
  patients,
  capacity,
  alerts,
  emergencySettings,
}: {
  patients: Patient[];
  capacity: ReturnType<typeof useEmergencyStore.getState>['capacity'];
  alerts: Alert[];
  emergencySettings: ReturnType<typeof useEmergencyStore.getState>['emergencySettings'];
}) {
  const activePatients = patients.filter(isActivePatient);
  const highRiskPatients = activePatients.filter(isHighRiskPatient);
  const reassessmentQueue = activePatients.filter(isReassessmentDue);
  const activeAlerts = alerts.filter((alert) => !alert.dismissed);
  const longWaitAttention = formatLongWaitAttentionForCopilot(activePatients, new Date(), emergencySettings);

  return [
    getAIPrompt('ed-copilot').prompt,
    HUMAN_REVIEW_DISCLAIMER,
    'Keep answers brief, operationally useful, and explicit about uncertainty.',
    '',
    `Patient count: ${activePatients.length}`,
    `High risk count: ${highRiskPatients.length}`,
    `Capacity band: ${capacity.band} (${capacity.score})`,
    `Reassessment queue count: ${reassessmentQueue.length}`,
    longWaitAttention || null,
    '',
    'Active high risk patients:',
    highRiskPatients.length ? highRiskPatients.map((patient) => `- ${summarizePatient(patient)}`).join('\n') : '- None',
    '',
    'Reassessment queue:',
    reassessmentQueue.length ? reassessmentQueue.map((patient) => `- ${summarizePatient(patient)}`).join('\n') : '- None',
    '',
    'Active alerts:',
    activeAlerts.length ? activeAlerts.map((alert) => `- ${formatAlert(alert)}`).join('\n') : '- None',
  ].filter((line): line is string => Boolean(line)).join('\n');
}

function extractResponseText(data: unknown): string {
  const payload = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const response = payload.response;
  if (typeof response === 'string' && response.trim()) return response;
  const message = payload.message;
  if (typeof message === 'string' && message.trim()) return message;
  return 'I could not generate a response.';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function streamIntoMessage(
  text: string,
  messageId: string,
  setMessages: Dispatch<SetStateAction<CopilotMessage[]>>,
) {
  const tokens = text.match(/\S+\s*/g) || [text];
  let nextContent = '';

  for (const token of tokens) {
    nextContent += token;
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.id === messageId ? { ...message, content: nextContent } : message,
      ),
    );
    await delay(18);
  }
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 0' }} aria-label="Copilot typing">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="ed-copilot-typing-dot"
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: '#9CA3AF',
            animationDelay: `${index * 120}ms`,
          }}
        />
      ))}
    </div>
  );
}

export function CopilotPanel() {
  const patients = useEmergencyStore((store) => store.patients);
  const capacity = useEmergencyStore((store) => store.capacity);
  const alerts = useEmergencyStore((store) => store.alerts);
  const emergencySettings = useEmergencyStore((store) => store.emergencySettings);
  const toggleCopilot = useEmergencyStore((store) => store.toggleCopilot);
  const recordWorkflowAction = useEmergencyStore((store) => store.recordWorkflowAction);
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'copilot-welcome',
      role: 'copilot',
      content: `${EMERGENCY_OS_BRANDING.copilotName} online. Ask about attention needs, capacity, EMS, or reassessment queue. ${EMERGENCY_OS_BRANDING.safetyShort}.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activePatients = useMemo(() => patients.filter(isActivePatient), [patients]);
  const highRiskCount = useMemo(() => activePatients.filter(isHighRiskPatient).length, [activePatients]);
  const reassessmentCount = useMemo(() => activePatients.filter(isReassessmentDue).length, [activePatients]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [loading, messages]);

  const sendMessage = async (value?: string) => {
    const text = (value ?? input).trim();
    if (!text || loading) return;

    const staffMessage: CopilotMessage = {
      id: createId('staff'),
      role: 'staff',
      content: text,
      timestamp: new Date(),
    };
    const assistantId = createId('copilot');
    const assistantMessage: CopilotMessage = {
      id: assistantId,
      role: 'copilot',
      content: '',
      timestamp: new Date(),
    };
    const history = messages;
    const systemPrompt = buildDepartmentPrompt({ patients, capacity, alerts, emergencySettings });
    recordWorkflowAction({
      type: 'copilot_used',
      title: 'Copilot used',
      summary: `ED Copilot prompt submitted: ${text.slice(0, 80)}${text.length > 80 ? '...' : ''}`,
      actorStaffId: 'current-user',
      source: 'ed-copilot-panel',
      metadata: {
        promptLength: text.length,
        activePatientCount: activePatients.length,
        capacityScore: capacity.score,
        capacityBand: capacity.band,
        reassessmentQueueCount: reassessmentCount,
      },
    });

    setInput('');
    setLoading(true);
    setMessages((currentMessages) => [...currentMessages, staffMessage, assistantMessage]);

    try {
      const requestMessages = [
        ...history.map((message) => ({
          role: message.role === 'staff' ? 'user' as const : 'assistant' as const,
          content: message.content,
        })),
        { role: 'user' as const, content: text },
      ];
      const response = await callAI({
        requestType: 'COPILOT_CHAT',
        systemPrompt,
        message: text,
        messages: requestMessages,
        context: {
          edCopilot: {
            patientCount: activePatients.length,
            highRiskCount,
            capacityBand: capacity.band,
            capacityScore: capacity.score,
            reassessmentQueueCount: reassessmentCount,
            activeAlerts: alerts.filter((alert) => !alert.dismissed).length,
            safetyRule: EMERGENCY_OS_BRANDING.safetyLine,
          },
        },
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const responseText =
        typeof response.content === 'string' ? response.content : extractResponseText(response.data);
      await streamIntoMessage(responseText, assistantId, setMessages);
    } catch {
      await streamIntoMessage(
        `${EMERGENCY_OS_BRANDING.copilotName} unavailable - check connection. Continue clinical review with human oversight.`,
        assistantId,
        setMessages,
      );
    } finally {
      setLoading(false);
    }
  };

  const submitMessage = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage();
  };

  const sendQuickAction = (action: string) => {
    setInput((current) => (current ? `${current} ${action}` : action));
    void sendMessage(action);
  };

  return (
    <aside
      className="ed-copilot-panel"
      style={{
        width: 380,
        height: '100vh',
        flexShrink: 0,
        background: '#111827',
        borderLeft: '1px solid #1F2937',
        color: '#F9FAFB',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>
        {`
          @keyframes ed-copilot-live-pulse {
            0%, 100% { opacity: 0.45; transform: scale(0.9); }
            50% { opacity: 1; transform: scale(1); }
          }

          @keyframes ed-copilot-typing {
            0%, 80%, 100% { opacity: 0.35; transform: translateY(0); }
            40% { opacity: 1; transform: translateY(-3px); }
          }

          .ed-copilot-typing-dot {
            animation: ed-copilot-typing 900ms infinite ease-in-out;
          }
        `}
      </style>
      <header
        style={{
          height: 48,
          flexShrink: 0,
          borderBottom: '1px solid #1F2937',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 10px',
        }}
      >
        <span
          aria-label="Copilot live"
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: '#10B981',
            animation: 'ed-copilot-live-pulse 1200ms infinite ease-in-out',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 500, marginRight: 2 }}>
          {EMERGENCY_OS_BRANDING.copilotName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
          {[activePatients.length, capacity.band, reassessmentCount].map((value, index) => (
            <span
              key={`${value}-${index}`}
              style={{
                border: '1px solid #1F2937',
                borderRadius: 999,
                background: '#0B1120',
                color: '#9CA3AF',
                padding: '3px 6px',
                fontSize: 10,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {value}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleCopilot}
          aria-label={`Close ${EMERGENCY_OS_BRANDING.copilotName}`}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: '1px solid #374151',
            background: 'transparent',
            color: '#F9FAFB',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          X
        </button>
      </header>

      <div
        aria-label={`${EMERGENCY_OS_BRANDING.copilotName} messages`}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.map((message) => {
          const isStaff = message.role === 'staff';
          return (
            <div
              key={message.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isStaff ? 'flex-end' : 'flex-start',
                gap: 4,
              }}
            >
              <div
                style={{
                  maxWidth: '86%',
                  background: isStaff ? '#1C2333' : '#111827',
                  border: isStaff ? 'none' : '1px solid #1F2937',
                  borderRadius: isStaff ? '12px 12px 0 12px' : '12px 12px 12px 0',
                  padding: '8px 12px',
                  color: '#F9FAFB',
                  fontSize: 13,
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {message.content || (message.role === 'copilot' && loading ? <TypingIndicator /> : null)}
              </div>
              <time style={{ color: '#6B7280', fontSize: 10 }}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </time>
            </div>
          );
        })}
        {loading && messages[messages.length - 1]?.content ? (
          <div style={{ alignSelf: 'flex-start' }}>
            <TypingIndicator />
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '0 12px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => sendQuickAction(action)}
            disabled={loading}
            style={{
              border: '1px solid #1F2937',
              borderRadius: 10,
              background: '#0B1120',
              color: '#D1D5DB',
              padding: '8px 9px',
              fontSize: 12,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.65 : 1,
              textAlign: 'left',
            }}
          >
            {action}
          </button>
        ))}
      </div>

      <form
        onSubmit={submitMessage}
        style={{
          height: 56,
          flexShrink: 0,
          borderTop: '1px solid #1F2937',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 12px',
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={`Ask ${EMERGENCY_OS_BRANDING.copilotName}...`}
          aria-label={`Message ${EMERGENCY_OS_BRANDING.copilotName}`}
          style={{
            flex: 1,
            minWidth: 0,
            border: '1px solid #374151',
            borderRadius: 10,
            background: '#0B1120',
            color: '#F9FAFB',
            padding: '9px 10px',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          aria-label={`Send ${EMERGENCY_OS_BRANDING.copilotName} message`}
          disabled={loading || !input.trim()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            border: '1px solid #2563EB',
            background: '#2563EB',
            color: '#F9FAFB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !input.trim() ? 0.6 : 1,
          }}
        >
          <IconSend size={17} stroke={2.2} />
        </button>
      </form>
    </aside>
  );
}
