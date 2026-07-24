import { describe, expect, it, vi } from 'vitest';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  applyNavigationProposal,
  isNavigationProposalTool,
  looksLikeNavigationPrompt,
  resolvePromptNavigationIntent,
  listPromptNavigationCatalog,
  navigationIntentToProposalInput,
} from './promptNavigationIntent';

const PERMS = ['use_ai_chat', 'view_phi', 'view_operations'] as const;

describe('promptNavigationIntent catalog', () => {
  it('exposes a non-empty frozen-style closed catalog with unique ids', () => {
    const catalog = listPromptNavigationCatalog();
    expect(catalog.length).toBeGreaterThan(8);
    const ids = catalog.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of catalog) {
      expect(entry.keywords.length).toBeGreaterThan(0);
      if (entry.toolName === 'open_panel') {
        expect(entry.panelEvent).toBeTruthy();
      } else {
        expect(entry.path).toBeTruthy();
      }
    }
  });

  it('resolves open reception desk prompts', () => {
    const intent = resolvePromptNavigationIntent('Open reception desk', {
      role: 'registration_clerk',
      permissions: PERMS,
    });
    expect(intent?.id).toBe('nav-reception');
    expect(intent?.path).toBe(CANONICAL_ROUTES.emergencyReception);
    expect(intent?.toolName).toBe('open_route');
  });

  it('resolves whiteboard and HEART score', () => {
    expect(
      resolvePromptNavigationIntent('open the whiteboard', {
        role: 'charge_nurse',
        permissions: PERMS,
      })?.id,
    ).toBe('nav-whiteboard');

    const heart = resolvePromptNavigationIntent('Launch HEART score for this patient', {
      role: 'physician',
      permissions: PERMS,
    });
    expect(heart?.id).toBe('nav-heart-score');
    expect(heart?.toolName).toBe('open_tool');
    expect(heart?.path).toContain('heart-score');
  });

  it('resolves reception panel intents (OCR, lookup, shift clearance)', () => {
    expect(
      resolvePromptNavigationIntent('show OCR document scan', {
        role: 'registration_clerk',
        permissions: PERMS,
      })?.panelEvent,
    ).toBe('open-reception-smart-intake');

    expect(
      resolvePromptNavigationIntent('focus patient lookup', {
        role: 'registration_clerk',
        permissions: PERMS,
      })?.panelEvent,
    ).toBe('open-reception-lookup');

    expect(
      resolvePromptNavigationIntent('open shift clearance', {
        role: 'registration_clerk',
        permissions: PERMS,
      })?.panelEvent,
    ).toBe('open-reception-shift-clearance');
  });

  it('returns null for unknown / question prompts (chat path)', () => {
    expect(
      resolvePromptNavigationIntent('What is ESI level 2?', {
        role: 'registration_clerk',
        permissions: PERMS,
      }),
    ).toBeNull();

    expect(
      resolvePromptNavigationIntent('explain missing insurance fields', {
        role: 'registration_clerk',
        permissions: PERMS,
      }),
    ).toBeNull();

    expect(
      resolvePromptNavigationIntent('open the secret admin shell /evil', {
        role: 'admin',
        permissions: PERMS,
      }),
    ).toBeNull();
  });

  it('denies clinical calculators for registration clerk', () => {
    expect(
      resolvePromptNavigationIntent('open HEART score', {
        role: 'registration_clerk',
        permissions: PERMS,
      }),
    ).toBeNull();

    expect(
      resolvePromptNavigationIntent('open HEART score', {
        role: 'physician',
        permissions: PERMS,
      })?.id,
    ).toBe('nav-heart-score');
  });

  it('requires permission held by the user', () => {
    expect(
      resolvePromptNavigationIntent('open reception', {
        role: 'registration_clerk',
        permissions: ['use_ai_chat'],
      }),
    ).toBeNull();

    expect(
      resolvePromptNavigationIntent('open reception', {
        role: 'registration_clerk',
        permissions: ['view_operations'],
      })?.id,
    ).toBe('nav-reception');
  });

  it('builds proposal input from intent without inventing paths', () => {
    const intent = resolvePromptNavigationIntent('open reception', {
      role: 'registration_clerk',
      permissions: PERMS,
    })!;
    const input = navigationIntentToProposalInput(intent, {
      originatingRequestId: 'req-1',
      correlationId: 'corr-1',
      role: 'registration_clerk',
    });
    expect(input.toolName).toBe('open_route');
    expect(input.validatedArguments.path).toBe(CANONICAL_ROUTES.emergencyReception);
    expect(input.model).toBe('prompt-navigation-catalog');
  });
});

describe('applyNavigationProposal', () => {
  it('navigates for open_route', () => {
    const navigate = vi.fn();
    const result = applyNavigationProposal(
      {
        toolName: 'open_route',
        validatedArguments: {
          path: CANONICAL_ROUTES.emergencyReception,
          label: 'Open Reception desk',
        },
      },
      { navigate },
    );
    expect(navigate).toHaveBeenCalledWith(CANONICAL_ROUTES.emergencyReception);
    expect(result.ok).toBe(true);
  });

  it('dispatches panel events when already on reception', () => {
    const navigate = vi.fn();
    const dispatchDocumentEvent = vi.fn();
    applyNavigationProposal(
      {
        toolName: 'open_panel',
        validatedArguments: {
          path: CANONICAL_ROUTES.emergencyReception,
          panelEvent: 'open-reception-lookup',
          label: 'Focus patient lookup',
        },
      },
      {
        navigate,
        currentPath: CANONICAL_ROUTES.emergencyReception,
        dispatchDocumentEvent,
      },
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(dispatchDocumentEvent).toHaveBeenCalledWith('open-reception-lookup');
  });

  it('navigates then dispatches when not on reception', () => {
    vi.useFakeTimers();
    const navigate = vi.fn();
    const dispatchDocumentEvent = vi.fn();
    applyNavigationProposal(
      {
        toolName: 'open_panel',
        validatedArguments: {
          path: CANONICAL_ROUTES.emergencyReception,
          panelEvent: 'open-reception-smart-intake',
          label: 'OCR',
        },
      },
      {
        navigate,
        currentPath: '/emergency/whiteboard',
        dispatchDocumentEvent,
      },
    );
    expect(navigate).toHaveBeenCalledWith(CANONICAL_ROUTES.emergencyReception);
    expect(dispatchDocumentEvent).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(dispatchDocumentEvent).toHaveBeenCalledWith('open-reception-smart-intake');
    vi.useRealTimers();
  });
});

describe('helpers', () => {
  it('identifies navigation tool names', () => {
    expect(isNavigationProposalTool('open_route')).toBe(true);
    expect(isNavigationProposalTool('open_tool')).toBe(true);
    expect(isNavigationProposalTool('open_panel')).toBe(true);
    expect(isNavigationProposalTool('draft_note')).toBe(false);
  });

  it('looksLikeNavigationPrompt gates questions vs open phrases', () => {
    expect(looksLikeNavigationPrompt('open reception')).toBe(true);
    expect(looksLikeNavigationPrompt('What is ESI 2?')).toBe(false);
  });
});
