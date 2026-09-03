/**
 * Closed-catalog prompt → navigate / open tool / open panel.
 *
 * Free-text prompts never invent routes. Only known catalog entries can produce
 * an open_route | open_tool | open_panel proposal. Unknown text falls through
 * to normal Interactive AI chat assist.
 */

import { CANONICAL_ROUTES } from '../../config/routes.config';
import type { AiRiskLevel } from '../../contracts/interactiveAi';
import type { AIActionProposal } from '../../contracts/interactiveAi';
import type { CreateActionProposalInput } from './actionProposalApi';

export type PromptNavigationToolName = 'open_route' | 'open_tool' | 'open_panel';

export type PromptNavigationIntent = {
  id: string;
  toolName: PromptNavigationToolName;
  label: string;
  previewSummary: string;
  expectedEffect: string;
  riskLevel: AiRiskLevel;
  requiredPermission: string;
  /** When false, Approve can execute from proposed (low-risk open). Default true for clinical tools. */
  requiresApproval: boolean;
  /** Route path for open_route / open_tool */
  path?: string;
  /** document event name for open_panel */
  panelEvent?: string;
  panelId?: string;
  keywords: readonly string[];
  /** Roles that must never see this intent (e.g. clinical calculators for registration clerk). */
  deniedRoles?: readonly string[];
  clinicalOnly?: boolean;
};

export type ResolvePromptNavigationOptions = {
  role?: string;
  permissions?: readonly string[];
};

const NAV_VERBS = /\b(open|show|launch|go to|take me to|navigate to|bring up|switch to|pull up)\b/i;

/** High-value closed catalog — extend carefully; never accept model-invented paths. */
const CATALOG: readonly PromptNavigationIntent[] = Object.freeze([
  {
    id: 'nav-reception',
    toolName: 'open_route',
    label: 'Open Reception desk',
    previewSummary: 'Open the Reception desk workspace.',
    expectedEffect: 'Navigate to the emergency reception desk.',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: CANONICAL_ROUTES.emergencyReception,
    keywords: ['reception', 'reception desk', 'front desk', 'check in', 'check-in'],
  },
  {
    id: 'nav-whiteboard',
    toolName: 'open_route',
    label: 'Open Whiteboard',
    previewSummary: 'Open the emergency department whiteboard.',
    expectedEffect: 'Navigate to the ED operational whiteboard.',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: CANONICAL_ROUTES.emergencyWhiteboard,
    keywords: ['whiteboard', 'board', 'ed board', 'patient board'],
  },
  {
    id: 'nav-patients',
    toolName: 'open_route',
    label: 'Open Patients',
    previewSummary: 'Open the emergency patients list.',
    expectedEffect: 'Navigate to the emergency patients surface.',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: CANONICAL_ROUTES.emergencyPatients,
    keywords: ['patients', 'patient list', 'patient roster'],
  },
  {
    id: 'nav-ems',
    toolName: 'open_route',
    label: 'Open EMS',
    previewSummary: 'Open the EMS pre-arrival pipeline.',
    expectedEffect: 'Navigate to the EMS surface.',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: CANONICAL_ROUTES.emergencyEms,
    keywords: ['ems', 'ambulance', 'pre-arrival', 'prearrival'],
  },
  {
    id: 'nav-queues',
    toolName: 'open_route',
    label: 'Open Queues',
    previewSummary: 'Open emergency queues / who-next.',
    expectedEffect: 'Navigate to emergency queues.',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: CANONICAL_ROUTES.emergencyQueues,
    keywords: ['queues', 'queue', 'who next', 'waiting list'],
  },
  {
    id: 'nav-intake',
    toolName: 'open_route',
    label: 'Open Smart Intake',
    previewSummary: 'Open Smart Intake for walk-in / identity / OCR.',
    expectedEffect: 'Navigate to emergency smart intake.',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: CANONICAL_ROUTES.emergencyIntake,
    keywords: ['smart intake', 'intake page', 'standalone intake'],
  },
  {
    id: 'nav-tools',
    toolName: 'open_route',
    label: 'Open Medical Tools',
    previewSummary: 'Open the medical tools / calculators surface.',
    expectedEffect: 'Navigate to emergency tools.',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: CANONICAL_ROUTES.emergencyTools,
    keywords: ['medical tools', 'clinical tools', 'tools page', 'tools hub'],
  },
  {
    id: 'nav-calculators',
    toolName: 'open_tool',
    label: 'Open Calculators',
    previewSummary: 'Open clinical calculators.',
    expectedEffect: 'Navigate to calculators on the tools surface.',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: `${CANONICAL_ROUTES.emergencyTools}?source=calculators&filter=calculator`,
    keywords: ['calculators', 'clinical calculators', 'scores'],
    clinicalOnly: true,
    deniedRoles: ['registration_clerk', 'registration-clerk', 'clerk'],
  },
  {
    id: 'nav-heart-score',
    toolName: 'open_tool',
    label: 'Open HEART Score',
    previewSummary: 'Open the HEART score calculator.',
    expectedEffect: 'Navigate to HEART score on the tools surface.',
    riskLevel: 'moderate',
    requiredPermission: 'view_phi',
    requiresApproval: true,
    path: `${CANONICAL_ROUTES.emergencyTools}?source=calculators&filter=calculator&q=heart-score&open=heart-score`,
    keywords: ['heart score', 'heart-score', 'heart calculator', 'acs score'],
    clinicalOnly: true,
    deniedRoles: ['registration_clerk', 'registration-clerk', 'clerk'],
  },
  {
    id: 'nav-qsofa',
    toolName: 'open_tool',
    label: 'Open qSOFA',
    previewSummary: 'Open the qSOFA sepsis calculator.',
    expectedEffect: 'Navigate to qSOFA on the tools surface.',
    riskLevel: 'moderate',
    requiredPermission: 'view_phi',
    requiresApproval: true,
    path: `${CANONICAL_ROUTES.emergencyTools}?source=calculators&filter=calculator&q=qsofa&open=qsofa`,
    keywords: ['qsofa', 'q-sofa', 'quick sofa', 'sepsis score'],
    clinicalOnly: true,
    deniedRoles: ['registration_clerk', 'registration-clerk', 'clerk'],
  },
  {
    id: 'nav-nihss',
    toolName: 'open_tool',
    label: 'Open NIHSS',
    previewSummary: 'Open the NIHSS stroke scale.',
    expectedEffect: 'Navigate to NIHSS on the tools surface.',
    riskLevel: 'moderate',
    requiredPermission: 'view_phi',
    requiresApproval: true,
    path: `${CANONICAL_ROUTES.emergencyTools}?source=calculators&filter=calculator&q=nihss&open=nihss`,
    keywords: ['nihss', 'stroke scale', 'stroke score'],
    clinicalOnly: true,
    deniedRoles: ['registration_clerk', 'registration-clerk', 'clerk'],
  },
  {
    id: 'nav-capacity',
    toolName: 'open_route',
    label: 'Open Flow & Capacity',
    previewSummary: 'Open flow and capacity view.',
    expectedEffect: 'Navigate to emergency capacity.',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: CANONICAL_ROUTES.emergencyCapacity,
    keywords: ['capacity', 'flow', 'boarding', 'occupancy'],
  },
  {
    id: 'nav-shift',
    toolName: 'open_route',
    label: 'Open Shift Summary',
    previewSummary: 'Open the shift summary surface.',
    expectedEffect: 'Navigate to emergency shift summary.',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: CANONICAL_ROUTES.emergencyShift,
    keywords: ['shift summary', 'handoff brief', 'shift handoff'],
  },
  {
    id: 'nav-dispatch',
    toolName: 'open_route',
    label: 'Open Dispatch',
    previewSummary: 'Open emergency dispatch / fleet surface.',
    expectedEffect: 'Navigate to emergency dispatch.',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: CANONICAL_ROUTES.emergencyDispatch,
    keywords: ['dispatch', 'fleet', 'fleet dispatch'],
  },
  // Reception in-page panels (document events — desk must be mounted or navigated first)
  {
    id: 'panel-reception-intake',
    toolName: 'open_panel',
    label: 'Open reception intake',
    previewSummary: 'Open intake on the Reception desk.',
    expectedEffect: 'Dispatch open-reception-intake (or navigate to reception first).',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: CANONICAL_ROUTES.emergencyReception,
    panelEvent: 'open-reception-intake',
    panelId: 'reception-intake',
    keywords: ['reception intake', 'start intake', 'new registration', 'walk-in intake'],
  },
  {
    id: 'panel-reception-ocr',
    toolName: 'open_panel',
    label: 'Open document scan / OCR',
    previewSummary: 'Open smart intake / OCR document capture on Reception.',
    expectedEffect: 'Dispatch open-reception-smart-intake for document capture.',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: CANONICAL_ROUTES.emergencyReception,
    panelEvent: 'open-reception-smart-intake',
    panelId: 'reception-ocr',
    keywords: [
      'ocr',
      'document scan',
      'scan document',
      'document capture',
      'scan id',
      'health card scan',
    ],
  },
  {
    id: 'panel-reception-lookup',
    toolName: 'open_panel',
    label: 'Focus patient lookup',
    previewSummary: 'Focus the Reception patient lookup field.',
    expectedEffect: 'Dispatch open-reception-lookup to focus lookup-before-create.',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: CANONICAL_ROUTES.emergencyReception,
    panelEvent: 'open-reception-lookup',
    panelId: 'reception-lookup',
    keywords: ['lookup patient', 'find patient', 'patient lookup', 'search patient', 'lookup'],
  },
  {
    id: 'panel-reception-shift-clearance',
    toolName: 'open_panel',
    label: 'Open shift clearance',
    previewSummary: 'Open Reception shift clearance checklist.',
    expectedEffect: 'Dispatch open-reception-shift-clearance.',
    riskLevel: 'low',
    requiredPermission: 'view_operations',
    requiresApproval: false,
    path: CANONICAL_ROUTES.emergencyReception,
    panelEvent: 'open-reception-shift-clearance',
    panelId: 'reception-shift-clearance',
    keywords: ['shift clearance', 'clearance', 'end of shift', 'desk clearance'],
  },
]);

export function listPromptNavigationCatalog(): readonly PromptNavigationIntent[] {
  return CATALOG;
}

export function isNavigationProposalTool(toolName: string): toolName is PromptNavigationToolName {
  return toolName === 'open_route' || toolName === 'open_tool' || toolName === 'open_panel';
}

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function roleDenied(intent: PromptNavigationIntent, role?: string): boolean {
  if (!role || !intent.deniedRoles?.length) return false;
  const r = role.trim().toLowerCase().replace(/\s+/g, '_');
  return intent.deniedRoles.some((d) => {
    const dd = d.toLowerCase();
    return r === dd || r.includes(dd) || dd.includes(r);
  });
}

function hasPermission(intent: PromptNavigationIntent, permissions?: readonly string[]): boolean {
  if (!permissions || permissions.length === 0) return false;
  return permissions.includes(intent.requiredPermission);
}

/**
 * Returns the best matching closed intent, or null if the prompt is not a
 * navigation/open request or no catalog entry matches.
 */
export function resolvePromptNavigationIntent(
  prompt: string,
  options: ResolvePromptNavigationOptions = {},
): PromptNavigationIntent | null {
  const cleaned = normalize(prompt);
  if (!cleaned || cleaned.length < 3) return null;

  const hasVerb = NAV_VERBS.test(cleaned);
  // Allow bare known tool phrases only when they look like commands, not questions
  const isQuestion = /^(what|why|how|when|who|is|are|can|does|do|explain|tell)\b/.test(cleaned);
  if (isQuestion && !hasVerb) return null;

  let best: { intent: PromptNavigationIntent; score: number } | null = null;

  for (const intent of CATALOG) {
    if (roleDenied(intent, options.role)) continue;
    if (!hasPermission(intent, options.permissions)) continue;

    let score = 0;
    for (const kw of intent.keywords) {
      const k = normalize(kw);
      if (!k) continue;
      if (cleaned === k) score = Math.max(score, 100 + k.length);
      else if (cleaned.includes(k)) score = Math.max(score, 50 + k.length);
    }

    if (score <= 0) continue;

    // Prefer explicit open/show/launch phrasing
    if (hasVerb) score += 20;
    // Without a verb, require a strong keyword hit (label-like phrase)
    if (!hasVerb && score < 55) continue;

    if (!best || score > best.score) {
      best = { intent, score };
    }
  }

  return best?.intent ?? null;
}

export function navigationIntentToProposalInput(
  intent: PromptNavigationIntent,
  meta: {
    originatingRequestId: string;
    correlationId: string;
    sessionId?: string;
    patientId?: string;
    userId?: string;
    role?: string;
  },
): CreateActionProposalInput {
  return {
    originatingRequestId: meta.originatingRequestId,
    correlationId: meta.correlationId,
    sessionId: meta.sessionId,
    patientId: meta.patientId,
    toolName: intent.toolName,
    validatedArguments: {
      intentId: intent.id,
      path: intent.path,
      panelEvent: intent.panelEvent,
      panelId: intent.panelId,
      label: intent.label,
    },
    expectedEffect: intent.expectedEffect,
    riskLevel: intent.riskLevel,
    requiredPermission: intent.requiredPermission,
    requiresApproval: intent.requiresApproval,
    model: 'prompt-navigation-catalog',
    promptVersion: 'prompt-nav-v1',
    previewSummary: intent.previewSummary,
    dataWillChange: [
      intent.toolName === 'open_panel'
        ? `UI panel: ${intent.panelId || intent.label}`
        : `Navigation: ${intent.path || intent.label}`,
    ],
    ownerUserId: meta.userId,
    ownerRole: meta.role,
    rollbackCapable: false,
  };
}

export type NavigationExecuteDeps = {
  navigate: (path: string) => void;
  /** Optional: current pathname to decide whether to navigate before panel event */
  currentPath?: string;
  dispatchDocumentEvent?: (name: string, detail?: Record<string, unknown>) => void;
};

/**
 * Apply a navigation/open proposal. Safe: only uses path/panelEvent from the
 * proposal's validatedArguments (set from the closed catalog).
 */
export function applyNavigationProposal(
  proposal: Pick<AIActionProposal, 'toolName' | 'validatedArguments'>,
  deps: NavigationExecuteDeps,
): Record<string, unknown> {
  if (!isNavigationProposalTool(proposal.toolName)) {
    throw new Error(`Not a navigation proposal tool: ${proposal.toolName}`);
  }

  const args = proposal.validatedArguments || {};
  const path = typeof args.path === 'string' ? args.path : undefined;
  const panelEvent = typeof args.panelEvent === 'string' ? args.panelEvent : undefined;
  const label = typeof args.label === 'string' ? args.label : proposal.toolName;

  const dispatch =
    deps.dispatchDocumentEvent ||
    ((name: string, detail?: Record<string, unknown>) => {
      if (typeof document === 'undefined') return;
      if (detail) {
        document.dispatchEvent(new CustomEvent(name, { detail }));
      } else {
        document.dispatchEvent(new Event(name));
      }
    });

  if (proposal.toolName === 'open_panel') {
    if (!panelEvent) throw new Error('open_panel proposal missing panelEvent');
    const receptionPath = CANONICAL_ROUTES.emergencyReception;
    const onReception =
      typeof deps.currentPath === 'string' &&
      deps.currentPath.split(/[?#]/)[0].startsWith(receptionPath);

    if (!onReception && path) {
      deps.navigate(path);
      // Fire panel event after navigation so the desk can pick it up when mounted
      if (typeof window !== 'undefined') {
        window.setTimeout(() => dispatch(panelEvent), 0);
      } else {
        dispatch(panelEvent);
      }
    } else {
      dispatch(panelEvent);
    }

    return { ok: true, toolName: proposal.toolName, opened: label, panelEvent, path: path || null };
  }

  if (!path) throw new Error(`${proposal.toolName} proposal missing path`);
  deps.navigate(path);
  return { ok: true, toolName: proposal.toolName, opened: label, path };
}

/** True when free text looks like a navigation command worth resolving. */
export function looksLikeNavigationPrompt(prompt: string): boolean {
  const cleaned = normalize(prompt);
  if (!cleaned) return false;
  if (NAV_VERBS.test(cleaned)) return true;
  // Bare catalog-ish phrases without question form
  if (/^(what|why|how|when|who|is|are|can|does|do|explain|tell)\b/.test(cleaned)) return false;
  return CATALOG.some((intent) =>
    intent.keywords.some((kw) => cleaned.includes(normalize(kw)) && normalize(kw).length >= 5),
  );
}
