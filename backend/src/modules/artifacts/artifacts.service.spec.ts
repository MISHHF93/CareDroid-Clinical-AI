import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ArtifactsService } from './artifacts.service';
import { Artifact, ArtifactType } from './entities/artifact.entity';
import { ArtifactVersion } from './entities/artifact-version.entity';

describe('ArtifactsService', () => {
  let service: ArtifactsService;

  const artifactRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) =>
      Promise.resolve({
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        ...value,
      }),
    ),
  };

  const artifactVersionRepository = {
    find: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve(value)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArtifactsService,
        {
          provide: getRepositoryToken(Artifact),
          useValue: artifactRepository,
        },
        {
          provide: getRepositoryToken(ArtifactVersion),
          useValue: artifactVersionRepository,
        },
      ],
    }).compile();

    service = module.get<ArtifactsService>(ArtifactsService);
    jest.clearAllMocks();
  });

  it('searches and filters the built-in artifact catalog when the repository is empty', async () => {
    artifactRepository.find.mockResolvedValue([]);

    const result = await service.list({
      search: 'sepsis',
      type: ArtifactType.WORKFLOW,
    });

    expect(result.count).toBe(1);
    expect(result.artifacts[0]).toMatchObject({
      id: 'sepsis-escalation-workflow',
      type: ArtifactType.WORKFLOW,
      version: '2.0.0',
    });
    expect(result.filters.types).toContain(ArtifactType.TELEMETRY_SCHEMA);
  });

  it('creates artifacts with normalized tags and an initial version snapshot', async () => {
    const artifact = await service.create({
      type: ArtifactType.TEMPLATE,
      title: '  New Intake Template  ',
      description: 'Collects intake context.',
      tags: ['Template', ' intake ', 'Template'],
      relationships: [{ artifactId: 'triage-handoff-prompt', type: 'uses' }],
      version: '0.1.0',
    });

    expect(artifactRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ArtifactType.TEMPLATE,
        title: 'New Intake Template',
        tags: ['template', 'intake'],
        version: '0.1.0',
      }),
    );
    expect(artifactVersionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactId: artifact.id,
        version: '0.1.0',
        changeSummary: 'Created 0.1.0',
      }),
    );
  });

  it('updates a seed artifact, bumps patch version, and snapshots history', async () => {
    artifactRepository.findOne.mockResolvedValue(null);

    const artifact = await service.update('triage-handoff-prompt', {
      description: 'Updated prompt guidance.',
    });

    expect(artifactRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'triage-handoff-prompt',
        description: 'Updated prompt guidance.',
        version: '1.4.2',
      }),
    );
    expect(artifactVersionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactId: 'triage-handoff-prompt',
        version: '1.4.2',
        changeSummary: 'Updated 1.4.2',
      }),
    );
    expect(artifact.version).toBe('1.4.2');
  });

  it('returns graph nodes and edges from artifact relationships', async () => {
    artifactRepository.find.mockResolvedValue([]);

    const graph = await service.getRelationshipGraph();

    expect(graph.nodes.some((node) => node.id === 'clinical-operations-dashboard')).toBe(true);
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'clinical-operations-dashboard',
          target: 'device-vitals-telemetry-schema',
        }),
      ]),
    );
  });
});
