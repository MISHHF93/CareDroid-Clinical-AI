/**
 * Contract matrix drift tests.
 */

import { describe, it, expect } from 'vitest';
import { clinicalIntentTools } from './clinicalIntentToolCatalog';
import { NLU_PROFILE_TOOL_IDS, ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS } from './clinicalToolIdContract';
import {
  buildBackendFrontendContractRows,
  deriveContractStatus,
  getContractGaps,
} from './backendFrontendToolContract';
import { parseClinicalToolPatterns } from './parseToolPatterns';
import { readToolPatternsSource } from './clinicalToolAliasSync';

describe('backendFrontendToolContract', () => {
  it('assigns POST executor only to registered orchestrator ids', () => {
    const rows = buildBackendFrontendContractRows().filter((r) => r.kind === 'nlu');
    const withExecutor = rows.filter((r) => r.backendExecutor === 'yes');
    expect(withExecutor.map((r) => r.canonicalId).sort()).toEqual(
      [...ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS].sort()
    );
  });

  it('does not mark dispatch-ai as fully wired with POST executor', () => {
    const dispatch = buildBackendFrontendContractRows().find((r) => r.canonicalId === 'dispatch-ai');
    expect(dispatch?.backendExecutor).toBe('no');
    expect(dispatch?.status).not.toBe('fully wired');
  });

  it('marks share-results platform row as frontend-only (capability gated)', () => {
    const share = buildBackendFrontendContractRows().find((r) => r.canonicalId === 'tools-share-results');
    expect(share?.status).toBe('frontend-only');
    expect(share?.brokenReasons).toEqual([]);
  });

  it('NLU row count matches clinicalIntentTools', () => {
    const nluRows = buildBackendFrontendContractRows().filter((r) => r.kind === 'nlu');
    expect(nluRows.length).toBe(clinicalIntentTools.length);
    expect(nluRows.length).toBe(NLU_PROFILE_TOOL_IDS.length);
  });

  it('every NLU profile has backend pattern and catalog yes', () => {
    const patterns = parseClinicalToolPatterns(readToolPatternsSource());
    const patternIds = new Set(patterns.map((p) => p.toolId));
    const rows = buildBackendFrontendContractRows().filter((r) => r.kind === 'nlu');

    for (const id of NLU_PROFILE_TOOL_IDS) {
      expect(patternIds.has(id)).toBe(true);
      const row = rows.find((r) => r.canonicalId === id);
      expect(row?.catalogEntry).toBe('yes');
      expect(row?.discoveryEntry).toBe('yes');
      expect(['fully wired', 'frontend-only']).toContain(row?.status);
    }
  });

  it('deriveContractStatus treats phantoms as planned', () => {
    expect(deriveContractStatus({ kind: 'phantom', brokenReasons: [] })).toBe('planned');
  });

  it('documents procedures NLU profile with frontend-only status', () => {
    const gaps = getContractGaps();
    const procedures = buildBackendFrontendContractRows().find((r) => r.canonicalId === 'procedures');
    expect(gaps.some((g) => g.id === 'procedures')).toBe(false);
    expect(procedures?.status).toBe('frontend-only');
    expect(procedures?.nluProfile).toBe('procedures');
  });
});
