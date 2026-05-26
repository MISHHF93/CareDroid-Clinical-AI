import { Injectable } from '@nestjs/common';
import { ToolOrchestratorService } from '../medical-control-plane/tool-orchestrator/tool-orchestrator.service';
import {
  ToolCallingValidationResult,
  ToolDefinition,
  ToolParameterSpec,
} from './tool-calling.types';

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

@Injectable()
export class ValidationService {
  constructor(private readonly toolOrchestrator: ToolOrchestratorService) {}

  async validate(input: {
    definition: ToolDefinition;
    parameters: Record<string, any>;
    userId?: string;
    conversationId?: string;
  }): Promise<ToolCallingValidationResult> {
    const errors = this.validateRequired(input.definition.requiredParameters, input.parameters);
    const warnings: string[] = [];

    if (input.definition.executionKind === 'orchestrator') {
      const validation = await this.toolOrchestrator.validateToolExecution({
        toolId: input.definition.executorToolId || input.definition.id,
        parameters: input.parameters,
        userId: input.userId || 'anonymous',
        conversationId: input.conversationId || 'tool-calling-validation',
      });
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }

    if (input.definition.executionKind === 'live-tracking') {
      warnings.push(
        'This tool returns demo-backed operational telemetry. It is not a live clinical alarm or autonomous dispatch source.',
      );
    }

    if (input.definition.executionKind === 'platform-demo') {
      warnings.push('This backend capability runs in demo mode and requires human review.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateRequired(
    requiredParameters: ToolParameterSpec[],
    parameters: Record<string, any>,
  ): string[] {
    return requiredParameters
      .filter((param) => !hasValue(parameters[param.name]))
      .map((param) => `Missing required parameter: ${param.name}`);
  }
}
