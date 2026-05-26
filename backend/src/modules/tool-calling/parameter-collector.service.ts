import { Injectable, Logger } from '@nestjs/common';
import { AIService } from '../ai/ai.service';
import { ParameterCollectionResult, ToolDefinition, ToolParameterSpec } from './tool-calling.types';

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function exampleValue(type: ToolParameterSpec['type']) {
  if (type === 'number') return 0;
  if (type === 'boolean') return false;
  if (type === 'array') return [];
  if (type === 'object') return {};
  return '';
}

@Injectable()
export class ParameterCollectorService {
  private readonly logger = new Logger(ParameterCollectorService.name);

  constructor(private readonly aiService: AIService) {}

  async collect(input: {
    prompt: string;
    definition: ToolDefinition;
    initialParameters?: Record<string, any>;
    extractedParameters?: Record<string, any>;
    userId?: string;
    context?: Record<string, any>;
    useAiExtraction?: boolean;
  }): Promise<ParameterCollectionResult> {
    const parameters = {
      ...(input.extractedParameters || {}),
      ...(input.initialParameters || {}),
    };
    const collectedFrom = Object.keys(input.extractedParameters || {}).length
      ? ['intent']
      : ([] as string[]);

    const heuristic = this.extractHeuristicParameters(input.prompt, [
      ...input.definition.requiredParameters,
      ...input.definition.optionalParameters,
    ]);
    for (const [key, value] of Object.entries(heuristic)) {
      if (!hasValue(parameters[key])) {
        parameters[key] = value;
      }
    }
    if (Object.keys(heuristic).length > 0) {
      collectedFrom.push('heuristic');
    }

    let missingRequired = this.findMissing(input.definition.requiredParameters, parameters);
    if (missingRequired.length > 0 && input.useAiExtraction !== false) {
      try {
        const extracted = await this.extractWithAi(input, missingRequired);
        for (const [key, value] of Object.entries(extracted)) {
          if (hasValue(value)) {
            parameters[key] = value;
          }
        }
        if (Object.keys(extracted).length > 0) {
          collectedFrom.push('ai');
        }
      } catch (error) {
        this.logger.warn(
          `AI parameter extraction failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      missingRequired = this.findMissing(input.definition.requiredParameters, parameters);
    }

    return {
      parameters,
      missingRequired,
      collectedFrom,
      needsFollowUp: missingRequired.length > 0,
      followUpMessage:
        missingRequired.length > 0
          ? this.buildFollowUpMessage(input.definition, missingRequired)
          : undefined,
    };
  }

  private findMissing(
    requiredParameters: ToolParameterSpec[],
    parameters: Record<string, any>,
  ): ToolParameterSpec[] {
    return requiredParameters.filter((param) => !hasValue(parameters[param.name]));
  }

  private extractHeuristicParameters(
    prompt: string,
    parameters: ToolParameterSpec[],
  ): Record<string, any> {
    const extracted: Record<string, any> = {};
    for (const param of parameters) {
      const flexibleName = param.name.replace(
        /[A-Z]/g,
        (letter) => `[_ -]?${letter.toLowerCase()}`,
      );
      const labelPattern = new RegExp(`${flexibleName}\\s*[:=]\\s*([^,;\\n]+)`, 'i');
      const labelMatch = prompt.match(labelPattern);
      if (labelMatch?.[1]) {
        extracted[param.name] = this.coerce(labelMatch[1].trim(), param.type);
        continue;
      }

      if (param.name === 'patientId') {
        const patientMatch = prompt.match(/patient(?:\s+id)?\s*[:#]?\s*([a-z0-9-]+)/i);
        if (patientMatch?.[1]) extracted.patientId = patientMatch[1];
      }
    }
    return extracted;
  }

  private coerce(value: string, type: ToolParameterSpec['type']): any {
    if (type === 'number') {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : value;
    }
    if (type === 'boolean') {
      return /^(true|yes|y|1)$/i.test(value);
    }
    if (type === 'array') {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return value;
  }

  private async extractWithAi(
    input: {
      prompt: string;
      definition: ToolDefinition;
      userId?: string;
      context?: Record<string, any>;
    },
    missingRequired: ToolParameterSpec[],
  ): Promise<Record<string, any>> {
    const schema = Object.fromEntries(
      [...input.definition.requiredParameters, ...input.definition.optionalParameters].map(
        (param) => [param.name, exampleValue(param.type)],
      ),
    );
    const prompt = `Extract tool parameters from this request.

Tool: ${input.definition.name}
User request: ${input.prompt}

Required parameters:
${missingRequired.map((param) => `- ${param.name}: ${param.description}`).join('\n')}

Return only JSON. Use null when a value is not present.`;

    const result = await this.aiService.generateStructuredJSON(
      input.userId || 'anonymous',
      prompt,
      schema,
      {
        ...(input.context || {}),
        feature: 'tool-calling-parameter-extraction',
        toolId: input.definition.id,
      },
    );
    return result || {};
  }

  private buildFollowUpMessage(
    definition: ToolDefinition,
    missingRequired: ToolParameterSpec[],
  ): string {
    const missing = missingRequired
      .map((param) => `- ${param.name}: ${param.description}`)
      .join('\n');
    return `I can run ${definition.name}, but I need:\n${missing}`;
  }
}
