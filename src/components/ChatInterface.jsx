import React, { useState, useRef, useEffect, useCallback } from 'react';
import ToolPanel from './ToolPanel';
import AISourcePanel from './chat/AISourcePanel';
import AiRouteMetadata from './chat/AiRouteMetadata';
import AssistantResultRenderer from './chat/AssistantResultRenderer';
import Citations, { CitationModal } from './Citations';
import ConfidenceBadge from './ConfidenceBadge';
import {
  sendClinicalChatMessage,
  mapChatResponseToAssistantMessage,
} from '../services/clinicalChatService';
import { useNotificationActions } from '../hooks/useNotificationActions';
import { useFeature } from '../hooks/useFeature';
import {
  getQueueForPatientState,
  useEmergencyDepartment,
} from '../contexts/EmergencyDepartmentContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { hasPatientFlag, useEmergencyStore } from '../../store/emergencyStore';
import { buildEMSPressureCopilotContext, calculateEMSPressureScore } from './EMSPressureScore';
import { getWorkspaceExperienceProfile } from '../data/workspaceExperience';
import {
  buildStaffWorkloads,
  getStaffRebalanceSuggestion,
} from '../utils/staffManagement';
import { formatScoresForCopilot } from '../utils/clinicalScoreEvents';
import { drugReferenceToolListForCopilot } from '../utils/drugReferenceTools';
import './ChatInterface.css';

function waitMinutes(arrivalTime) {
  const arrivedAt = new Date(arrivalTime).getTime();
  if (!Number.isFinite(arrivedAt)) return 0;
  return Math.max(0, Math.round((Date.now() - arrivedAt) / 60000));
}

function queueHealth(avgWait) {
  if (avgWait > 60) return 'red';
  if (avgWait > 30) return 'yellow';
  return 'green';
}

function buildEdQueueHealth(patients = [], queueCounts = {}) {
  return Object.entries(queueCounts).map(([queueType, count]) => {
    const queuedPatients = patients.filter(
      (patient) => getQueueForPatientState(patient.state) === queueType
    );
    const averageWait = queuedPatients.length
      ? Math.round(
          queuedPatients.reduce((sum, patient) => sum + waitMinutes(patient.arrivalTime), 0) /
            queuedPatients.length
        )
      : 0;

    return {
      queueType,
      count,
      averageWait,
      health: queueHealth(averageWait),
    };
  });
}

function patientDisplayName(patient) {
  if (!patient) return 'Unknown patient';
  if (patient.name) return patient.name;
  return [patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.id;
}

function isActivePatient(patient) {
  return patient.state !== 'Discharge' && patient.state !== 'Deceased';
}

function isHighRiskPatient(patient) {
  return (
    patient.priority === 'P1' ||
    patient.priority === 'P2' ||
    hasPatientFlag(patient, 'HighRisk') ||
    hasPatientFlag(patient, 'DeteriorationRisk')
  );
}

function activeReferralCount(referrals = []) {
  return referrals.filter((referral) => !['Completed', 'Declined'].includes(referral.status)).length;
}

function normalizeCommandText(value) {
  return String(value || '')
    .trim()
    .replace(/[?.!]+$/g, '')
    .replace(/\s+/g, ' ');
}

function matchPatientTarget(target, patients = []) {
  const normalizedTarget = normalizeCommandText(target).toLowerCase();
  if (!normalizedTarget) return null;

  return (
    patients.find((patient) => {
      const patientName = patientDisplayName(patient);
      const fields = [
        patient.id,
        patientName,
        patient.location,
        String(patient.location || '').replace(/^bed\s*/i, ''),
      ];

      return fields.some((field) => String(field || '').trim().toLowerCase() === normalizedTarget);
    }) ||
    patients.find((patient) => patientDisplayName(patient).toLowerCase().includes(normalizedTarget)) ||
    null
  );
}

function intentParams(detectedIntent) {
  if (!detectedIntent) return {};
  const { intent, ...params } = detectedIntent;
  return params;
}

function detectEdCopilotIntent(message, patients = []) {
  const normalized = normalizeCommandText(message);
  const lower = normalized.toLowerCase();

  if (/\bwaiting\s+longest\b|\blongest\s+waiting\b|\blongest\s+wait\b/.test(lower)) {
    return { intent: 'QUERY_LONGEST_WAIT' };
  }

  if (/\bcapacity\b/.test(lower)) {
    return { intent: 'QUERY_CAPACITY' };
  }

  const calculatorMatch = normalized.match(/^run\s+(.+?)\s+for\s+(.+)$/i);
  if (calculatorMatch?.[1] && calculatorMatch?.[2]) {
    const patientTarget = calculatorMatch[2].trim();
    const matchedPatient = matchPatientTarget(patientTarget, patients);
    return {
      intent: 'LAUNCH_CALCULATOR',
      score: calculatorMatch[1].trim(),
      patient: patientTarget,
      ...(matchedPatient
        ? {
            patientId: matchedPatient.id,
            patientName: patientDisplayName(matchedPatient),
          }
        : {}),
    };
  }

  const reassessmentMatch = normalized.match(/^flag\s+(.+?)\s+for\s+reassessment$/i);
  if (reassessmentMatch?.[1]) {
    const target = reassessmentMatch[1].trim();
    const matchedPatient = matchPatientTarget(target, patients);
    return {
      intent: 'ACTION_FLAG',
      target,
      flag: 'ReassessmentDue',
      ...(matchedPatient
        ? {
            patientId: matchedPatient.id,
            patientName: patientDisplayName(matchedPatient),
            patientLocation: matchedPatient.location,
          }
        : {}),
    };
  }

  if (/\b(ems|ambulance|ambulances)\b/.test(lower)) {
    return { intent: 'QUERY_EMS' };
  }

  if (/\bhigh[-\s]?risk\b/.test(lower)) {
    return { intent: 'QUERY_HIGH_RISK' };
  }

  if (/^who\s+needs\s+attention$/.test(lower)) {
    return { intent: 'QUERY_HIGH_RISK' };
  }

  if (/^reassessment\s+queue$/.test(lower)) {
    return { intent: 'QUERY_REASSESSMENT_QUEUE' };
  }

  const complaintMatch = normalized.match(/^show(?:\s+me)?(?:\s+all)?\s+(.+?)(?:\s+patients?)?$/i);
  if (complaintMatch?.[1]) {
    const complaint = complaintMatch[1].trim();
    return {
      intent: 'FILTER_COMPLAINT',
      complaint,
      value: complaint,
    };
  }

  return null;
}

function normalizeCalculatorCommandId(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+score$/i, '')
    .replace(/[^a-z0-9]+/g, '');
  if (['heart', 'heartscore'].includes(normalized)) return 'heart';
  if (['qsofa', 'quicksofa'].includes(normalized)) return 'qsofa';
  if (['nihss', 'stroke'].includes(normalized)) return 'nihss';
  return normalized;
}

function formatStructuredIntentBlock(detectedIntent) {
  if (!detectedIntent) return null;
  const params = intentParams(detectedIntent);
  return [
    `User intent detected: ${detectedIntent.intent}.`,
    `Intent params: ${JSON.stringify(params)}.`,
    'Respond accordingly and if action suggested, include JSON: {"action":"...","params":{...}}',
    ...(detectedIntent.intent === 'ACTION_FLAG'
      ? [
          'For reassessment flag actions, answer briefly and include a standalone JSON action suggestion exactly like:',
          '{"action":"FLAG_PATIENT","params":{"patientId":"...","patientName":"...","flag":"ReassessmentDue","reason":"ED Copilot suggested reassessment review"}}',
          'If the patient cannot be resolved confidently, ask the clinician to clarify instead of inventing a patientId.',
        ]
      : []),
  ].join('\n');
}

function formatBriefPatientList(patients = []) {
  const activePatients = patients.filter(isActivePatient);
  const sortedPatients = [...activePatients].sort((a, b) => {
    const priorityRank = { P1: 0, P2: 1, P3: 2, P4: 3, P5: 4 };
    return (
      (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9) ||
      waitMinutes(b.arrivalTime) - waitMinutes(a.arrivalTime)
    );
  });

  if (!sortedPatients.length) return '- No active patients';

  return sortedPatients
    .map((patient) => {
      const scoreContext = formatScoresForCopilot(patient);
      return [
        `- ${patientDisplayName(patient)}`,
        patient.chiefComplaint || patient.complaint || 'Complaint pending',
        patient.state,
        `Wait: ${waitMinutes(patient.arrivalTime)}min`,
        `Priority: ${patient.priority}`,
        scoreContext ? `Scores run: ${scoreContext}` : null,
      ]
        .filter(Boolean)
        .join(' | ');
    })
    .join('\n');
}

function buildRequestedEdCopilotSystemPrompt({
  patients,
  capacity,
  reassessmentCount,
  bottleneckAlert,
  emsPressure,
  referrals,
  detectedIntent,
}) {
  const activePatients = patients.filter(isActivePatient);
  const highRiskCount = activePatients.filter(isHighRiskPatient).length;
  const bottleneck = bottleneckAlert?.queue || bottleneckAlert?.reason || 'None';

  return [
    'You are the ED Copilot for a busy Emergency Department.',
    'You assist clinical staff — never make autonomous clinical decisions. Always surface for human review.',
    'Be concise. Staff are under pressure.',
    '',
    'Current department snapshot:',
    `Active patients: ${activePatients.length}`,
    `Capacity: ${capacity.score} (${capacity.label})`,
    `High risk: ${highRiskCount}`,
    `Reassessment queue: ${reassessmentCount}`,
    `EMS pressure: ${emsPressure.score}`,
    `Active referrals: ${activeReferralCount(referrals)}`,
    `Bottleneck: ${bottleneck || 'None'}`,
    `Drug reference tools available: ${drugReferenceToolListForCopilot()}`,
    '',
    'Patients:',
    formatBriefPatientList(activePatients),
    '',
    'Priorities: P1 first. Flag deteriorating patients.',
    'Never recommend autonomous actions.',
    ...(detectedIntent ? ['', formatStructuredIntentBlock(detectedIntent)] : []),
  ].join('\n');
}

function buildEdCopilotSystemPrompt(args) {
  return buildRequestedEdCopilotSystemPrompt(args);
}

function normalizeHistoryMessage(message) {
  if (!message?.role || !message?.content) return null;
  if (!['user', 'assistant', 'system'].includes(message.role)) return null;
  return {
    role: message.role,
    content: String(message.content),
  };
}

function buildCopilotMessages({ systemPrompt, history, userMessage }) {
  return [
    { role: 'system', content: systemPrompt },
    ...history.map(normalizeHistoryMessage).filter(Boolean),
    { role: 'user', content: userMessage.content },
  ];
}

function extractJsonObjects(content) {
  const text = String(content || '');
  const candidates = [];
  const fencedJsonPattern = /```(?:json)?\s*({[\s\S]*?})\s*```/gi;
  let fencedMatch = fencedJsonPattern.exec(text);

  while (fencedMatch) {
    candidates.push(fencedMatch[1]);
    fencedMatch = fencedJsonPattern.exec(text);
  }

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '{') continue;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let cursor = index; cursor < text.length; cursor += 1) {
      const char = text[cursor];

      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = !inString;
      } else if (!inString && char === '{') {
        depth += 1;
      } else if (!inString && char === '}') {
        depth -= 1;
        if (depth === 0) {
          candidates.push(text.slice(index, cursor + 1));
          index = cursor;
          break;
        }
      }
    }
  }

  return candidates;
}

function normalizeCopilotActionSuggestion(action) {
  if (!action || typeof action !== 'object') return null;
  if (!['FLAG_PATIENT', 'ACTION_FLAG', 'FLAG_REASSESSMENT'].includes(action.action)) return null;

  const params = action.params && typeof action.params === 'object' ? action.params : action;

  return {
    action: 'FLAG_PATIENT',
    patientId: params.patientId || params.target || '',
    patientName: params.patientName || params.name || '',
    flag: params.flag || 'ReassessmentDue',
    reason: params.reason || params.flag || 'ED Copilot suggested reassessment review',
  };
}

function parseCopilotActionSuggestion(content) {
  for (const candidate of extractJsonObjects(content)) {
    try {
      const parsed = JSON.parse(candidate);
      const action = normalizeCopilotActionSuggestion(parsed);
      if (action) return action;
    } catch {
      // Ignore non-action JSON snippets in assistant prose.
    }
  }

  return null;
}

function actionSuggestionFromWhiteboardAction(action) {
  if (action?.type !== 'flagReassessment') return null;

  return normalizeCopilotActionSuggestion({
    action: 'FLAG_PATIENT',
    patientId: action.patientId || action.target || action.location,
    patientName: action.patientName,
    flag: action.flag || 'ReassessmentDue',
    reason: action.reason,
  });
}

function getCopilotActionSuggestion(message) {
  return (
    message?.metadata?.pendingAction ||
    parseCopilotActionSuggestion(message?.content) ||
    actionSuggestionFromWhiteboardAction(message?.metadata?.whiteboardAction)
  );
}

function formatMessageTime(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  if (!Number.isFinite(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function renderMessageContent(content) {
  const text = String(content || '');
  const parts = text.split(/```(\w+)?\n?([\s\S]*?)```/g);

  if (parts.length === 1) return <div>{text}</div>;

  return (
    <div className="chat-interface__message-content">
      {parts.map((part, index) => {
        if (index % 3 === 0) {
          return part ? <span key={`text-${index}`}>{part}</span> : null;
        }

        if (index % 3 === 1) return null;

        const language = parts[index - 1] || 'data';
        return (
          <pre key={`code-${index}`} className="chat-interface__code-block">
            <code data-language={language}>{part.trim()}</code>
          </pre>
        );
      })}
    </div>
  );
}

const QUICK_ACTIONS = [
  'Who needs attention?',
  'Capacity status',
  'EMS update',
  'Reassessment queue',
];

const COMMAND_PALETTE_OPTIONS = [
  'Who needs attention?',
  'Who has been waiting the longest?',
  'Show me all chest pain patients',
  "What's our capacity",
  "What's the EMS situation",
  'Any high risk patients',
  'Reassessment queue',
];

function CopilotActionCard({ action, status, onApply, onDismiss }) {
  if (!action) return null;
  if (status === 'dismissed') return null;

  const target = action.patientName || action.patientId || 'matched patient';

  return (
    <div className="chat-interface__action-card">
      <div>
        <strong>⚡ Suggested Action</strong>
        <p>
          Flag {target} for reassessment
          {action.flag ? ` (${action.flag})` : ''}.
        </p>
      </div>
      <div className="chat-interface__action-buttons">
        {status === 'applied' ? (
          <span className="chat-interface__action-status">Applied</span>
        ) : status === 'dismissed' ? (
          <span className="chat-interface__action-status">Dismissed</span>
        ) : (
          <>
            <button type="button" className="btn-primary" onClick={onApply}>
              Apply
            </button>
            <button type="button" className="btn-secondary" onClick={onDismiss}>
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const ChatInterface = ({
  currentTool,
  currentFeature,
  prefillText,
  conversationId,
  messages,
  onAppendMessage,
  onTrackEvent,
  authToken,
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [actionDecisions, setActionDecisions] = useState({});
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const messagesRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const { error: notifyError } = useNotificationActions();
  const { enabled: copilotToolActionsEnabled } = useFeature('copilot_tool_actions');
  const {
    activeWorkspace,
    activeWorkspaceId,
    assistantContext,
    visibleAssetIds,
    recommendedAIAgents,
    recommendedAssetPacks,
  } = useWorkspace();
  const {
    patients,
    queueCounts,
    capacitySnapshot,
    reassessmentQueue,
    setWhiteboardFilter,
    flagPatientForReassessment,
  } = useEmergencyDepartment();
  const emergencyPatients = useEmergencyStore((state) => state.patients);
  const emergencyStaff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const emergencyCapacity = useEmergencyStore((state) => state.capacity);
  const emergencyReferrals = useEmergencyStore((state) => state.referrals);
  const bottleneckAlert = useEmergencyStore((state) => state.bottleneckAlert);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const workspaceExperience = getWorkspaceExperienceProfile(activeWorkspace);
  const isEmergencyCopilot = activeWorkspaceId === 'emergency';
  const edQueueHealth = isEmergencyCopilot ? buildEdQueueHealth(patients, queueCounts) : [];
  const emsPressure = calculateEMSPressureScore(emsArrivals);
  const staffRebalanceSuggestion = getStaffRebalanceSuggestion(
    buildStaffWorkloads(emergencyStaff, emergencyPatients, activeShift)
  );
  const edCopilotContext = isEmergencyCopilot
    ? {
        enabled: true,
        systemPrompt: buildEdCopilotSystemPrompt({
          patients: emergencyPatients,
          capacity: emergencyCapacity,
          reassessmentCount: emergencyPatients.filter(
            (patient) =>
              isActivePatient(patient) &&
              (hasPatientFlag(patient, 'ReassessmentDue') ||
                hasPatientFlag(patient, 'ScoreReassessmentRecommended'))
          ).length,
          queueHealth: edQueueHealth,
          reassessmentQueue,
          bottleneckAlert,
          emsPressure,
          referrals: emergencyReferrals,
          staffRebalanceSuggestion,
        }),
        patientCount: patients.length,
        capacitySnapshot,
        queueHealth: edQueueHealth,
        bottleneckAlert,
        emsPressure,
        emsPressureContext: buildEMSPressureCopilotContext(emsPressure),
        flaggedReassessments: reassessmentQueue,
        staffRebalanceSuggestion,
        patients: patients.map((patient) => ({
          id: patient.id,
          name: patient.name,
          location: patient.location,
          complaint: patient.complaint,
          state: patient.state,
          priority: patient.priority,
          waitMinutes: waitMinutes(patient.arrivalTime),
          assignedTo: patient.assignedTo,
        })),
        safetyBoundary:
          'Decision support only. Never make autonomous clinical decisions; all actions require human review.',
      }
    : null;

  const applyWhiteboardAction = useCallback(
    (action) => {
      if (!action?.type) return;

      if (action.type === 'filterComplaint') {
        setWhiteboardFilter({ queue: null, complaint: action.complaint || action.value || '' });
        return;
      }

      if (action.type === 'filterQueue') {
        setWhiteboardFilter({ queue: action.queue || action.value || null });
        return;
      }

      if (action.type === 'flagReassessment') {
        flagPatientForReassessment(
          action.target || action.patientId || action.location,
          action.reason
        );
        return;
      }

      if (action.type === 'openCalculator' || action.type === 'launchCalculator') {
        window.dispatchEvent(
          new CustomEvent('ed:open-calculator', {
            detail: {
              calculatorId: action.calculatorId || action.toolId || action.value,
              patientId: action.patientId || action.target || null,
            },
          })
        );
      }
    },
    [flagPatientForReassessment, setWhiteboardFilter]
  );

  const applyCopilotActionSuggestion = useCallback(
    (actionKey, action) => {
      if (action?.action !== 'FLAG_PATIENT') return;

      const result = flagPatientForReassessment(
        action.patientId || action.patientName,
        action.reason || action.flag || 'ED Copilot suggested reassessment review'
      );

      if (!result?.ok) {
        notifyError('Action not applied', result?.message || 'Unable to match the patient.');
        return;
      }

      setActionDecisions((current) => ({ ...current, [actionKey]: 'applied' }));
    },
    [flagPatientForReassessment, notifyError]
  );

  const dismissCopilotActionSuggestion = useCallback((actionKey) => {
    setActionDecisions((current) => ({ ...current, [actionKey]: 'dismissed' }));
  }, []);

  const updateStickToBottom = () => {
    const scroller = messagesRef.current;
    if (!scroller) return;
    const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 96;
  };

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const scroller = messagesRef.current;
    if (!scroller) return;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior });
  }, []);

  const keepComposerVisible = useCallback(() => {
    if (!shouldStickToBottomRef.current) return;
    window.setTimeout(() => scrollToBottom('smooth'), 80);
  }, [scrollToBottom]);

  useEffect(() => {
    if (!shouldStickToBottomRef.current) return;
    const raf = window.requestAnimationFrame(() => scrollToBottom('smooth'));
    return () => window.cancelAnimationFrame(raf);
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    const handleViewportChange = () => {
      if (!shouldStickToBottomRef.current) return;
      window.requestAnimationFrame(() => scrollToBottom('auto'));
    };

    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, [scrollToBottom]);

  useEffect(() => {
    if (prefillText && !input.trim()) {
      setInput(prefillText);
    }
  }, [prefillText]);

  useEffect(() => {
    if (!isEmergencyCopilot) return undefined;

    const handleCopilotShortcut = (event) => {
      const target = event.target;
      const isEditable =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

      if (event.key !== '/' || isEditable || event.metaKey || event.ctrlKey || event.altKey) return;

      event.preventDefault();
      shouldStickToBottomRef.current = true;
      inputRef.current?.focus();
    };

    window.addEventListener('keydown', handleCopilotShortcut);
    return () => window.removeEventListener('keydown', handleCopilotShortcut);
  }, [isEmergencyCopilot]);

  const handleSend = async (messageOverride) => {
    const outgoingText = String(messageOverride ?? input).trim();
    if (!outgoingText || isLoading) return;

    const userMessage = {
      role: 'user',
      content: outgoingText,
      timestamp: new Date(),
    };
    const detectedCommandIntent = isEmergencyCopilot
      ? detectEdCopilotIntent(outgoingText, useEmergencyStore.getState().patients)
      : null;

    shouldStickToBottomRef.current = true;
    onAppendMessage?.(conversationId, userMessage);
    onTrackEvent?.('message_sent', {
      conversationId,
      tool: currentTool,
      feature: currentFeature,
      length: outgoingText.length,
    });
    setInput('');
    setIsCommandPaletteOpen(false);
    setIsLoading(true);

    try {
      const requestMessages = isEmergencyCopilot
        ? (() => {
            const emergencyState = useEmergencyStore.getState();
            const currentEmsPressure = calculateEMSPressureScore(emergencyState.emsArrivals);
            const reassessmentCount = emergencyState.patients.filter(
              (patient) =>
                isActivePatient(patient) &&
                (hasPatientFlag(patient, 'ReassessmentDue') ||
                  hasPatientFlag(patient, 'ScoreReassessmentRecommended'))
            ).length;
            const currentStaffRebalanceSuggestion = getStaffRebalanceSuggestion(
              buildStaffWorkloads(
                emergencyState.staff,
                emergencyState.patients,
                emergencyState.activeShift
              )
            );
            const systemPrompt = buildRequestedEdCopilotSystemPrompt({
              patients: emergencyState.patients,
              capacity: emergencyState.capacity,
              reassessmentCount,
              bottleneckAlert: emergencyState.bottleneckAlert,
              emsPressure: currentEmsPressure,
              referrals: emergencyState.referrals,
              detectedIntent: detectedCommandIntent,
              staffRebalanceSuggestion: currentStaffRebalanceSuggestion,
            });

            return buildCopilotMessages({
              systemPrompt,
              history: messages,
              userMessage,
            });
          })()
        : undefined;

      const { ok, data } = await sendClinicalChatMessage({
        message: outgoingText,
        messages: requestMessages,
        tool: currentTool,
        feature: currentFeature,
        requestType: isEmergencyCopilot ? 'COPILOT_CHAT' : undefined,
        conversationId,
        authToken,
        workspaceContext: {
          workspaceId: activeWorkspaceId,
          workspaceKey: activeWorkspaceId,
          activeWorkspaceId,
          operatingLabel: workspaceExperience.operatingLabel,
          modeSummary: workspaceExperience.modeSummary,
          assistantContext: assistantContext || workspaceExperience.assistantContext,
          visibleAssetIds,
          recommendedAIAgents,
          recommendedAssetPacks,
          ...(isEmergencyCopilot
            ? {
                aiRequest: {
                  requestType: 'COPILOT_CHAT',
                  toolsEnabled: copilotToolActionsEnabled,
                },
              }
            : {}),
          ...(edCopilotContext
            ? {
                edCopilot: {
                  ...edCopilotContext,
                  ...(detectedCommandIntent ? { detectedIntent: detectedCommandIntent } : {}),
                },
              }
            : {}),
        },
      });

      if (!ok) {
        throw new Error(`Request failed with status`);
      }

      const assistantMessage = mapChatResponseToAssistantMessage(data);
      const pendingAction =
        parseCopilotActionSuggestion(assistantMessage.content) ||
        actionSuggestionFromWhiteboardAction(assistantMessage.metadata?.whiteboardAction);
      if (pendingAction) {
        assistantMessage.metadata = {
          ...assistantMessage.metadata,
          pendingAction,
        };
      }
      onAppendMessage?.(conversationId, assistantMessage);
      if (assistantMessage.metadata?.whiteboardAction?.type !== 'flagReassessment') {
        applyWhiteboardAction(assistantMessage.metadata?.whiteboardAction);
      }
      if (
        detectedCommandIntent?.intent === 'LAUNCH_CALCULATOR' &&
        detectedCommandIntent.patientId &&
        !assistantMessage.metadata?.whiteboardAction
      ) {
        applyWhiteboardAction({
          type: 'openCalculator',
          calculatorId: normalizeCalculatorCommandId(detectedCommandIntent.score),
          patientId: detectedCommandIntent.patientId,
        });
      }
    } catch {
      onAppendMessage?.(conversationId, {
        role: 'assistant',
        content: 'Copilot unavailable — check connection',
        metadata: {
          isCopilotError: true,
          retryMessage: outgoingText,
        },
        timestamp: new Date(),
      });
      notifyError('Connection failed', 'Unable to reach the server. Please try again.');
      onTrackEvent?.('message_error', {
        conversationId,
        tool: currentTool,
        feature: currentFeature,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Escape') {
      setIsCommandPaletteOpen(false);
      return;
    }

    if (e.key === '/' && !input.trim()) {
      setIsCommandPaletteOpen(true);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleComposerChange = (event) => {
    const nextValue = event.target.value;
    setInput(nextValue);
    setIsCommandPaletteOpen(nextValue.trim().startsWith('/'));
  };

  const handleQuickSend = (message) => {
    shouldStickToBottomRef.current = true;
    handleSend(message);
  };

  const handleCommandSelect = (message) => {
    setInput('');
    setIsCommandPaletteOpen(false);
    handleSend(message);
  };

  return (
    <div className="chat-interface">
      <div
        ref={messagesRef}
        className="chat-interface__messages app-scroll-container"
        onScroll={updateStickToBottom}
      >
        {messages.length === 0 && (
          <div className="chat-interface__empty">{workspaceExperience.assistantPlaceholder}</div>
        )}
        {messages.map((message, index) => {
          const actionKey = message.id || `${conversationId || 'conversation'}-${index}`;
          const actionSuggestion =
            message.role === 'assistant' ? getCopilotActionSuggestion(message) : null;

          return (
            <div
              key={index}
              className={`chat-interface__message-row chat-interface__message-row--${message.role}`}
            >
              {message.role === 'assistant' && (
                <div className="chat-interface__avatar chat-interface__avatar--assistant" aria-hidden>
                  🤖
                </div>
              )}
              <div
                className={`chat-interface__bubble ${
                  message.role === 'user'
                    ? 'chat-interface__bubble--user'
                    : 'chat-interface__bubble--assistant'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="chat-interface__speaker-label">ED Copilot</div>
                )}
                {renderMessageContent(message.content)}
                {message.confidence !== undefined && message.role === 'assistant' && (
                  <div style={{ marginTop: '12px' }}>
                    <ConfidenceBadge confidence={message.confidence} />
                  </div>
                )}
                {message.role === 'assistant' &&
                  (message.aiFoundation || message.metadata?.aiFoundation) && (
                    <AiRouteMetadata
                      aiFoundation={message.aiFoundation || message.metadata?.aiFoundation}
                      routePlan={message.metadata?.routePlan}
                      aiGateway={message.aiGateway || message.metadata?.aiGateway}
                    />
                  )}
                <AssistantResultRenderer
                  message={message}
                  visualizationsStyle={{
                    marginTop: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                />
                {actionSuggestion && (
                  <CopilotActionCard
                    action={actionSuggestion}
                    status={actionDecisions[actionKey]}
                    onApply={() => applyCopilotActionSuggestion(actionKey, actionSuggestion)}
                    onDismiss={() => dismissCopilotActionSuggestion(actionKey)}
                  />
                )}
                {message.metadata?.isCopilotError && (
                  <div className="chat-interface__retry-card">
                    <span>Copilot unavailable — check connection</span>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleSend(message.metadata.retryMessage)}
                      disabled={isLoading}
                    >
                      Retry
                    </button>
                  </div>
                )}
                {message.role === 'assistant' && (
                  <AISourcePanel
                    sourcePanel={
                      message.sourcePanel ||
                      message.ragContext?.sourcePanel ||
                      (Array.isArray(message.ragContext?.references) &&
                      message.ragContext.references.length > 0
                        ? {
                            references: message.ragContext.references,
                            confidence: message.confidence ?? message.ragContext.confidence,
                            generatedAt: message.ragContext.generatedAt,
                            retrieval: message.ragContext,
                          }
                        : undefined)
                    }
                  />
                )}
                {message.citations &&
                  message.citations.length > 0 &&
                  message.role === 'assistant' &&
                  !(
                    message.sourcePanel?.references?.length ||
                    message.ragContext?.sourcePanel?.references?.length ||
                    message.ragContext?.references?.length
                  ) && (
                    <Citations
                      citations={message.citations}
                      onViewDetails={(citation) => setSelectedCitation(citation)}
                    />
                  )}
                <div className="chat-interface__meta">
                  {formatMessageTime(message.timestamp)}
                  {message.ragContext && message.ragContext.sourcesFound > 0 && (
                    <span style={{ marginLeft: '12px', opacity: 0.7 }}>
                      • {message.ragContext.chunksRetrieved} chunks from{' '}
                      {message.ragContext.sourcesFound} sources
                    </span>
                  )}
                </div>
              </div>
              {message.role === 'user' && (
                <div className="chat-interface__avatar chat-interface__avatar--user" aria-hidden>
                  👤
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="chat-interface__message-row chat-interface__message-row--assistant">
            <div className="chat-interface__avatar chat-interface__avatar--assistant" aria-hidden>
              🤖
            </div>
            <div className="chat-interface__loading-bubble">
              <div className="chat-interface__speaker-label">ED Copilot</div>
              <div className="chat-interface__skeleton" aria-hidden>
                <span />
                <span />
                <span />
              </div>
              <div className="chat-interface__typing" aria-label="ED Copilot is typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {(currentTool || currentFeature) && <ToolPanel tool={currentTool} feature={currentFeature} />}

      <div className="chat-interface__input-area">
        <div className="chat-interface__quick-actions" aria-label="Copilot quick actions">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => handleQuickSend(action)}
              disabled={isLoading}
            >
              {action}
            </button>
          ))}
        </div>
        {isCommandPaletteOpen && (
          <div className="chat-interface__command-palette" role="menu" aria-label="Command palette">
            <span>Command palette</span>
            {COMMAND_PALETTE_OPTIONS.map((command) => (
              <button
                key={command}
                type="button"
                role="menuitem"
                onClick={() => handleCommandSelect(command)}
              >
                {command}
              </button>
            ))}
          </div>
        )}
        <div className="chat-interface__composer">
          <textarea
            ref={inputRef}
            value={input}
            onFocus={keepComposerVisible}
            onChange={handleComposerChange}
            onKeyDown={handleKeyPress}
            placeholder='Ask ED Copilot, or type "/" for commands'
            disabled={isLoading}
            className="chat-interface__textarea"
            rows={1}
          />
          <button
            type="button"
            className="chat-interface__voice"
            aria-label="Voice input placeholder"
            title="Voice input coming soon"
            disabled={isLoading}
          >
            Voice
          </button>
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="btn-primary chat-interface__send"
            style={{
              opacity: input.trim() && !isLoading ? 1 : 0.6,
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
        <div className="chat-interface__disclaimer">
          CareDroid can make mistakes. Verify medical information.
        </div>
      </div>

      {selectedCitation && (
        <CitationModal citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
      )}
    </div>
  );
};

export default ChatInterface;
