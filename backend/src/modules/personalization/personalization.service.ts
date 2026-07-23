import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedPromptDto } from './dto/saved-prompt.dto';
import { UpdatePersonalizationDto } from './dto/update-personalization.dto';
import { SavedPrompt } from './entities/saved-prompt.entity';
import { UserAiPreference } from './entities/user-ai-preference.entity';

const DEFAULT_RECOMMENDATIONS = [
  {
    id: 'calculator-safety',
    title: 'Pin high-use clinical calculators',
    reason:
      'Your workspace has calculator access, so pinned calculators can shorten common decisions.',
    toolId: 'calculators',
  },
  {
    id: 'iot-rounding',
    title: 'Review Medical IoT telemetry',
    reason:
      'Hospital and emergency workspaces benefit from a quick device status pass before rounds.',
    toolId: 'medical-iot',
  },
  {
    id: 'fleet-readiness',
    title: 'Open fleet readiness view',
    reason:
      'Fleet workspaces can use live status and predictive maintenance as an operational check.',
    toolId: 'fleet-dashboard',
  },
];

@Injectable()
export class PersonalizationService {
  constructor(
    @InjectRepository(UserAiPreference)
    private readonly aiPreferenceRepository: Repository<UserAiPreference>,
    @InjectRepository(SavedPrompt)
    private readonly savedPromptRepository: Repository<SavedPrompt>,
  ) {}

  async getForUser(userId: string) {
    const preference = await this.getOrCreatePreference(userId);
    const savedPrompts = await this.savedPromptRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      take: 25,
    });
    return {
      preferredBehavior: preference.preferredBehavior,
      savedPrompts: savedPrompts.map((prompt) => this.serializePrompt(prompt)),
      recentPrompts: preference.recentPrompts || [],
      suggestedTools: preference.suggestedTools || ['calculators', 'drug-check', 'lab-interp'],
      recommendedWorkflows: preference.recommendedWorkflows || DEFAULT_RECOMMENDATIONS,
    };
  }

  async updateForUser(userId: string, dto: UpdatePersonalizationDto) {
    const preference = await this.getOrCreatePreference(userId);
    if (dto.preferredBehavior) preference.preferredBehavior = dto.preferredBehavior;
    if (dto.suggestedTools) preference.suggestedTools = [...new Set(dto.suggestedTools)];
    if (dto.recommendedWorkflows) preference.recommendedWorkflows = dto.recommendedWorkflows;
    await this.aiPreferenceRepository.save(preference);
    return this.getForUser(userId);
  }

  async recommendationsForUser(userId: string, allowedToolIds: string[] = []) {
    const personalization = await this.getForUser(userId);
    const allowed = new Set(allowedToolIds);
    const recommendedWorkflows = personalization.recommendedWorkflows.filter(
      (workflow) => !workflow.toolId || allowed.size === 0 || allowed.has(workflow.toolId),
    );
    const suggestedTools = personalization.suggestedTools.filter(
      (toolId) => allowed.size === 0 || allowed.has(toolId),
    );
    return { suggestedTools, recommendedWorkflows };
  }

  async savePrompt(userId: string, dto: SavedPromptDto) {
    const prompt = this.savedPromptRepository.create({
      userId,
      workspaceId: dto.workspaceId || undefined,
      title: dto.title.trim(),
      prompt: dto.prompt,
      tags: dto.tags || [],
    });
    return this.serializePrompt(await this.savedPromptRepository.save(prompt));
  }

  async deletePrompt(userId: string, promptId: string) {
    const prompt = await this.savedPromptRepository.findOne({ where: { id: promptId, userId } });
    if (!prompt) throw new NotFoundException('Saved prompt not found.');
    await this.savedPromptRepository.delete({ id: promptId, userId });
    return { deleted: true };
  }

  async recordRecentPrompt(
    userId: string,
    promptPreview: string,
    toolId?: string,
    workspaceId?: string,
  ) {
    const preference = await this.getOrCreatePreference(userId);
    const recentPrompt = {
      id: `${Date.now()}`,
      promptPreview: String(promptPreview || '')
        .replace(/\s+/g, ' ')
        .slice(0, 160),
      toolId,
      workspaceId,
      createdAt: new Date().toISOString(),
    };
    preference.recentPrompts = [recentPrompt, ...(preference.recentPrompts || [])].slice(0, 10);
    await this.aiPreferenceRepository.save(preference);
    return recentPrompt;
  }

  private async getOrCreatePreference(userId: string) {
    let preference = await this.aiPreferenceRepository.findOne({ where: { userId } });
    if (!preference) {
      preference = this.aiPreferenceRepository.create({
        userId,
        preferredBehavior: 'clinical_copilot',
        recentPrompts: [],
        suggestedTools: ['calculators', 'drug-check', 'lab-interp'],
        recommendedWorkflows: DEFAULT_RECOMMENDATIONS,
      });
      preference = await this.aiPreferenceRepository.save(preference);
    }
    return preference;
  }

  private serializePrompt(prompt: SavedPrompt) {
    return {
      id: prompt.id,
      title: prompt.title,
      prompt: prompt.prompt,
      tags: prompt.tags || [],
      workspaceId: prompt.workspaceId,
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt,
    };
  }
}
