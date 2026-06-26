import {
  buildDepartmentContext,
  buildSystemPrompt,
  type DepartmentContext,
} from '../../../lib/ai/contextEngine';
import {
  applyConfirmedToolAction,
  executeEmergencyTool,
  getToolsForRequestType,
  isMutatingTool,
  type EmergencyToolName,
  type EmergencyToolResult,
} from '../../../lib/ai/toolRegistry';
import type { ToolDefinition } from '../../../lib/ai/types';

export type { ToolDefinition };

export type AIRequestType =
  | 'COPILOT_CHAT'
  | 'HANDOFF_BRIEF'
  | 'SCORE_ASSIST'
  | 'INTAKE_SUGGEST'
  | 'PROTOCOL_SUGGEST'
  | 'CLINICAL_SUMMARY'
  | 'INTAKE_SUGGESTION'
  | 'TRIAGE_ASSIST'
  | 'SHIFT_SUMMARY'
  | 'STAFF_BALANCE'
  | 'CAPACITY_CRISIS';

type ToolRegistryRequestType = Exclude<AIRequestType, 'INTAKE_SUGGEST' | 'STAFF_BALANCE' | 'CAPACITY_CRISIS'>;

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export type AIMessage = Message;

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface AIRequest {
  messages?: Message[];
  systemPrompt: string;
  requestType: AIRequestType;
  stream?: boolean;
  maxTokens?: number;
  tools?: ToolDefinition[];
  context?: Record<string, unknown> | DepartmentContext;
  message?: string;
  type?: AIRequestType;
  patientId?: string;
  encounterId?: string;
}

export interface AIRequestConfig extends AIRequest {}

export interface AIResponse {
  ok: boolean;
  status: number;
  content: string | ReadableStream<Uint8Array>;
  data: Record<string, unknown>;
  toolCalls: ToolCall[];
  usage: AIUsage;
  requestType: AIRequestType;
}

export type AIErrorCode =
  | 'AI_AUTH_ERROR'
  | 'AI_RATE_LIMIT'
  | 'AI_BAD_REQUEST'
  | 'AI_STREAM_ERROR'
  | 'AI_PROVIDER_ERROR'
  | 'AI_NETWORK_ERROR'
  | 'AI_CONFIG_ERROR';

export class AIError extends Error {
  readonly code: AIErrorCode;
  readonly status?: number;
  readonly requestType?: AIRequestType;
  readonly retryable: boolean;

  constructor(input: {
    message: string;
    code: AIErrorCode;
    status?: number;
    requestType?: AIRequestType;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(input.message);
    this.name = 'AIError';
    this.code = input.code;
    this.status = input.status;
    this.requestType = input.requestType;
    this.retryable = input.retryable ?? false;
    if (input.cause) {
      (this as any).cause = input.cause;
    }
  }
}

type DepartmentContextResolver = () => DepartmentContext | undefined;
type MetadataLogger = (metadata: {
  requestType: AIRequestType;
  model: string;
  stream: boolean;
  maxTokens: number;
  usage: AIUsage;
  toolCallCount: number;
}) => void;

export const UNIFIED_AI_MODEL = 'claude-sonnet-4-6';
export const DEFAULT_AI_MAX_TOKENS = 1000;

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

const EMERGENCY_AI_ROUTES = {
  copilot: '/api/emergency/copilot/message',
  intake: '/api/emergency/intake/ai/message',
  referrals: '/api/emergency/referrals/ai/message',
  analytics: '/api/emergency/analytics/ai/message',
} as const;

const ROUTE_BY_TYPE: Record<AIRequestType, string> = {
  COPILOT_CHAT: EMERGENCY_AI_ROUTES.copilot,
  HANDOFF_BRIEF: '/api/chat/message',
  SCORE_ASSIST: '/api/chat/message',
  INTAKE_SUGGEST: EMERGENCY_AI_ROUTES.intake,
  PROTOCOL_SUGGEST: '/api/chat/message',
  CLINICAL_SUMMARY: EMERGENCY_AI_ROUTES.referrals,
  INTAKE_SUGGESTION: EMERGENCY_AI_ROUTES.intake,
  TRIAGE_ASSIST: '/api/chat/message',
  SHIFT_SUMMARY: EMERGENCY_AI_ROUTES.analytics,
  STAFF_BALANCE: '/api/chat/message',
  CAPACITY_CRISIS: '/api/chat/message',
};

class UnifiedAIClient {
  private apiKey?: string;
  private contextResolver?: DepartmentContextResolver;
  private metadataLogger?: MetadataLogger;

  configure(input: {
    apiKey?: string;
    contextResolver?: DepartmentContextResolver;
    metadataLogger?: MetadataLogger;
  }) {
    this.apiKey = input.apiKey || this.apiKey;
    this.contextResolver = input.contextResolver || this.contextResolver;
    this.metadataLogger = input.metadataLogger || this.metadataLogger;
  }

  async request(config: AIRequestConfig): Promise<AIResponse> {
    return callAI(config, {
      apiKey: this.apiKey,
      contextResolver: this.contextResolver,
      metadataLogger: this.metadataLogger,
    });
  }
}

export const unifiedAIClient = new UnifiedAIClient();

export async function callAI(
  request: AIRequest,
  runtime?: {
    apiKey?: string;
    contextResolver?: DepartmentContextResolver;
    metadataLogger?: MetadataLogger;
  },
): Promise<AIResponse> {
  const normalized = normalizeRequest(request);
  if (isBrowserRuntime()) {
    return callBackendAI(normalized);
  }
  return callAnthropicAI(normalized, runtime);
}

export function streamAI(request: AIRequest): Promise<ReadableStream<Uint8Array>>;
export function streamAI(
  request: AIRequest,
  onChunk: (text: string) => void,
  onDone: () => void,
): Promise<void>;
export async function streamAI(
  request: AIRequest,
  onChunk?: (text: string) => void,
  onDone?: () => void,
): Promise<ReadableStream<Uint8Array> | void> {
  const response = await callAI({ ...request, stream: true });
  const stream =
    response.content instanceof ReadableStream
      ? response.content
      : textToStream(String(response.content || ''));

  if (!onChunk) {
    return stream;
  }

  await readTokenStream(stream, {
    onToken: (token) => onChunk(token),
  });
  onDone?.();
}

function normalizeRequest(request: AIRequest): AIRequest {
  const requestType = normalizeRequestType(request.requestType || request.type || 'COPILOT_CHAT');
  const messages = normalizeMessages(request.messages || []);
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');

  return {
    ...request,
    requestType,
    messages: messages.length ? messages : [{ role: 'user', content: request.message || 'Continue.' }],
    message: request.message || latestUserMessage?.content || '',
    systemPrompt:
      request.systemPrompt || buildSystemPrompt(buildDepartmentContext(), toToolRequestType(requestType)),
  };
}

function normalizeRequestType(requestType: AIRequestType): AIRequestType {
  return requestType === 'INTAKE_SUGGEST' ? 'INTAKE_SUGGESTION' : requestType;
}

function toToolRequestType(requestType: AIRequestType): ToolRegistryRequestType {
  const normalized = normalizeRequestType(requestType);
  return (normalized === 'STAFF_BALANCE' || normalized === 'CAPACITY_CRISIS' ? 'COPILOT_CHAT' : normalized) as ToolRegistryRequestType;
}

function normalizeMessages(messages: Array<{ role: string; content: string }>): Message[] {
  return messages
    .filter((message) => message?.content && (message.role === 'user' || message.role === 'assistant'))
    .map((message) => ({
      role: (message.role === 'assistant' ? 'assistant' : 'user') as Message['role'],
      content: String(message.content),
    }));
}

async function callBackendAI(request: AIRequest): Promise<AIResponse> {
  const { apiFetch, parseApiResponse } = await import('../apiClient');
  const response = await apiFetch(ROUTE_BY_TYPE[request.requestType], {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(request.stream ? { Accept: 'text/event-stream' } : {}),
    },
    body: JSON.stringify(bodyForBackendRequest(request)),
  });

  if (request.stream && response.body) {
    return {
      ok: response.ok,
      status: response.status,
      content: response.body,
      data: {},
      toolCalls: [],
      usage: emptyUsage(),
      requestType: request.requestType,
    };
  }

  const data = (await parseApiResponse(response, { fallback: {} })) as Record<string, unknown>;
  return {
    ok: response.ok,
    status: response.status,
    content: textFromData(data),
    data,
    toolCalls: [],
    usage: emptyUsage(),
    requestType: request.requestType,
  };
}

function bodyForBackendRequest(request: AIRequest): Record<string, unknown> {
  const context = (isRecord(request.context) ? request.context : {}) as Record<string, any>;
  const aiRequest = isRecord(context.aiRequest) ? context.aiRequest : {};
  const edCopilot = isRecord(context.edCopilot) ? context.edCopilot : {};

  return {
    message: request.message || latestUserContent(request.messages ?? []),
    messages: request.messages,
    requestType: request.requestType,
    systemPrompt: request.systemPrompt,
    workspaceContext: {
      ...context,
      aiRequest: {
        ...aiRequest,
        requestType: request.requestType,
        systemPrompt: request.systemPrompt,
        patientId: request.patientId,
        encounterId: request.encounterId,
        toolsEnabled: request.tools?.length === 0 ? false : undefined,
      },
      ...(request.requestType === 'COPILOT_CHAT'
        ? {
            edCopilot: {
              enabled: true,
              ...edCopilot,
              systemPrompt: request.systemPrompt,
            },
          }
        : {}),
    },
    patientId: request.patientId,
    encounterId: request.encounterId,
    stream: request.stream === true,
    purpose: 'CareDroid clinical decision support; human review required',
    sourceModule: 'emergency-os',
  };
}

async function callAnthropicAI(
  request: AIRequest,
  runtime?: {
    apiKey?: string;
    contextResolver?: DepartmentContextResolver;
    metadataLogger?: MetadataLogger;
  },
): Promise<AIResponse> {
  const apiKey = runtime?.apiKey || readApiKey();
  if (!apiKey) {
    throw new AIError({
      message: 'Anthropic API key not configured',
      code: 'AI_CONFIG_ERROR',
      requestType: request.requestType,
    });
  }

  const maxTokens = request.maxTokens || DEFAULT_AI_MAX_TOKENS;
  const usage = emptyUsage();
  const departmentContext =
    (request.context as DepartmentContext | undefined) ||
    runtime?.contextResolver?.() ||
    buildDepartmentContext();
  const tools =
    request.tools !== undefined
      ? request.tools
      : getToolsForRequestType(toToolRequestType(request.requestType));
  const body = {
    model: UNIFIED_AI_MODEL,
    max_tokens: maxTokens,
    system: withDepartmentContext(request.systemPrompt, departmentContext),
    messages: request.messages,
    tools: tools.length ? tools : undefined,
    stream: request.stream === true,
  };

  try {
    const response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw await toAIError(response, request.requestType);
    }

    if (request.stream) {
      return {
        ok: true,
        status: response.status,
        content: createStreamingHandler(response, usage, request, maxTokens, runtime?.metadataLogger),
        data: {},
        toolCalls: [],
        usage,
        requestType: request.requestType,
      };
    }

    const data = await response.json();
    const parsed = parseAnthropicResponse(data);
    applyUsage(usage, data?.usage);
    logMetadata(runtime?.metadataLogger, request, maxTokens, usage, parsed.toolCalls.length, false);

    return {
      ok: true,
      status: response.status,
      content: parsed.content,
      data,
      toolCalls: parsed.toolCalls,
      usage,
      requestType: request.requestType,
    };
  } catch (error: any) {
    throw handleError(error, request.requestType);
  }
}

function readApiKey(): string | undefined {
  return typeof process !== 'undefined' ? process.env.ANTHROPIC_API_KEY ?? '' : '';
}

function withDepartmentContext(systemPrompt: string, explicitContext?: DepartmentContext): string {
  if (systemPrompt.includes('Current department context:')) {
    return systemPrompt;
  }

  if (!explicitContext || Object.keys(explicitContext).length === 0) {
    return systemPrompt;
  }

  return [
    systemPrompt,
    '',
    'Department context is provided for situational awareness. Use it only for decision support and never make autonomous clinical decisions.',
    JSON.stringify(explicitContext),
  ].join('\n');
}

function createStreamingHandler(
  response: Response,
  usage: AIUsage,
  request: AIRequest,
  maxTokens: number,
  metadataLogger?: MetadataLogger,
): ReadableStream<Uint8Array> {
  const source = response.body;
  if (!source) {
    throw new AIError({
      message: 'AI streaming response body was empty',
      code: 'AI_STREAM_ERROR',
      requestType: request.requestType,
    });
  }

  const reader = source.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  return new ReadableStream<Uint8Array>({
    start: async (controller) => {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          for (const event of events) {
            const text = parseStreamEvent(event, usage);
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        }
        logMetadata(metadataLogger, request, maxTokens, usage, 0, true);
        controller.close();
      } catch (error: any) {
        controller.error(handleError(error, request.requestType));
      } finally {
        reader.releaseLock();
      }
    },
  });
}

function parseStreamEvent(event: string, usage: AIUsage): string {
  const dataLine = event
    .split('\n')
    .find((line) => line.startsWith('data: '))
    ?.replace(/^data: /, '');

  if (!dataLine || dataLine === '[DONE]') return '';

  const data = JSON.parse(dataLine);
  if (data.type === 'message_start') {
    applyUsage(usage, data.message?.usage);
  }
  if (data.type === 'message_delta') {
    applyUsage(usage, data.usage);
  }
  if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
    return data.delta.text || '';
  }
  return '';
}

function parseAnthropicResponse(data: any): { content: string; toolCalls: ToolCall[] } {
  const contentBlocks = Array.isArray(data?.content) ? data.content : [];
  const text = contentBlocks
    .map((block: any) => (block?.type === 'text' ? block.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
  const toolCalls = contentBlocks
    .filter((block: any) => block?.type === 'tool_use')
    .map((block: any) => ({
      id: block.id,
      name: block.name,
      input: block.input || {},
    }));

  return { content: text, toolCalls };
}

async function toAIError(response: Response, requestType: AIRequestType): Promise<AIError> {
  const data = await response.json().catch(() => ({}));
  const message = data?.error?.message || data?.message || `AI provider error ${response.status}`;

  if (response.status === 401 || response.status === 403) {
    return new AIError({ message, code: 'AI_AUTH_ERROR', status: response.status, requestType });
  }
  if (response.status === 429) {
    return new AIError({
      message,
      code: 'AI_RATE_LIMIT',
      status: response.status,
      requestType,
      retryable: true,
    });
  }
  if (response.status >= 400 && response.status < 500) {
    return new AIError({ message, code: 'AI_BAD_REQUEST', status: response.status, requestType });
  }
  return new AIError({
    message,
    code: 'AI_PROVIDER_ERROR',
    status: response.status,
    requestType,
    retryable: true,
  });
}

function handleError(error: unknown, requestType: AIRequestType): AIError {
  if (error instanceof AIError) {
    return error;
  }
  return new AIError({
    message: error instanceof Error ? error.message : String(error),
    code: 'AI_NETWORK_ERROR',
    requestType,
    retryable: true,
    cause: error,
  });
}

function applyUsage(target: AIUsage, source: any) {
  if (!source) return;
  target.inputTokens = source.input_tokens ?? target.inputTokens;
  target.outputTokens = source.output_tokens ?? target.outputTokens;
  target.totalTokens = target.inputTokens + target.outputTokens;
}

function emptyUsage(): AIUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };
}

function logMetadata(
  metadataLogger: MetadataLogger | undefined,
  request: AIRequest,
  maxTokens: number,
  usage: AIUsage,
  toolCallCount: number,
  stream: boolean,
) {
  const metadata = {
    requestType: request.requestType,
    model: UNIFIED_AI_MODEL,
    stream,
    maxTokens,
    usage: { ...usage },
    toolCallCount,
  };

  if (metadataLogger) {
    metadataLogger(metadata);
    return;
  }

  if (typeof console !== 'undefined') {
    console.info('[AI]', metadata);
  }
}

function latestUserContent(messages: Message[]): string {
  return [...messages].reverse().find((message) => message.role === 'user')?.content || '';
}

function textFromData(data: Record<string, unknown>): string {
  const response = data.response;
  if (typeof response === 'string') return response;
  const message = data.message;
  if (typeof message === 'string') return message;
  const content = data.content;
  if (typeof content === 'string') return content;
  return '';
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function textToStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

export interface ToolCallResult {
  id: string;
  toolName: EmergencyToolName;
  input: Record<string, any>;
  result: EmergencyToolResult;
  readOnly: boolean;
  requiresConfirmation: boolean;
  contextMessage?: Message;
}

export interface ActionCard {
  id: string;
  toolName: EmergencyToolName;
  label: string;
  description: string;
  patientName?: string;
  warningText?: string;
  onConfirm: () => Promise<EmergencyToolResult>;
  onDismiss: () => void;
}

export interface DataBlock {
  id: string;
  type: 'patient_list' | 'queue_stats' | 'capacity_status' | 'tool_result' | 'json';
  title: string;
  data: any;
}

export interface Citation {
  id: string;
  type: 'patient';
  label: string;
  patientId: string;
  onClick: () => void;
}

export interface ParsedResponse {
  displayText: string;
  toolCalls: ToolCallResult[];
  actionCards: ActionCard[];
  dataBlocks: DataBlock[];
  citations: Citation[];
}

export interface StreamAIResponseHandlers {
  onToken?: (token: string, fullText: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
  onParsed?: (parsed: ParsedResponse) => void;
  onError?: (error: unknown) => void;
}

const actionCardDismissHandlers = new Map<string, () => void>();
let latestToolContextMessages: Message[] = [];

export async function streamAIResponse(
  config: AIRequestConfig,
  handlers: StreamAIResponseHandlers = {},
): Promise<ParsedResponse> {
  handlers.onTypingChange?.(true);

  try {
    const response = await callAI({ ...config, stream: true });
    const content =
      response.content instanceof ReadableStream
        ? await readTokenStream(response.content, handlers)
        : String(response.content || '');
    const parsed = parseAIResponse({ ...response, content });
    handlers.onParsed?.(parsed);
    return parsed;
  } catch (error: any) {
    handlers.onError?.(error);
    throw error;
  } finally {
    handlers.onTypingChange?.(false);
  }
}

export function parseAIResponse(response: AIResponse): ParsedResponse {
  const displayText = cleanDisplayText(contentToText(response.content));
  const rawToolCalls = extractToolCalls(response, displayText);
  const toolCalls = rawToolCalls.map(processToolCall);
  const actionCards = toolCalls
    .filter((toolCall) => toolCall.requiresConfirmation && 'action' in toolCall.result)
    .map((toolCall) => buildActionCard(toolCall));
  const dataBlocks = [
    ...toolCalls.flatMap((toolCall) => dataBlocksFromToolResult(toolCall)),
    ...detectInlineDataBlocks(displayText),
  ];
  const citations = detectPatientCitations(displayText);

  latestToolContextMessages = toolCalls
    .map((toolCall) => toolCall.contextMessage)
    .filter((message): message is Message => Boolean(message));

  return {
    displayText,
    toolCalls,
    actionCards,
    dataBlocks: dedupeDataBlocks(dataBlocks),
    citations,
  };
}

export function getLatestToolContextMessages(): Message[] {
  return [...latestToolContextMessages];
}

export function buildToolResultContextMessages(parsed: ParsedResponse): Message[] {
  return parsed.toolCalls
    .map((toolCall) => toolCall.contextMessage)
    .filter((message): message is Message => Boolean(message));
}

export function injectToolResultsIntoMessages(
  messages: Message[],
  parsed: ParsedResponse,
): Message[] {
  return [...messages, ...buildToolResultContextMessages(parsed)];
}

export function removeCard(cardId: string) {
  const handler = actionCardDismissHandlers.get(cardId);
  handler?.();
  actionCardDismissHandlers.delete(cardId);
}

async function readTokenStream(
  stream: ReadableStream<Uint8Array>,
  handlers: StreamAIResponseHandlers,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const token = decoder.decode(value, { stream: true });
      if (!token) continue;
      fullText += token;
      handlers.onToken?.(token, fullText);
    }
    const trailing = decoder.decode();
    if (trailing) {
      fullText += trailing;
      handlers.onToken?.(trailing, fullText);
    }
    return fullText;
  } finally {
    reader.releaseLock();
  }
}

function processToolCall(toolCall: ToolCall): ToolCallResult {
  const toolName = toolCall.name as EmergencyToolName;
  const readOnly = !isMutatingTool(toolName);
  const result = executeEmergencyTool(toolName, toolCall.input || {});

  return {
    id: toolCall.id || toolCallId(toolName),
    toolName,
    input: toolCall.input || {},
    result,
    readOnly,
    requiresConfirmation: result.requiresConfirmation === true,
    contextMessage: buildToolContextMessage(toolName, result),
  };
}

function buildActionCard(toolCall: ToolCallResult): ActionCard {
  const result = toolCall.result as Extract<EmergencyToolResult, { requiresConfirmation: true }>;
  const action = result.action;
  const id = `action-card-${toolCall.id}`;
  const patientName = resolvePatientName(action.input.patientId);

  actionCardDismissHandlers.set(id, () => undefined);

  return {
    id,
    toolName: action.toolName,
    label: action.label,
    description: action.description,
    patientName,
    warningText:
      'Requires human confirmation. The AI cannot directly modify CareDroid state.',
    onConfirm: () => applyConfirmedToolAction(action),
    onDismiss: () => removeCard(id),
  };
}

function buildToolContextMessage(toolName: EmergencyToolName, result: EmergencyToolResult): Message {
  return {
    role: 'assistant',
    content: [
      `Tool result for ${toolName}:`,
      JSON.stringify(safeToolResultForContext(result)),
    ].join('\n'),
  };
}

function safeToolResultForContext(result: EmergencyToolResult) {
  if (result.ok === false) {
    return { ok: false, error: result.error, requiresConfirmation: result.requiresConfirmation };
  }
  if (result.requiresConfirmation === true) {
    return {
      ok: true,
      requiresConfirmation: true,
      action: {
        toolName: result.action.toolName,
        label: result.action.label,
        description: result.action.description,
      },
    };
  }
  return { ok: true, data: result.data };
}

function dataBlocksFromToolResult(toolCall: ToolCallResult): DataBlock[] {
  const result = toolCall.result;
  if (result.ok !== true || result.requiresConfirmation === true) return [];

  if (toolCall.toolName === 'search_patients') {
    return [
      {
        id: `data-${toolCall.id}-patients`,
        type: 'patient_list',
        title: 'Patients',
        data: result.data,
      },
    ];
  }

  if (toolCall.toolName === 'get_queue_status') {
    return [
      {
        id: `data-${toolCall.id}-queues`,
        type: 'queue_stats',
        title: 'Queue Status',
        data: result.data,
      },
    ];
  }

  if (toolCall.toolName === 'get_capacity_status') {
    return [
      {
        id: `data-${toolCall.id}-capacity`,
        type: 'capacity_status',
        title: 'Capacity Status',
        data: result.data,
      },
    ];
  }

  return [
    {
      id: `data-${toolCall.id}`,
      type: 'tool_result',
      title: toolCall.toolName,
      data: result.data,
    },
  ];
}

function detectInlineDataBlocks(displayText: string): DataBlock[] {
  const blocks: DataBlock[] = [];
  const jsonBlocks = extractJsonObjects(displayText);

  jsonBlocks.forEach((data, index) => {
    const type = classifyDataBlock(data);
    if (!type) return;
    blocks.push({
      id: `inline-data-${index}`,
      type,
      title: titleForDataBlock(type),
      data,
    });
  });

  if (!blocks.length && looksLikePatientList(displayText)) {
    blocks.push({
      id: 'text-patient-list',
      type: 'patient_list',
      title: 'Patient List',
      data: displayText,
    });
  }

  return blocks;
}

function detectPatientCitations(displayText: string): Citation[] {
  const allPatients = executeEmergencyTool('search_patients', { query: '' });
  if (
    allPatients.ok !== true ||
    allPatients.requiresConfirmation === true ||
    !Array.isArray(allPatients.data)
  ) {
    return [];
  }

  return allPatients.data
    .filter((patient: any) => patient?.id && patient?.name && displayText.includes(patient.name))
    .map((patient: any) => ({
      id: `citation-patient-${patient.id}`,
      type: 'patient' as const,
      label: patient.name,
      patientId: patient.id,
      onClick: () => openPatientDetail(patient.id),
    }));
}

function extractToolCalls(response: AIResponse, displayText: string): ToolCall[] {
  const directCalls = Array.isArray(response.toolCalls) ? response.toolCalls : [];
  return [...directCalls, ...extractInlineToolCalls(displayText)];
}

function extractInlineToolCalls(displayText: string): ToolCall[] {
  return extractJsonObjects(displayText)
    .flatMap((data, index) => {
      if (Array.isArray(data?.toolCalls)) {
        return data.toolCalls.map((toolCall: any, callIndex: number) =>
          normalizeInlineToolCall(toolCall, `inline-${index}-${callIndex}`),
        );
      }

      if (data?.toolName || data?.name || data?.tool_use) {
        return [normalizeInlineToolCall(data, `inline-${index}`)];
      }

      return [];
    })
    .filter((toolCall): toolCall is ToolCall => Boolean(toolCall));
}

function normalizeInlineToolCall(data: any, fallbackId: string): ToolCall | null {
  const name = data?.name || data?.toolName || data?.tool_use?.name;
  if (!name) return null;
  return {
    id: data?.id || fallbackId,
    name,
    input: data?.input || data?.arguments || data?.tool_use?.input || {},
  };
}

function extractJsonObjects(text: string): any[] {
  const blocks: string[] = [];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/gi) || [];
  fenced.forEach((block) => {
    blocks.push(block.replace(/```(?:json)?/i, '').replace(/```$/, '').trim());
  });

  const loose = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/g) || [];
  blocks.push(...loose);

  return blocks
    .map((block) => {
      try {
        return JSON.parse(block);
      } catch (_error: any) {
        return null;
      }
    })
    .filter(Boolean);
}

function classifyDataBlock(data: any): DataBlock['type'] | null {
  if (Array.isArray(data) && data.some((item) => item?.state && item?.complaint)) {
    return 'patient_list';
  }
  if (Array.isArray(data) && data.some((item) => item?.averageWaitMinutes || item?.patientIds)) {
    return 'queue_stats';
  }
  if (data?.currentOccupancy !== undefined || data?.boardingCount !== undefined || data?.capacity?.score) {
    return 'capacity_status';
  }
  if (data?.patients && Array.isArray(data.patients)) return 'patient_list';
  if (data?.queues && Array.isArray(data.queues)) return 'queue_stats';
  return null;
}

function titleForDataBlock(type: DataBlock['type']): string {
  if (type === 'patient_list') return 'Patient List';
  if (type === 'queue_stats') return 'Queue Stats';
  if (type === 'capacity_status') return 'Capacity';
  return 'Structured Data';
}

function looksLikePatientList(text: string): boolean {
  return /patient(s)?\b/i.test(text) && /\b(P1|P2|P3|P4|P5|Waiting|Triage|Assessment)\b/.test(text);
}

function resolvePatientName(patientId?: string): string | undefined {
  if (!patientId) return undefined;
  const result = executeEmergencyTool('get_patient_details', { patientId });
  if (result.ok !== true || result.requiresConfirmation === true) return undefined;
  const patient = result.data;
  return patient?.name || [patient?.firstName, patient?.lastName].filter(Boolean).join(' ') || patientId;
}

function openPatientDetail(patientId: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ed:open-patient-detail', { detail: { patientId } }));
  }
}

function cleanDisplayText(content: string): string {
  return content
    .replace(/```(?:json)?\s*[\s\S]*?```/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function contentToText(content: AIResponse['content']): string {
  return typeof content === 'string' ? content : '';
}

function dedupeDataBlocks(blocks: DataBlock[]): DataBlock[] {
  const seen = new Set<string>();
  return blocks.filter((block) => {
    const key = `${block.type}:${JSON.stringify(block.data).slice(0, 160)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toolCallId(toolName: EmergencyToolName): string {
  return `${toolName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default Object.freeze({
  callAI,
  streamAI,
  unifiedAIClient,
});
