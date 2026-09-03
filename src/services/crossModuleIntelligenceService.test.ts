import { describe, expect, it } from 'vitest';
import {
  CrossModuleIntelligenceService,
  buildCrossModuleHubSnapshot,
  createCrossModuleIntelligenceService,
} from './crossModuleIntelligenceService';

describe('CrossModuleIntelligenceService', () => {
  it('builds a connected module graph with no isolated modules', () => {
    const snapshot = buildCrossModuleHubSnapshot(undefined);

    expect(snapshot.coverage.allModulesLinked).toBe(true);
    expect(snapshot.coverage.moduleCount).toBeGreaterThanOrEqual(9);
    expect(snapshot.coverage.linkCount).toBeGreaterThanOrEqual(9);
    expect(snapshot.pathways.map((pathway) => pathway.label)).toEqual(
      expect.arrayContaining([
        'Simulation -> Laboratory -> 3D Viewer',
        'Hospital Map -> Fleet -> IoT',
        'Protocols -> Calculators -> AI Agents',
      ]),
    );
  });

  it('links Simulation to Laboratory and 3D Viewer', () => {
    const service = createCrossModuleIntelligenceService();
    const related = service.getRelatedModules('simulation');

    expect(related.map((module) => module.moduleId)).toEqual(
      expect.arrayContaining(['laboratory', 'medical-3d-viewer']),
    );
    expect(
      related.find((module) => module.moduleId === 'laboratory')?.evidenceCount,
    ).toBeGreaterThan(0);
  });

  it('links Hospital Map, Fleet, and Medical IoT operational modules', () => {
    const service = new CrossModuleIntelligenceService();

    expect(service.getRelatedModules('hospital-map').map((module) => module.moduleId)).toEqual(
      expect.arrayContaining(['fleet', 'medical-iot']),
    );
    expect(service.getRelatedModules('fleet').map((module) => module.moduleId)).toEqual(
      expect.arrayContaining(['hospital-map', 'medical-iot']),
    );
  });

  it('links Protocols to Calculators and AI Agents', () => {
    const service = createCrossModuleIntelligenceService();

    expect(service.getRelatedModules('protocols').map((module) => module.moduleId)).toEqual(
      expect.arrayContaining(['calculators', 'ai-agents']),
    );
    expect(service.getNextActions('calculators').map((action) => action.route)).toEqual(
      expect.arrayContaining(['/protocols', '/assistant']),
    );
  });
});
