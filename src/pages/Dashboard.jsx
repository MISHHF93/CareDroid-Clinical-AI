import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useNotificationActions } from '../hooks/useNotificationActions';
import { toolRegistryById, getToolById } from '../data/toolRegistry';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import ToolVisualization from '../components/ToolVisualization';
import AiRouteMetadata from '../components/chat/AiRouteMetadata';
import ChatExecutionCard from '../components/chat/ChatExecutionCard';
import OperationalResultCard from '../components/chat/OperationalResultCard';
import Citations, { CitationModal } from '../components/Citations';
import ConfidenceBadge from '../components/ConfidenceBadge';
import ProfileToolGraphCard from '../components/ProfileToolGraphCard';
import { Drawer } from '../components/ui/Drawer';
import analyticsService from '../services/analyticsService';
import { validateClinicalTool } from '../services/clinicalToolsApi';
import { executeClinicalTool } from '../services/clinicalOrchestratorApi';
import { buildUserToolProfile } from '../data/profileToolSegmentation';
import { buildRoleIntelligenceProfile } from '../data/roleIntelligenceLayer';
import {
  trackRoleAiRequest,
  trackRoleWorkflowLaunch,
} from '../services/roleIntelligenceTelemetry';
import {
  CHAT_SENSITIVE_CONFIRMATIONS,
  getChatCapabilitySuggestions,
} from '../utils/chatCapabilitySuggestions';
import { filterVisibleTools, getAssetAwareToolProjection } from '../data/assetAccess';
import {
  buildExecutionParameters,
  createChatExecutionAction,
  getExecutionInputIssue,
} from '../utils/chatExecutionModel';
import {
  sendClinicalChatMessage,
  mapChatResponseToAssistantMessage,
  registryIdToChatToolParam,
} from '../services/clinicalChatService';
import { scheduleIdleWork } from '../utils/scheduleIdleWork';
import { NavIcon } from '../navigation/NavIcon';
import { getToolIcon, CHROME_ICONS } from '../navigation/iconRegistry';
import './Dashboard.css';

const OUTREACH_INTENTS = Object.freeze([
  {
    id: 'follow-up',
    label: 'Follow-up',
    description: 'Plan a clinician-reviewed post-visit or post-discharge check-in.',
  },
  {
    id: 'patient outreach',
    label: 'Patient outreach',
    description: 'Draft a patient-safe message plan for manual outreach.',
  },
  {
    id: 'care reminder',
    label: 'Care reminder',
    description: 'Prepare reminder wording for appointments, labs, or next steps.',
  },
  {
    id: 'general message planning',
    label: 'General message planning',
    description: 'Structure a non-sending communication plan for review.',
  },
]);

const OUTREACH_DRAFT_INITIAL_STATE = Object.freeze({
  status: 'idle',
  content: '',
  error: '',
  assistantMessage: null,
  prompt: '',
});

const OUTREACH_INITIAL_FORM = {
  intent: OUTREACH_INTENTS[0].id,
  target: '',
  reason: '',
  timing: 'within 48 hours',
  context: '',
};

const CHAT_EMPTY_ACTIONS = Object.freeze([
  {
    title: 'Check medication safety',
    body: 'Collect medications, preview the backend request, then run the registered interaction checker.',
    prompt: 'Check for drug interactions between ',
    toolId: 'drug-check',
    icon: CHROME_ICONS.shield,
    kind: 'executor',
  },
  {
    title: 'Interpret labs',
    body: 'Enter lab values, preview the payload, then run the backend lab interpreter.',
    prompt: 'Interpret these lab results and flag critical values:',
    toolId: 'lab-interp',
    icon: CHROME_ICONS.microscope,
    kind: 'executor',
  },
  {
    title: 'Calculate SOFA',
    body: 'Collect available organ-system inputs and execute the SOFA calculator with confirmation.',
    prompt: 'Help me calculate a SOFA score using available ICU data.',
    toolId: 'sofa-score',
    icon: CHROME_ICONS.calculator,
    kind: 'executor',
  },
  {
    title: 'Plan outreach',
    body: 'Draft a follow-up plan for clinician review. Chat will not send or schedule anything.',
    prompt: 'Create a patient follow-up outreach plan for ',
    workflow: 'outreach',
    icon: CHROME_ICONS.messageCircle,
    kind: 'guided',
  },
  {
    title: 'Think through a case',
    body: 'Use free text for clinical reasoning, citations, and next-step suggestions.',
    prompt: 'Help me think through this patient presentation:',
    icon: CHROME_ICONS.stethoscope,
    kind: 'chat',
  },
]);

function getOutreachIntent(intentId) {
  return OUTREACH_INTENTS.find((intent) => intent.id === intentId) || OUTREACH_INTENTS[0];
}

function buildOutreachChatPrompt({ intent: intentId, target, reason, timing, context }) {
  const intent = getOutreachIntent(intentId);
  const contextLine = context?.trim() ? `Additional context: ${context.trim()}` : 'Additional context: none provided';
  return [
    'Create a lightweight outreach/follow-up planning draft for clinician review.',
    '',
    `Intent: ${intent.label}`,
    `Target/context: ${target.trim() || 'not specified yet'}`,
    `Reason for follow-up: ${reason.trim() || 'not specified yet'}`,
    `Timing/next step: ${timing}`,
    contextLine,
    '',
    'Use only this protected Chat response as a planning draft.',
    'Do not send any message, schedule outreach, write to an external system, or claim outreach has been completed.',
    'Return these sections: Draft message, Outreach plan, Clinician confirmation checklist, Verification/documentation steps, and Expected result state.',
  ].join('\n');
}

/**
 * Dashboard — clinical chat (full width). Tools open on dedicated /tools/* routes.
 * Legacy URLs `/dashboard?tool=…` and `/chat?tool=…` redirect through canonical routes.
 */
function Dashboard() {
  const { authToken, hasPermission, user } = useUser();
  const { error, success } = useNotificationActions();
  const toolPreferences = useToolPreferences();
  const { recordToolAccess } = toolPreferences;
  const {
    account,
    activeWorkspace,
    workspaceState,
    preferences,
    recordActivity,
    platformContext,
    memoryFabricContext,
    saasProfile,
    enabledAssetPacks,
    pinnedAssets,
    recentAssets,
  } = useUserIdentity();
  const {
    activeWorkspace: workspaceContextActive,
    assistantContext: activeWorkspaceAssistantContext,
    visibleAssetIds: workspaceVisibleAssetIds,
  } = useWorkspace();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [input, setInput] = useState('');
  const [selectedCitation, setSelectedCitation] = useState(null);
  const [sending, setSending] = useState(false);
  const [outreachDrawerOpen, setOutreachDrawerOpen] = useState(false);
  const [outreachForm, setOutreachForm] = useState(OUTREACH_INITIAL_FORM);
  const [outreachDraft, setOutreachDraft] = useState(OUTREACH_DRAFT_INITIAL_STATE);
  const [executionActions, setExecutionActions] = useState({});
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [capabilitySuggestions, setCapabilitySuggestions] = useState(() =>
    getChatCapabilitySuggestions({ hasPermission })
  );
  const scrollRef = useRef(null);
  const scrollEndRef = useRef(null);
  const composerInputRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);

  const {
    activeConversationId,
    messages,
    selectedTool,
    addMessage,
    selectTool,
    setActiveTool,
    clearTool,
  } = useConversation();

  const updateScrollStickiness = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const distanceFromBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 96;
  }, []);

  const scrollToConversationEnd = useCallback((behavior = 'smooth') => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior });
  }, []);

  const keepComposerVisible = useCallback(() => {
    if (!shouldStickToBottomRef.current) return;
    window.setTimeout(() => scrollToConversationEnd('smooth'), 80);
  }, [scrollToConversationEnd]);

  useEffect(() => {
    if (!shouldStickToBottomRef.current) return;
    const raf = window.requestAnimationFrame(() => scrollToConversationEnd('smooth'));
    return () => window.cancelAnimationFrame(raf);
  }, [messages, sending, scrollToConversationEnd]);

  useEffect(() => {
    const handleViewportChange = () => {
      if (!shouldStickToBottomRef.current) return;
      window.requestAnimationFrame(() => scrollToConversationEnd('auto'));
    };

    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
    };
  }, [scrollToConversationEnd]);

  const panelRegistryId = searchParams.get('tool');
  const selectedAgentId = searchParams.get('agent');
  const calcFromUrl = searchParams.get('calc');
  const isChatMode = location.pathname === '/chat' || location.pathname === '/assistant';
  const selectedToolEntry = selectedTool ? getToolById(selectedTool) : null;
  const activeConversationLabel = activeConversationId ? `Conversation ${activeConversationId}` : 'No conversation';
  const workspaceLabel =
    activeWorkspace?.branding?.displayName || activeWorkspace?.name || 'Personal workspace';
  const aiPreferenceLabel =
    preferences?.aiAssistantPreferences?.responseStyle || 'concise';
  const clinicianContextLabel = account?.specialty || account?.profession || account?.role || 'Clinical profile';
  const assistantProfileContext = useMemo(
    () =>
      buildUserToolProfile({
        account,
        user,
        preferences,
        activeWorkspace,
        activeWorkspaceId: workspaceState?.activeWorkspaceId,
        toolPreferences,
        permissions: workspaceState?.effectivePermissions || [],
        workspaceFocus: workspaceContextActive?.id,
      }),
    [
      account,
      activeWorkspace,
      preferences,
      toolPreferences,
      user,
      workspaceState?.activeWorkspaceId,
      workspaceState?.effectivePermissions,
      workspaceContextActive?.id,
    ]
  );
  const roleIntelligenceProfile = useMemo(
    () =>
      buildRoleIntelligenceProfile({
        account,
        user,
        preferences,
        activeWorkspace,
        workspaceState,
        toolPreferences,
        permissions: workspaceState?.effectivePermissions || [],
        profile: assistantProfileContext,
        platformContext,
      }),
    [
      account,
      activeWorkspace,
      assistantProfileContext,
      platformContext,
      preferences,
      toolPreferences,
      user,
      workspaceState,
    ]
  );
  const organizationAwareChatTools = useMemo(() => {
    if (!platformContext) return undefined;
    const workspaceAwarePlatformContext = {
      ...platformContext,
      legacyToolAliases: workspaceVisibleAssetIds?.length
        ? workspaceVisibleAssetIds
        : platformContext.legacyToolAliases,
    };
    return filterVisibleTools(getAssetAwareToolProjection(workspaceAwarePlatformContext, user?.role), {
      includeLocked: false,
      includeDemo: true,
    });
  }, [platformContext, user?.role, workspaceVisibleAssetIds]);
  const availableChatTools = useMemo(
    () =>
      getChatCapabilitySuggestions({
        hasPermission,
        profileContext: assistantProfileContext,
        tools: organizationAwareChatTools,
      })
        .filter((suggestion) => suggestion.kind === 'executor')
        .map((suggestion) => getToolById(suggestion.toolId))
        .filter(Boolean),
    [assistantProfileContext, hasPermission, organizationAwareChatTools]
  );
  const latestExecutionAction = useMemo(() => {
    const actions = Object.values(executionActions);
    return actions.length ? actions[actions.length - 1] : null;
  }, [executionActions]);
  const pulseActions = useMemo(
    () => [
      {
        title: 'Start clinical assessment',
        body: 'Ask Assistant with a structured case prompt and choose calculators, evidence, or documentation from there.',
        label: 'Start assessment',
        icon: CHROME_ICONS.stethoscope,
        prompt: 'Start a clinical assessment for this patient presentation:',
      },
      {
        title: 'Open calculators',
        body: 'Launch calculator workflows with safety copy, inputs, results, interpretation, and next-tool suggestions.',
        label: 'Open calculators',
        icon: CHROME_ICONS.calculator,
        path: '/tools/calculators',
      },
      {
        title: 'Differential assistant',
        body: 'Build and explain differential diagnoses from symptoms, history, labs, and context.',
        label: 'Build differential',
        icon: CHROME_ICONS.bot,
        path: '/tools/differential-ai',
      },
      {
        title: 'Drug checker',
        body: 'Guide a drug interaction check with structured context and reviewable output.',
        label: 'Check medications',
        icon: CHROME_ICONS.shield,
        path: '/tools/drug-checker',
      },
      {
        title: 'Documentation AI',
        body: 'Draft notes through protected AI documentation workflows while keeping clinician review explicit.',
        label: 'Draft documentation',
        icon: CHROME_ICONS.fileEdit,
        path: '/tools/ambient-scribe',
      },
      {
        title: 'Command dashboard',
        body: 'Review launch cards, fleet, maps, IoT, analytics, and system status from the main dashboard.',
        label: 'Open dashboard',
        icon: CHROME_ICONS.tools,
        path: '/dashboard',
      },
    ],
    []
  );
  const outreachPreview = useMemo(() => buildOutreachChatPrompt(outreachForm), [outreachForm]);
  const canDraftOutreach = Boolean(outreachForm.target.trim() && outreachForm.reason.trim());
  const canConfirmOutreach = outreachDraft.status === 'ready' && !sending;
  const latestOutreachPlan = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((msg) => msg.metadata?.outreachPlan?.status === 'confirmed'),
    [messages]
  );
  const latestVisibleContext = useMemo(() => {
    const parts = [];
    if (selectedToolEntry) {
      parts.push(`Current visible tool: ${selectedToolEntry.name}`);
    }
    const lastUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === 'user' && typeof msg.content === 'string' && msg.content.trim());
    if (lastUserMessage) {
      parts.push(`Recent visible Chat context: ${lastUserMessage.content.trim().slice(0, 600)}`);
    }
    return parts.join('\n');
  }, [messages, selectedToolEntry]);

  useEffect(() => {
    if (!panelRegistryId) {
      return;
    }
    const entry = toolRegistryById[panelRegistryId];
    if (!entry) {
      clearTool();
      navigate({ pathname: '/dashboard', search: '' }, { replace: true });
      return;
    }

    if (entry.id === 'calculators' && calcFromUrl) {
      setActiveTool(panelRegistryId);
      recordToolAccess(panelRegistryId);
      navigate(`/tools/calculators?calc=${encodeURIComponent(calcFromUrl)}`, { replace: true });
      return;
    }

    const plan = applyRegistryToolLaunch(panelRegistryId, {
      navigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess,
      replace: true,
      roleIntelligenceProfile,
    });

    if (plan.mode === 'chat-assisted') {
      navigate({ pathname: '/assistant', search: '' }, { replace: true });
    }
  }, [
    panelRegistryId,
    calcFromUrl,
    navigate,
    setActiveTool,
    recordToolAccess,
    clearTool,
    addMessage,
    selectTool,
    roleIntelligenceProfile,
  ]);

  const submitChatMessage = async (messageText) => {
    if (!messageText.trim() || sending) return false;
    const text = messageText.trim();
    shouldStickToBottomRef.current = true;
    addMessage(text, 'user');
    setInput('');
    setSending(true);

    try {
      recordActivity({
        category: 'ai_chat',
        label: selectedToolEntry ? `Assistant: ${selectedToolEntry.name}` : 'Assistant chat',
        route: '/assistant',
        metadata: {
          toolId: selectedToolEntry?.id,
          source: 'assistant',
        },
      });
      trackRoleAiRequest({
        profile: roleIntelligenceProfile,
        agentId: selectedAgentId,
        toolId: selectedToolEntry?.id || selectedTool,
        source: selectedToolEntry ? 'assistant-tool' : 'assistant',
      });
      const apiTool = registryIdToChatToolParam(selectedTool);
      const { ok, data } = await sendClinicalChatMessage({
        message: text,
        tool: apiTool,
        conversationId: activeConversationId,
        authToken,
        workspaceContext: {
          workspaceId: workspaceState?.activeWorkspaceId || activeWorkspace?.id,
          workspaceKey: workspaceContextActive?.id,
          label: workspaceContextActive?.name || workspaceLabel,
          assistantContext: activeWorkspaceAssistantContext,
          visibleAssetIds: workspaceVisibleAssetIds,
          saasProfile,
          organization: platformContext?.organization,
          role: saasProfile?.role || account?.role || user?.role,
          specialty: saasProfile?.specialty || account?.specialty,
          department: saasProfile?.department || account?.department,
          allowedAssets: workspaceVisibleAssetIds,
          enabledAssetPacks,
          recentAssets,
          pinnedAssets,
          permissions: workspaceState?.effectivePermissions || saasProfile?.permissions || [],
        },
        memoryContext: memoryFabricContext,
      });

      if (!ok) {
        throw new Error(data?.message || `Request failed`);
      }

      addMessage(mapChatResponseToAssistantMessage(data));
    } catch (err) {
      error('Message failed', err?.message || 'Failed to send message.');
      addMessage({
        role: 'assistant',
        content: 'Unable to reach the clinical AI service. Check your connection and try again.',
        timestamp: new Date(),
      });
    } finally {
      setSending(false);
    }
    return true;
  };

  const handleSendMessage = async () => {
    await submitChatMessage(input);
  };

  const handleSubmitMessage = (event) => {
    event.preventDefault();
    handleSendMessage();
  };

  const openOutreachPlanner = () => {
    setOutreachDrawerOpen(true);
  };

  const addExecutionAction = (toolOrId, source = 'chat') => {
    const action = createChatExecutionAction(toolOrId, { source });
    shouldStickToBottomRef.current = true;
    setExecutionActions((current) => ({ ...current, [action.id]: action }));
    recordActivity({
      category: 'tool',
      label: action.toolName,
      route: action.path || '/assistant',
      metadata: { toolId: action.registryId, source },
    });
    if (/workflow/i.test(`${action.registryId} ${action.toolId} ${action.toolName} ${action.path}`)) {
      trackRoleWorkflowLaunch({
        profile: roleIntelligenceProfile,
        workflowId: action.registryId || action.toolId,
        route: action.path || '/assistant',
        source,
      });
    }
    addMessage({
      role: 'assistant',
      content:
        action.mode === 'executable'
          ? `I can run ${action.toolName} here. Add the missing inputs, preview the request, then confirm execution.`
          : `${action.toolName} is available as a guided workflow. I will not run an unsupported backend action.`,
      metadata: { executionActionId: action.id, executionMode: action.mode },
      timestamp: new Date(),
    });
    selectTool(action.registryId);
    setActiveTool(action.registryId);
    navigate('/assistant');
    return action;
  };

  const updateExecutionAction = (actionId, patch) => {
    setExecutionActions((current) => ({
      ...current,
      [actionId]: {
        ...current[actionId],
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const handleExecutionParamChange = (actionId, field, value) => {
    setExecutionActions((current) => {
      const action = current[actionId];
      if (!action) return current;
      return {
        ...current,
        [actionId]: {
          ...action,
          status: ['preview', 'success', 'failure'].includes(action.status)
            ? 'collecting'
            : action.status,
          error: '',
          validation: null,
          result: null,
          normalizedParameters: null,
          parameters: {
            ...action.parameters,
            [field]: value,
          },
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const handleValidateExecutionAction = async (actionId) => {
    const action = executionActions[actionId];
    if (!action || action.mode !== 'executable') return;

    const inputIssue = getExecutionInputIssue(action);
    if (inputIssue) {
      updateExecutionAction(actionId, { status: 'collecting', error: inputIssue });
      return;
    }

    const parameters = buildExecutionParameters(action);
    updateExecutionAction(actionId, {
      status: 'validating',
      error: '',
      normalizedParameters: parameters,
    });

    try {
      const validation = await validateClinicalTool(action.toolId, parameters, { authToken });
      if (!validation.ok) {
        throw new Error(validation.error || 'Validation failed.');
      }

      updateExecutionAction(actionId, {
        status: validation.data?.valid === false ? 'collecting' : 'preview',
        validation: validation.data,
        error:
          validation.data?.valid === false
            ? validation.data?.errors?.join(', ') || 'Validation failed.'
            : '',
      });
    } catch (err) {
      updateExecutionAction(actionId, {
        status: 'failure',
        error: err?.message || 'Unable to validate this execution.',
      });
    }
  };

  const handleExecuteAction = async (actionId) => {
    const action = executionActions[actionId];
    if (!action || action.mode !== 'executable') return;

    const inputIssue = getExecutionInputIssue(action);
    if (inputIssue) {
      updateExecutionAction(actionId, { status: 'collecting', error: inputIssue });
      return;
    }

    const parameters = action.normalizedParameters || buildExecutionParameters(action);
    updateExecutionAction(actionId, {
      status: 'executing',
      error: '',
      normalizedParameters: parameters,
    });

    try {
      const execution = await executeClinicalTool(action.toolId, parameters, {
        authToken,
        conversationId: activeConversationId,
      });

      if (execution.unsupported) {
        updateExecutionAction(actionId, {
          status: 'failure',
          error: execution.message || 'This tool is not available for server execution.',
        });
        return;
      }

      if (!execution.ok) {
        throw new Error(execution.message || execution.errors?.[0] || 'Tool execution failed.');
      }

      const result = execution.raw?.result || {
        success: true,
        data: execution.data,
        errors: execution.errors || [],
        timestamp: new Date().toISOString(),
      };

      updateExecutionAction(actionId, {
        status: 'success',
        result,
        error: '',
      });

      addMessage({
        role: 'assistant',
        content: `${action.toolName} completed successfully.`,
        toolResult: {
          toolId: execution.toolId || action.toolId,
          toolName: execution.toolName || action.toolName,
          result,
        },
        metadata: {
          sourceExecutionActionId: actionId,
          executionStatus: 'success',
          parameters,
        },
        timestamp: new Date(),
      });
      success('Execution complete', `${action.toolName} finished successfully.`);
    } catch (err) {
      updateExecutionAction(actionId, {
        status: 'failure',
        error: err?.message || 'Unable to execute this tool.',
      });
      error('Execution failed', err?.message || 'Unable to execute this tool.');
    }
  };

  const handleRetryExecutionAction = (actionId) => {
    const action = executionActions[actionId];
    if (!action) return;
    if (action.normalizedParameters) {
      updateExecutionAction(actionId, { status: 'preview', error: '' });
      window.requestAnimationFrame(() => handleExecuteAction(actionId));
    } else {
      handleValidateExecutionAction(actionId);
    }
  };

  const handleEditExecutionAction = (actionId) => {
    updateExecutionAction(actionId, {
      status: 'collecting',
      error: '',
      validation: null,
      result: null,
    });
  };

  const handleOpenExecutionTool = (action) => {
    if (!action?.path) return;
    if (action.registryId) {
      recordToolAccess(action.registryId);
      selectTool(action.registryId);
      setActiveTool(action.registryId);
    }
    navigate(action.path);
  };

  const handleUseGuidedExecution = (action) => {
    if (action.registryId) {
      selectTool(action.registryId);
      setActiveTool(action.registryId);
    }
    if (action.chatSeed) {
      setInput(action.chatSeed);
      navigate('/assistant');
      window.requestAnimationFrame(() => composerInputRef.current?.focus());
    }
  };

  const handleStarterPrompt = (starter) => {
    if (starter.workflow === 'outreach') {
      if (!isChatMode) {
        openOutreachPlanner();
        return;
      }
      openSensitiveActionConfirmation(
        {
          id: 'follow-up-planning',
          label: starter.title,
          confirmation: CHAT_SENSITIVE_CONFIRMATIONS['follow-up-planning'],
        },
        openOutreachPlanner
      );
      return;
    }
    if (starter.toolId) {
      setInput(starter.prompt);
      addExecutionAction(starter.toolId, 'starter');
      return;
    }
    setInput(starter.prompt);
    window.requestAnimationFrame(() => composerInputRef.current?.focus());
  };

  const openChatWithPrompt = (prompt) => {
    setInput(prompt);
    navigate('/assistant');
    window.requestAnimationFrame(() => composerInputRef.current?.focus());
  };

  const handlePulseAction = (action) => {
    if (action.workflow === 'outreach') {
      openOutreachPlanner();
      return;
    }
    if (action.prompt) {
      openChatWithPrompt(action.prompt);
      return;
    }
    navigate(action.path);
  };

  const updateOutreachField = (field, value) => {
    setOutreachForm((current) => ({ ...current, [field]: value }));
    setOutreachDraft(OUTREACH_DRAFT_INITIAL_STATE);
  };

  const applyVisibleContextToOutreach = () => {
    if (!latestVisibleContext) return;
    updateOutreachField('context', latestVisibleContext);
  };

  const handleDraftOutreach = async () => {
    if (!canDraftOutreach || outreachDraft.status === 'loading') return;

    setOutreachDraft({
      ...OUTREACH_DRAFT_INITIAL_STATE,
      status: 'loading',
      prompt: outreachPreview,
    });

    try {
      trackRoleAiRequest({
        profile: roleIntelligenceProfile,
        source: 'outreach-draft',
        route: '/assistant',
      });
      const { ok, data } = await sendClinicalChatMessage({
        message: outreachPreview,
        conversationId: activeConversationId,
        authToken,
        workspaceContext: {
          workspaceId: workspaceState?.activeWorkspaceId || activeWorkspace?.id,
          workspaceKey: workspaceContextActive?.id,
          label: workspaceContextActive?.name || workspaceLabel,
          assistantContext: activeWorkspaceAssistantContext,
          saasProfile,
          organization: platformContext?.organization,
          role: saasProfile?.role || account?.role || user?.role,
          specialty: saasProfile?.specialty || account?.specialty,
          department: saasProfile?.department || account?.department,
          allowedAssets: workspaceVisibleAssetIds,
          enabledAssetPacks,
          recentAssets,
          pinnedAssets,
          permissions: workspaceState?.effectivePermissions || saasProfile?.permissions || [],
        },
        memoryContext: memoryFabricContext,
      });

      if (!ok) {
        throw new Error(data?.message || 'Unable to draft outreach plan');
      }

      const assistantMessage = mapChatResponseToAssistantMessage(data);
      setOutreachDraft({
        status: 'ready',
        content: assistantMessage.content,
        error: '',
        assistantMessage,
        prompt: outreachPreview,
      });
    } catch (err) {
      const message = err?.message || 'Failed to draft outreach plan.';
      error('Outreach draft failed', message);
      setOutreachDraft({
        ...OUTREACH_DRAFT_INITIAL_STATE,
        status: 'error',
        error: message,
        prompt: outreachPreview,
      });
    }
  };

  const handleConfirmOutreach = () => {
    if (!canConfirmOutreach || !outreachDraft.assistantMessage) return;

    const createdAt = new Date().toISOString();
    const intent = getOutreachIntent(outreachForm.intent);
    const outreachPlan = {
      status: 'confirmed',
      intent: intent.label,
      target: outreachForm.target.trim(),
      reason: outreachForm.reason.trim(),
      timing: outreachForm.timing,
      createdAt,
    };

    addMessage({
      role: 'user',
      content: [
        `Confirmed outreach planning (${intent.label}).`,
        `Target/context: ${outreachPlan.target}`,
        `Reason: ${outreachPlan.reason}`,
        `Timing/next step: ${outreachPlan.timing}`,
        'Verification: Chat drafted this plan only; no external message was sent or scheduled.',
      ].join('\n'),
      metadata: { outreachPlan },
      timestamp: new Date(createdAt),
    });
    addMessage({
      ...outreachDraft.assistantMessage,
      metadata: {
        ...(outreachDraft.assistantMessage.metadata || {}),
        outreachPlan,
      },
      timestamp: new Date(createdAt),
    });

    setOutreachDrawerOpen(false);
    setOutreachForm(OUTREACH_INITIAL_FORM);
    setOutreachDraft(OUTREACH_DRAFT_INITIAL_STATE);
    navigate('/assistant');
  };

  const openSensitiveActionConfirmation = (suggestion, onConfirm) => {
    const confirmation = suggestion.confirmation || CHAT_SENSITIVE_CONFIRMATIONS[suggestion.id];
    if (!confirmation) {
      onConfirm();
      return;
    }

    setPendingConfirmation({
      suggestion,
      confirmation,
      onConfirm,
      blocked:
        confirmation.requiredPermission && !hasPermission(confirmation.requiredPermission)
          ? `Blocked: ${confirmation.authRequirement}`
          : '',
    });
  };

  const recommendationSource = useMemo(() => {
    if (input.trim()) return input.trim();
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    return lastUser?.content || '';
  }, [input, messages]);

  useEffect(() => {
    let cancelled = false;
    const cancelIdleWork = scheduleIdleWork(() => {
      if (cancelled) return;
      setCapabilitySuggestions(
        getChatCapabilitySuggestions({
          input: recommendationSource,
          hasPermission,
          profileContext: assistantProfileContext,
          tools: organizationAwareChatTools,
          workspaceContext: {
            activeWorkspaceId: workspaceState?.activeWorkspaceId || activeWorkspace?.id,
            workspaceKey: workspaceContextActive?.id,
            label: workspaceContextActive?.name || workspaceLabel,
            assistantContext: activeWorkspaceAssistantContext,
            visibleAssetIds: workspaceVisibleAssetIds,
          },
          recentToolIds: toolPreferences.recentTools || [],
        })
      );
    }, { timeout: 500 });

    return () => {
      cancelled = true;
      cancelIdleWork?.();
    };
  }, [
    activeWorkspace?.id,
    assistantProfileContext,
    hasPermission,
    organizationAwareChatTools,
    activeWorkspaceAssistantContext,
    recommendationSource,
    toolPreferences.recentTools,
    workspaceContextActive?.id,
    workspaceContextActive?.name,
    workspaceVisibleAssetIds,
    workspaceLabel,
    workspaceState?.activeWorkspaceId,
  ]);

  useEffect(() => {
    if (capabilitySuggestions.length > 0) {
      analyticsService.trackEvent({
        eventName: 'chat_capability_suggestions_shown',
        parameters: {
          count: capabilitySuggestions.length,
          source: recommendationSource.slice(0, 120),
        },
      });
    }
  }, [capabilitySuggestions, recommendationSource]);

  const performCapabilitySuggestion = (suggestion) => {
    analyticsService.trackEvent({
      eventName: 'chat_capability_suggestion_clicked',
      parameters: {
        suggestionId: suggestion.id,
        kind: suggestion.kind,
        source: suggestion.source,
      },
    });

    if (suggestion.kind === 'executor') {
      const entry = getToolById(suggestion.toolId);
      if (entry) addExecutionAction(entry, 'capability-suggestion');
      return;
    }

    if (suggestion.action === 'openOutreachPlanner') {
      openOutreachPlanner();
      return;
    }

    if (suggestion.prompt) {
      setInput(suggestion.prompt);
      window.requestAnimationFrame(() => composerInputRef.current?.focus());
      return;
    }

    if (suggestion.path) {
      navigate(suggestion.path);
    }
  };

  const handleCapabilitySuggestion = (suggestion) => {
    openSensitiveActionConfirmation(suggestion, () => performCapabilitySuggestion(suggestion));
  };

  const confirmPendingAction = () => {
    if (pendingConfirmation?.blocked) return;
    const action = pendingConfirmation?.onConfirm;
    setPendingConfirmation(null);
    action?.();
  };

  return (
    <div className="dashboard-root">
      <div className="dashboard-main">
        <header className="dashboard-chat-header" aria-labelledby="dashboard-chat-title">
          <div className="dashboard-chat-header__identity">
            <div className="dashboard-chat-header__icon" aria-hidden>
              <NavIcon icon={isChatMode ? CHROME_ICONS.bot : CHROME_ICONS.barChart} size={22} />
            </div>
            <div>
              <p className="dashboard-chat-eyebrow">
                {isChatMode ? 'Assistant = act with guidance' : 'Home = see what matters'}
              </p>
              <h1 id="dashboard-chat-title" className="dashboard-chat-title">
                {isChatMode ? 'CareDroid Assistant' : 'Home'}
              </h1>
            </div>
          </div>
          <div className="dashboard-chat-header__status" aria-label="Chat context and workspace status">
            <div className="dashboard-header-group" aria-label="Current context">
              <span className="dashboard-header-group__label">Context</span>
              <span className="dashboard-context-pill">{activeConversationLabel}</span>
              <span className="dashboard-context-pill dashboard-context-pill--profile">
                {clinicianContextLabel}
              </span>
              {selectedToolEntry && (
                <span className="dashboard-context-pill dashboard-context-pill--tool">
                  <NavIcon icon={getToolIcon(selectedToolEntry.id)} size={14} aria-hidden />
                  {selectedToolEntry.name}
                </span>
              )}
            </div>
            <div className="dashboard-header-group" aria-label="Workspace status">
              <span className="dashboard-header-group__label">Workspace</span>
              <span className="dashboard-context-pill">{workspaceLabel}</span>
              <span className="dashboard-context-pill dashboard-context-pill--online">
                <NavIcon icon={CHROME_ICONS.checkCircle} size={14} aria-hidden />
                Online
              </span>
              <span className="dashboard-context-pill">AI: {aiPreferenceLabel}</span>
            </div>
            <div className="dashboard-header-group" aria-label="Available tools">
              <span className="dashboard-header-group__label">Available tools</span>
              <div className="dashboard-header-tools">
                {availableChatTools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className="dashboard-header-tool"
                    onClick={() => addExecutionAction(tool, 'header')}
                  >
                    <NavIcon icon={getToolIcon(tool.id)} size={14} aria-hidden />
                    {tool.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div
          ref={scrollRef}
          className={`dashboard-scroll app-scroll-container${messages.length === 0 && !sending ? ' dashboard-scroll--empty' : ''}`}
          onScroll={updateScrollStickiness}
        >
          {!isChatMode && latestOutreachPlan && (
            <section className="dashboard-today-card" aria-label="Today outreach planning">
              <div>
                <p className="dashboard-today-card__eyebrow">Today</p>
                <h2 className="dashboard-today-card__title">Outreach plan ready for verification</h2>
                <p className="dashboard-today-card__body">
                  {latestOutreachPlan.metadata.outreachPlan.intent} for{' '}
                  {latestOutreachPlan.metadata.outreachPlan.target}. No external message was sent or
                  scheduled.
                </p>
              </div>
              <button
                type="button"
                className="dashboard-today-card__action"
                onClick={() => navigate('/assistant')}
              >
                Verify in Chat
              </button>
            </section>
          )}

          {!isChatMode && <ProfileToolGraphCard />}

          {messages.length === 0 ? (
            <div className="dashboard-empty">
              <div className="dashboard-empty-icon" aria-hidden>
                <NavIcon icon={isChatMode ? CHROME_ICONS.hospital : CHROME_ICONS.barChart} size={48} />
              </div>
              <div className="dashboard-empty-inner">
                <div className="dashboard-empty-title">
                  {isChatMode ? 'CareDroid Assistant' : 'Start with what matters'}
                </div>
                <div className="dashboard-empty-copy">
                  {isChatMode
                    ? 'Chat can reason over free text, suggest next actions, collect missing inputs, preview tool execution, confirm risky steps, and show structured results.'
                    : 'Review priority items, choose the next action, then use Chat to preview, confirm, and verify the result.'}
                </div>
                {isChatMode ? (
                  <>
                    <div className="dashboard-empty-capabilities" aria-label="What Chat can do">
                      <span>Free-text clinical questions</span>
                      <span>Suggested follow-up actions</span>
                      <span>Validated executor previews</span>
                      <span>Confirmation before execution</span>
                      <span>Structured result cards</span>
                    </div>
                    <div className="dashboard-empty-section-title">Start with...</div>
                    <div className="dashboard-starter-grid" aria-label="Starter prompts">
                      {CHAT_EMPTY_ACTIONS.slice(0, 4).map((starter) => (
                        <button
                          key={starter.title}
                          type="button"
                          className="dashboard-starter-card"
                          aria-label={starter.title}
                          onClick={() => handleStarterPrompt(starter)}
                        >
                          <span className="dashboard-starter-card__icon" aria-hidden>
                            <NavIcon icon={starter.icon} size={18} />
                          </span>
                          <span className="dashboard-starter-card__title">{starter.title}</span>
                          <span className="dashboard-starter-card__body">{starter.body}</span>
                          <span className="dashboard-starter-card__prompt">{starter.prompt}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="dashboard-pulse-grid" aria-label="Priority actions">
                    {pulseActions.map((action) => (
                      <button
                        key={action.title}
                        type="button"
                        className="dashboard-pulse-card"
                        aria-label={action.title}
                        onClick={() => handlePulseAction(action)}
                      >
                        <span className="dashboard-pulse-card__icon" aria-hidden>
                          <NavIcon icon={action.icon} size={18} />
                        </span>
                        <span className="dashboard-pulse-card__title">{action.title}</span>
                        <span className="dashboard-pulse-card__body">{action.body}</span>
                        <span className="dashboard-pulse-card__action">{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const recoveryActionId = msg.metadata?.sourceExecutionActionId;
              const canRecoverExecution = recoveryActionId && executionActions[recoveryActionId];
              const aiFoundation = msg.aiFoundation || msg.metadata?.aiFoundation;
              const visualizations = Array.isArray(msg.visualizations)
                ? msg.visualizations.filter((viz) => !(msg.toolResult && viz?.type === 'tool-result'))
                : [];

              return (
                <div
                  key={msg.id}
                  className={`dashboard-msg-row ${
                    msg.role === 'user' ? 'dashboard-msg-row--user' : 'dashboard-msg-row--assistant'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="dashboard-msg-avatar" aria-hidden>
                      <NavIcon icon={CHROME_ICONS.bot} size={20} />
                    </div>
                  )}
                  <div
                    className={`dashboard-msg-bubble ${
                      msg.role === 'user' ? 'dashboard-msg-bubble--user' : 'dashboard-msg-bubble--assistant'
                    }`}
                  >
                    {msg.role === 'assistant' && msg.confidence !== undefined && (
                      <div className="dashboard-msg-meta">
                        <ConfidenceBadge confidence={msg.confidence} />
                      </div>
                    )}
                    {msg.role === 'assistant' && (
                      <button
                        type="button"
                        className="dashboard-explain-btn"
                        onClick={() =>
                          navigate({
                            pathname: '/tools/ai-explainability',
                            search: `?q=${encodeURIComponent(String(msg.content || '').slice(0, 240))}`,
                          })
                        }
                      >
                        Explain
                      </button>
                    )}
                    {msg.role === 'assistant' && aiFoundation && (
                      <AiRouteMetadata
                        aiFoundation={aiFoundation}
                        routePlan={msg.metadata?.routePlan}
                        aiGateway={msg.aiGateway || msg.metadata?.aiGateway}
                      />
                    )}
                    <div className="dashboard-msg-body">{msg.content}</div>
                    {msg.toolResult && (
                      <OperationalResultCard
                        toolResult={msg.toolResult}
                        parameters={msg.metadata?.parameters}
                        timestamp={msg.timestamp}
                        followUpSuggestions={msg.suggestions}
                        onRetry={
                          canRecoverExecution ? () => handleRetryExecutionAction(recoveryActionId) : undefined
                        }
                        onEdit={
                          canRecoverExecution ? () => handleEditExecutionAction(recoveryActionId) : undefined
                        }
                      />
                    )}
                    {visualizations.length > 0 && (
                      <div className="dashboard-msg-viz">
                        {visualizations.map((viz, idx) => (
                          <ToolVisualization key={`${viz.type || 'viz'}-${idx}`} visualization={viz} />
                        ))}
                      </div>
                    )}
                    {msg.citations && msg.citations.length > 0 && msg.role === 'assistant' && (
                      <Citations citations={msg.citations} onViewDetails={(c) => setSelectedCitation(c)} />
                    )}
                    {msg.metadata?.executionActionId && executionActions[msg.metadata.executionActionId] && (
                      <div className="dashboard-execution-slot" aria-label="Execution card">
                        <ChatExecutionCard
                          action={executionActions[msg.metadata.executionActionId]}
                          onChangeParam={handleExecutionParamChange}
                          onValidate={handleValidateExecutionAction}
                          onExecute={handleExecuteAction}
                          onRetry={handleRetryExecutionAction}
                          onEdit={handleEditExecutionAction}
                          onOpenTool={handleOpenExecutionTool}
                          onUseGuidedChat={handleUseGuidedExecution}
                        />
                      </div>
                    )}
                    {Array.isArray(msg.suggestions) && msg.suggestions.length > 0 && (
                      <div className="dashboard-msg-suggestions" aria-label="Suggested follow-up actions">
                        {msg.suggestions.slice(0, 4).map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              setInput(suggestion);
                              window.requestAnimationFrame(() => composerInputRef.current?.focus());
                            }}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="dashboard-msg-avatar" aria-hidden>
                      <NavIcon icon={CHROME_ICONS.user} size={20} />
                    </div>
                  )}
                </div>
              );
            })
          )}
          {sending && (
            <div className="dashboard-thinking">
              <div className="dashboard-msg-avatar" aria-hidden>
                <NavIcon icon={CHROME_ICONS.bot} size={20} />
              </div>
              <div className="dashboard-msg-thinking">Thinking…</div>
            </div>
          )}
          <div ref={scrollEndRef} aria-hidden />
        </div>

        <div className="dashboard-composer">
          <div className="dashboard-action-rail" aria-label="Suggested actions">
            <div className="dashboard-action-rail__meta">
              <span className="dashboard-recs-label">Suggested actions</span>
              {latestExecutionAction && (
                <span className="dashboard-action-rail__status">
                  Execution: {latestExecutionAction.toolName} · {latestExecutionAction.status}
                </span>
              )}
            </div>
            <div className="dashboard-recs-row">
              {capabilitySuggestions.slice(0, 7).map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className={`dashboard-action-chip dashboard-action-chip--${suggestion.kind}`}
                  onClick={() => handleCapabilitySuggestion(suggestion)}
                  disabled={sending && suggestion.kind === 'executor'}
                  title={suggestion.description}
                >
                  <NavIcon icon={suggestion.icon} size={16} aria-hidden />
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
          <div className="dashboard-composer-actions" aria-label="Composer actions">
            <button
              type="button"
              className="dashboard-guided-action"
              onClick={() => {
                if (!isChatMode) {
                  openOutreachPlanner();
                  return;
                }
                openSensitiveActionConfirmation(
                  {
                    id: 'follow-up-planning',
                    label: 'Plan follow-up',
                    confirmation: CHAT_SENSITIVE_CONFIRMATIONS['follow-up-planning'],
                  },
                  openOutreachPlanner
                );
              }}
              disabled={sending}
            >
              <NavIcon icon={CHROME_ICONS.messageCircle} size={16} aria-hidden />
              Plan outreach
            </button>
          </div>
          <form className="dashboard-input-row" onSubmit={handleSubmitMessage}>
            <textarea
              ref={composerInputRef}
              className="dashboard-input"
              value={input}
              onFocus={keepComposerVisible}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ask anything clinical…"
              disabled={sending}
              rows={1}
              aria-label="Clinical chat message"
            />
            <button
              type="submit"
              className="dashboard-send"
              disabled={sending || !input.trim()}
            >
              Send
            </button>
          </form>
          <p className="dashboard-disclaimer">
            Decision support only. Verify recommendations against local protocols and clinician judgment.
          </p>
        </div>
      </div>

      {selectedCitation && (
        <CitationModal citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
      )}

      <Drawer
        isOpen={Boolean(pendingConfirmation)}
        onClose={() => setPendingConfirmation(null)}
        side="right"
        size="md"
        title={pendingConfirmation?.confirmation?.title || 'Confirm sensitive action'}
        className="dashboard-confirmation-drawer"
        footer={
          <div className="dashboard-confirmation-footer">
            <button
              type="button"
              className="dashboard-outreach-secondary"
              onClick={() => setPendingConfirmation(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="dashboard-outreach-primary"
              onClick={confirmPendingAction}
              disabled={Boolean(pendingConfirmation?.blocked)}
            >
              Confirm and continue
            </button>
          </div>
        }
      >
        {pendingConfirmation && (
          <div className="dashboard-confirmation">
            <div className="dashboard-confirmation-alert" role="status">
              <NavIcon icon={CHROME_ICONS.shield} size={18} aria-hidden />
              <div>
                <strong>{pendingConfirmation.confirmation.sensitivity}</strong>
                <p>Backend authorization and validation remain unchanged. This is an added Chat safety step.</p>
              </div>
            </div>

            <dl className="dashboard-confirmation-list">
              <div>
                <dt>What will happen</dt>
                <dd>{pendingConfirmation.confirmation.whatWillHappen}</dd>
              </div>
              <div>
                <dt>Affected data</dt>
                <dd>{pendingConfirmation.confirmation.affectedData}</dd>
              </div>
              <div>
                <dt>Reversible?</dt>
                <dd>{pendingConfirmation.confirmation.reversible}</dd>
              </div>
              <div>
                <dt>Auth or role requirement</dt>
                <dd>{pendingConfirmation.confirmation.authRequirement}</dd>
              </div>
              {pendingConfirmation.suggestion?.source && (
                <div>
                  <dt>Source or route</dt>
                  <dd>
                    <code>{pendingConfirmation.suggestion.source}</code>
                  </dd>
                </div>
              )}
            </dl>

            {pendingConfirmation.blocked && (
              <p className="dashboard-confirmation-blocked">{pendingConfirmation.blocked}</p>
            )}
          </div>
        )}
      </Drawer>

      <Drawer
        isOpen={outreachDrawerOpen}
        onClose={() => setOutreachDrawerOpen(false)}
        side="right"
        size="lg"
        title="Plan follow-up outreach"
        className="dashboard-outreach-drawer"
        footer={
          <div className="dashboard-outreach-footer">
            <button
              type="button"
              className="dashboard-outreach-secondary"
              disabled={outreachDraft.status === 'loading'}
              onClick={() => {
                setOutreachForm(OUTREACH_INITIAL_FORM);
                setOutreachDraft(OUTREACH_DRAFT_INITIAL_STATE);
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="dashboard-outreach-secondary"
              disabled={!canDraftOutreach || outreachDraft.status === 'loading'}
              onClick={handleDraftOutreach}
            >
              {outreachDraft.status === 'loading' ? 'Drafting with Chat...' : 'Draft preview with Chat'}
            </button>
            <button
              type="button"
              className="dashboard-outreach-primary"
              disabled={!canConfirmOutreach}
              onClick={handleConfirmOutreach}
            >
              Confirm creation
            </button>
          </div>
        }
      >
        <div className="dashboard-outreach">
          <p className="dashboard-outreach-copy">
            Build a reviewable outreach plan through the existing protected Chat route. No outreach
            message will be sent, scheduled, or documented automatically.
          </p>

          <div className="dashboard-outreach-steps" aria-label="Outreach workflow steps">
            {['Start', 'Choose intent', 'Add context', 'Draft via Chat', 'Preview', 'Confirm', 'Verify'].map(
              (step) => (
                <span key={step} className="dashboard-outreach-step">
                  {step}
                </span>
              )
            )}
          </div>

          <fieldset className="dashboard-outreach-intents">
            <legend>Choose intent</legend>
            <div className="dashboard-outreach-intent-grid">
              {OUTREACH_INTENTS.map((intent) => (
                <label
                  key={intent.id}
                  className={`dashboard-outreach-intent-card${
                    outreachForm.intent === intent.id ? ' dashboard-outreach-intent-card--selected' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="outreach-intent"
                    value={intent.id}
                    checked={outreachForm.intent === intent.id}
                    onChange={(event) => updateOutreachField('intent', event.target.value)}
                  />
                  <span className="dashboard-outreach-intent-card__label">{intent.label}</span>
                  <span className="dashboard-outreach-intent-card__desc">{intent.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="dashboard-outreach-field">
            <span>Target/context</span>
            <input
              value={outreachForm.target}
              onChange={(event) => updateOutreachField('target', event.target.value)}
              placeholder="Example: Mrs. A after ED discharge for pneumonia"
            />
          </label>

          <label className="dashboard-outreach-field">
            <span>Follow-up reason</span>
            <input
              value={outreachForm.reason}
              onChange={(event) => updateOutreachField('reason', event.target.value)}
              placeholder="Example: symptom check, med adherence, return precautions"
            />
          </label>

          <label className="dashboard-outreach-field">
            <span>Timing or next step</span>
            <select
              value={outreachForm.timing}
              onChange={(event) => updateOutreachField('timing', event.target.value)}
            >
              <option value="today">Today</option>
              <option value="within 48 hours">Within 48 hours</option>
              <option value="within 1 week">Within 1 week</option>
              <option value="at next scheduled visit">At next scheduled visit</option>
            </select>
          </label>

          <section className="dashboard-outreach-visible-context">
            <div>
              <div className="dashboard-outreach-preview-heading">Existing visible context</div>
              <p>
                Use the latest visible Chat/tool context as optional background, or keep the plan fully
                manual.
              </p>
            </div>
            <button
              type="button"
              className="dashboard-outreach-secondary"
              disabled={!latestVisibleContext}
              onClick={applyVisibleContextToOutreach}
            >
              Use latest visible context
            </button>
          </section>

          <label className="dashboard-outreach-field">
            <span>Optional clinical context</span>
            <textarea
              value={outreachForm.context}
              onChange={(event) => updateOutreachField('context', event.target.value)}
              placeholder="Add relevant constraints, safety notes, language needs, or verification requirements."
              rows={4}
            />
          </label>

          <section className="dashboard-outreach-preview-section">
            <div className="dashboard-outreach-preview-heading">Chat-drafted plan preview</div>
            <div className="dashboard-outreach-draft-preview" aria-label="Outreach plan preview">
              {outreachDraft.status === 'idle' && (
                <p>Choose an intent, add the required context, then draft a preview through Chat.</p>
              )}
              {outreachDraft.status === 'loading' && <p>Drafting through protected Chat...</p>}
              {outreachDraft.status === 'error' && (
                <p className="dashboard-outreach-error">{outreachDraft.error}</p>
              )}
              {outreachDraft.status === 'ready' && <div>{outreachDraft.content}</div>}
            </div>
            <details className="dashboard-outreach-prompt-details">
              <summary>Prompt sent through Chat</summary>
              <pre className="dashboard-outreach-preview" aria-label="Outreach Chat prompt preview">
                {outreachPreview}
              </pre>
            </details>
          </section>
        </div>
      </Drawer>
    </div>
  );
}

export default Dashboard;
