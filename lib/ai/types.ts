export type AIRequestType =
  | 'COPILOT_CHAT'
  | 'CLINICAL_SUMMARY'
  | 'SCORE_ASSIST'
  | 'INTAKE_SUGGESTION'
  | 'HANDOFF_BRIEF'
  | 'PROTOCOL_SUGGEST'
  | 'TRIAGE_ASSIST'
  | 'SHIFT_SUMMARY';

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}
