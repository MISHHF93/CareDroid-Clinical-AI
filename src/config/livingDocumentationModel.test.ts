import { describe, expect, it } from 'vitest';
import {
  LIVING_DOCUMENTATION_CONTRACT,
  LIVING_DOCUMENTATION_SECTIONS,
  LIVING_REUSABLE_COMPONENTS,
  SUPERSEDED_STATIC_DOCUMENTATION,
} from './livingDocumentationModel';
import { LIVING_CONTEXTUAL_HELP_ENTRIES } from './livingDocumentationContextualHelp';

describe('livingDocumentationModel', () => {
  it('defines nine documentation sections', () => {
    expect(LIVING_DOCUMENTATION_SECTIONS).toHaveLength(9);
    expect(LIVING_DOCUMENTATION_CONTRACT.sectionCount).toBe(9);
    expect(LIVING_DOCUMENTATION_CONTRACT.autoSync).toBe(true);
  });

  it('lists reusable components with source paths', () => {
    expect(LIVING_REUSABLE_COMPONENTS.length).toBeGreaterThanOrEqual(6);
    for (const component of LIVING_REUSABLE_COMPONENTS) {
      expect(component.path.startsWith('src/')).toBe(true);
    }
  });

  it('maps contextual help entries to help topic ids', () => {
    expect(LIVING_CONTEXTUAL_HELP_ENTRIES.length).toBeGreaterThanOrEqual(12);
    for (const entry of LIVING_CONTEXTUAL_HELP_ENTRIES) {
      expect(entry.helpTopicId.length).toBeGreaterThan(0);
      expect(entry.guidanceId.length).toBeGreaterThan(0);
    }
  });

  it('declares superseded static documentation paths', () => {
    expect(SUPERSEDED_STATIC_DOCUMENTATION.length).toBeGreaterThanOrEqual(4);
    for (const record of SUPERSEDED_STATIC_DOCUMENTATION) {
      expect(record.replacedBy.startsWith('docs/generated/')).toBe(true);
    }
  });
});
