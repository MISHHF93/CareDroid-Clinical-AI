/**
 * Clinical Tool Service Interface
 *
 * All clinical tools must implement this interface to ensure
 * consistent behavior and integration with the Tool Orchestrator.
 */

export interface ToolParameter {
  name: string;
  type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  required: boolean;
  description: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
}

export interface ToolMetadata {
  id: string;
  name: string;
  description: string;
  category: 'calculator' | 'checker' | 'interpreter' | 'protocol' | 'reference' | 'fleet';
  version: string;
  author?: string;
  references?: string[];
}

export interface ToolExecutionResult {
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
}

export interface ToolValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ClinicalToolService {
  /**
   * Get tool metadata (id, name, description, etc.)
   */
  getMetadata(): ToolMetadata;

  /**
   * Get tool parameter schema
   */
  getSchema(): ToolParameter[];

  /**
   * Validate input parameters
   */
  validate(parameters: Record<string, any>): ToolValidationResult;

  /**
   * Execute the tool with given parameters
   */
  execute(parameters: Record<string, any>): Promise<ToolExecutionResult>;

  /**
   * Get example usage
   */
  getExample?(): Record<string, any>;
}
