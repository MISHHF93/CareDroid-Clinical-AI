import { describe, expect, it } from 'vitest';
import {
  buildEvidenceBriefPrompt,
  buildEvidenceSummaryPrompt,
  buildGuidelineComparisonPrompt,
  EVIDENCE_SUMMARIES,
  getResearchHubSnapshot,
  GUIDELINE_LIBRARY,
  resolveResearchWorkflowLinks,
  RESEARCH_HUB_SECTIONS,
  searchResearchHub,
} from './researchEvidenceHub';

describe('researchEvidenceHub', () => {
  it('covers all requested hub sections', () => {
    expect(RESEARCH_HUB_SECTIONS).toEqual([
      'literature-library',
      'guideline-library',
      'evidence-summaries',
      'study-tracker',
      'citation-explorer',
    ]);

    const snapshot = getResearchHubSnapshot();
    expect(snapshot.sourceStatus).toBe('demo-evidence-library');
    expect(snapshot.literatureCount).toBeGreaterThan(0);
    expect(snapshot.guidelineCount).toBeGreaterThan(0);
    expect(snapshot.evidenceSummaryCount).toBeGreaterThan(0);
    expect(snapshot.trackedStudyCount).toBeGreaterThan(0);
    expect(snapshot.citationCount).toBeGreaterThan(0);
  });

  it('links evidence summaries to protocols and simulations', () => {
    const links = resolveResearchWorkflowLinks(EVIDENCE_SUMMARIES[0]);

    expect(links.protocols[0]).toMatchObject({
      id: 'sepsis',
      label: 'Sepsis Management',
      path: '/protocols',
    });
    expect(links.simulations.map((link) => link.path)).toContain('/simulation/sepsis-deterioration');
  });

  it('searches research content and builds AI prompts', () => {
    const results = searchResearchHub('stroke');

    expect(results.guidelines.map((guideline) => guideline.id)).toContain('stroke-guideline');
    expect(results.summaries.map((summary) => summary.id)).toContain('stroke-evidence-summary');
    expect(buildEvidenceSummaryPrompt(EVIDENCE_SUMMARIES[0])).toMatch(/summarize the evidence/i);
    expect(buildGuidelineComparisonPrompt(GUIDELINE_LIBRARY.slice(0, 2))).toMatch(/compare/i);
    expect(buildEvidenceBriefPrompt('sepsis')).toMatch(/linked simulations/i);
  });
});
