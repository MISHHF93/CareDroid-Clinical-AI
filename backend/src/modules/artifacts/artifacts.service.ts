import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ArtifactQueryDto } from './dto/artifact-query.dto';
import { CreateArtifactDto } from './dto/create-artifact.dto';
import { UpdateArtifactDto } from './dto/update-artifact.dto';
import { DEFAULT_ARTIFACTS } from './artifact.seed';
import { Artifact, ArtifactRelationship, ArtifactType } from './entities/artifact.entity';
import { ArtifactVersion } from './entities/artifact-version.entity';

type ArtifactCatalogRecord = Pick<
  Artifact,
  'id' | 'type' | 'title' | 'description' | 'tags' | 'relationships' | 'version'
> & {
  createdAt: Date | string;
  updatedAt?: Date | string;
};

@Injectable()
export class ArtifactsService {
  constructor(
    @InjectRepository(Artifact)
    private readonly artifactRepository: Repository<Artifact>,
    @InjectRepository(ArtifactVersion)
    private readonly artifactVersionRepository: Repository<ArtifactVersion>,
  ) {}

  async list(query: ArtifactQueryDto = {}) {
    const artifacts = await this.getCatalog();
    const filtered = this.filterArtifacts(artifacts, query);
    return {
      artifacts: filtered.map((artifact) => this.serializeArtifact(artifact)),
      count: filtered.length,
      filters: {
        types: Object.values(ArtifactType),
        tags: this.getTags(artifacts),
      },
    };
  }

  async getRelationshipGraph(query: ArtifactQueryDto = {}) {
    const { artifacts } = await this.list(query);
    const availableIds = new Set(artifacts.map((artifact) => artifact.id));
    const edges = artifacts.flatMap((artifact) =>
      (artifact.relationships || [])
        .filter((relationship) => availableIds.has(relationship.artifactId))
        .map((relationship) => ({
          source: artifact.id,
          target: relationship.artifactId,
          type: relationship.type || 'related',
          label: relationship.label || relationship.type || 'related',
        })),
    );

    return {
      nodes: artifacts.map((artifact) => ({
        id: artifact.id,
        type: artifact.type,
        title: artifact.title,
        version: artifact.version,
      })),
      edges,
    };
  }

  async findOne(id: string) {
    const artifact = await this.findArtifact(id);
    if (!artifact) {
      throw new NotFoundException('Artifact not found.');
    }
    return this.serializeArtifact(artifact);
  }

  async create(dto: CreateArtifactDto) {
    const artifact = this.artifactRepository.create({
      id: randomUUID(),
      type: dto.type,
      title: dto.title.trim(),
      description: dto.description.trim(),
      tags: this.normalizeTags(dto.tags),
      relationships: this.normalizeRelationships(dto.relationships),
      version: dto.version?.trim() || '1.0.0',
    });

    const saved = await this.artifactRepository.save(artifact);
    await this.snapshot(saved, `Created ${saved.version}`);
    return this.serializeArtifact(saved);
  }

  async update(id: string, dto: UpdateArtifactDto) {
    const artifact = await this.findPersistedOrSeedArtifact(id);
    if (!artifact) {
      throw new NotFoundException('Artifact not found.');
    }

    if (dto.type) artifact.type = dto.type;
    if (dto.title !== undefined) artifact.title = dto.title.trim();
    if (dto.description !== undefined) artifact.description = dto.description.trim();
    if (dto.tags !== undefined) artifact.tags = this.normalizeTags(dto.tags);
    if (dto.relationships !== undefined) {
      artifact.relationships = this.normalizeRelationships(dto.relationships);
    }
    artifact.version = dto.version?.trim() || this.bumpPatchVersion(artifact.version);

    const saved = await this.artifactRepository.save(artifact);
    await this.snapshot(saved, `Updated ${saved.version}`);
    return this.serializeArtifact(saved);
  }

  async getVersionHistory(id: string) {
    const artifact = await this.findArtifact(id);
    if (!artifact) {
      throw new NotFoundException('Artifact not found.');
    }

    const versions = await this.artifactVersionRepository.find({
      where: { artifactId: id },
      order: { createdAt: 'DESC' },
    });

    if (versions.length === 0) {
      return {
        artifactId: artifact.id,
        versions: [
          {
            id: `${artifact.id}:${artifact.version}`,
            version: artifact.version,
            title: artifact.title,
            description: artifact.description,
            tags: artifact.tags || [],
            relationships: artifact.relationships || [],
            changeSummary: 'Current catalog version',
            createdAt: this.toIsoDate(artifact.createdAt),
          },
        ],
      };
    }

    return {
      artifactId: id,
      versions: versions.map((version) => ({
        id: version.id,
        version: version.version,
        title: version.title,
        description: version.description,
        tags: version.tags || [],
        relationships: version.relationships || [],
        changeSummary: version.changeSummary,
        createdAt: this.toIsoDate(version.createdAt),
      })),
    };
  }

  private async getCatalog(): Promise<ArtifactCatalogRecord[]> {
    const persisted = await this.artifactRepository.find({ order: { createdAt: 'DESC' } });
    return persisted.length > 0 ? persisted : DEFAULT_ARTIFACTS;
  }

  private async findArtifact(id: string): Promise<ArtifactCatalogRecord | null> {
    const persisted = await this.artifactRepository.findOne({ where: { id } });
    return persisted || DEFAULT_ARTIFACTS.find((artifact) => artifact.id === id) || null;
  }

  private async findPersistedOrSeedArtifact(id: string): Promise<Artifact | null> {
    const persisted = await this.artifactRepository.findOne({ where: { id } });
    if (persisted) return persisted;

    const seed = DEFAULT_ARTIFACTS.find((artifact) => artifact.id === id);
    if (!seed) return null;

    return this.artifactRepository.create({
      id: seed.id,
      type: seed.type,
      title: seed.title,
      description: seed.description,
      tags: seed.tags,
      relationships: seed.relationships,
      version: seed.version,
    });
  }

  private filterArtifacts(artifacts: ArtifactCatalogRecord[], query: ArtifactQueryDto) {
    const search = query.search?.trim().toLowerCase();
    const tag = query.tag?.trim().toLowerCase();

    return artifacts.filter((artifact) => {
      if (query.type && artifact.type !== query.type) return false;
      if (tag && !(artifact.tags || []).some((artifactTag) => artifactTag.toLowerCase() === tag)) {
        return false;
      }
      if (!search) return true;

      const searchable = [
        artifact.type,
        artifact.title,
        artifact.description,
        artifact.version,
        ...(artifact.tags || []),
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(search);
    });
  }

  private getTags(artifacts: ArtifactCatalogRecord[]) {
    return [...new Set(artifacts.flatMap((artifact) => artifact.tags || []))].sort((a, b) =>
      a.localeCompare(b),
    );
  }

  private normalizeTags(tags: string[] = []) {
    return [
      ...new Set(
        tags
          .map((tag) => tag.trim())
          .filter(Boolean)
          .map((tag) => tag.toLowerCase()),
      ),
    ];
  }

  private normalizeRelationships(relationships: ArtifactRelationship[] = []) {
    return relationships
      .map((relationship) => ({
        artifactId: relationship.artifactId?.trim(),
        type: relationship.type?.trim() || 'related',
        label: relationship.label?.trim() || relationship.type?.trim() || 'Related artifact',
      }))
      .filter((relationship) => Boolean(relationship.artifactId));
  }

  private bumpPatchVersion(version = '1.0.0') {
    const parts = version.split('.').map((part) => Number.parseInt(part, 10));
    if (parts.length === 3 && parts.every(Number.isFinite)) {
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    }
    return `${version}.1`;
  }

  private async snapshot(artifact: Artifact, changeSummary: string) {
    const version = this.artifactVersionRepository.create({
      id: randomUUID(),
      artifactId: artifact.id,
      type: artifact.type,
      title: artifact.title,
      description: artifact.description,
      tags: artifact.tags || [],
      relationships: artifact.relationships || [],
      version: artifact.version,
      changeSummary,
    });
    await this.artifactVersionRepository.save(version);
  }

  private serializeArtifact(artifact: ArtifactCatalogRecord) {
    return {
      id: artifact.id,
      type: artifact.type,
      title: artifact.title,
      description: artifact.description,
      tags: artifact.tags || [],
      relationships: artifact.relationships || [],
      version: artifact.version,
      createdAt: this.toIsoDate(artifact.createdAt),
    };
  }

  private toIsoDate(value: Date | string) {
    return value instanceof Date ? value.toISOString() : value;
  }
}
