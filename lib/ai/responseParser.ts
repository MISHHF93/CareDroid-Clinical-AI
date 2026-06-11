import {
  type AIRequestConfig,
  type AIResponse,
  type Message,
  type ToolCall,
  unifiedAIClient,
} from './client';
import {
  applyConfirmedToolAction,
  executeEmergencyTool,
  isMutatingTool,
  type EmergencyToolName,
  type EmergencyToolResult,
  type PendingToolAction,
} from './toolRegistry';

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
    const response = await unifiedAIClient.request({ ...config, stream: true });
    const content =
      response.content instanceof ReadableStream
        ? await readTokenStream(response.content, handlers)
        : String(response.content || '');
    const parsed = parseAIResponse({ ...response, content });
    handlers.onParsed?.(parsed);
    return parsed;
  } catch (error) {
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
      'Requires human confirmation. The AI cannot directly modify Emergency OS state.',
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
  if (!result.ok) {
    return { ok: false, error: result.error, requiresConfirmation: result.requiresConfirmation };
  }
  if (result.requiresConfirmation) {
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
  if (!result.ok || result.requiresConfirmation) return [];

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
  if (!allPatients.ok || allPatients.requiresConfirmation || !Array.isArray(allPatients.data)) {
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
      } catch (_error) {
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
  if (!result.ok || result.requiresConfirmation) return undefined;
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
