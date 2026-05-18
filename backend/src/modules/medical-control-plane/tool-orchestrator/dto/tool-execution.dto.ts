/**
 * Tool Execution DTOs
 */

import { ToolExecutionErrorCode } from '../tool-orchestrator.registry';

export class ExecuteToolDto {
  toolId: string;
  parameters: Record<string, any>;
  userId?: string;
  conversationId?: string;
}

export class ToolExecutionResponseDto {
  success: boolean;
  toolId: string;
  toolName: string;
  /** Original id from the request (may differ when aliases are used). */
  requestedToolId?: string;
  /** Canonical executor id after alias / registry resolution. */
  resolvedToolId?: string;
  errorCode?: ToolExecutionErrorCode;
  result: {
    success: boolean;
    data: Record<string, any>;
    interpretation?: string;
    citations?: Array<{
      title: string;
      url?: string;
      reference: string;
    }>;
    warnings?: string[];
    errors?: string[];
    disclaimer?: string;
    timestamp: Date;
  };
  executionTimeMs?: number;
}

export class ToolListDto {
  tools: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    version: string;
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      description: string;
    }>;
  }>;
  count: number;
  tier?: string;
  message?: string;
}

