import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  buildLivingDocumentationSnapshot,
  resolveLivingDocumentationForPath,
} from './livingDocumentationService';
import { generateLivingDocumentationFiles } from './livingDocumentationGenerator';

describe('livingDocumentationService', () => {
  it('builds snapshot from implementation registries', () => {
    const snapshot = buildLivingDocumentationSnapshot();
    expect(snapshot.engineId).toBe('living-documentation');
    expect(snapshot.metrics.routes).toBeGreaterThan(5);
    expect(snapshot.metrics.apis).toBeGreaterThan(10);
    expect(snapshot.metrics.permissions).toBeGreaterThan(10);
    expect(snapshot.metrics.aiCapabilities).toBeGreaterThan(5);
    expect(snapshot.metrics.configuration).toBeGreaterThan(40);
  });

  it('resolves live page context for reception route', () => {
    const snapshot = buildLivingDocumentationSnapshot();
    const page = resolveLivingDocumentationForPath(CANONICAL_ROUTES.emergencyReception, snapshot);
    expect(page?.pageId).toBe('reception');
    expect(page?.helpTopicId).toBe('reception');
    expect(page?.workflows).toContain('arrival-intake');
  });

  it('generates markdown files for all sections', () => {
    const files = generateLivingDocumentationFiles();
    expect(files['README.md']).toContain('living documentation index');
    expect(files['routes.md']).toContain('Routes & pages');
    expect(files['permissions.md']).toContain('Permissions');
    expect(files['contextual-help.md']).toContain('Contextual help entries');
    expect(files['superseded-manifest.json']).toContain('docs/specs/page-map.md');
  });

  it('resolves route required permissions in page context', () => {
    const snapshot = buildLivingDocumentationSnapshot();
    const page = resolveLivingDocumentationForPath(CANONICAL_ROUTES.emergencyPatients, snapshot);
    expect(page?.permissions.length).toBeGreaterThan(0);
  });

  it('routes.md is honest about being a curated journey-stage subset, not the full route surface (Cycle 153)', () => {
    const files = generateLivingDocumentationFiles();
    expect(files['routes.md']).toContain('curated ED journey stages');
    expect(files['routes.md']).toContain('not the full route surface');
    expect(files['routes.md']).toContain('audit-routes-nav-full-scan.mjs');
  });
});