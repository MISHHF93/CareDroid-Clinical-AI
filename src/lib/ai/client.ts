import { apiFetch, parseApiResponse } from '../apiClient';

export type AIRequestType =
  | 'COPILOT_CHAT'
  | 'HANDOFF_BRIEF'
  | 'SCORE_ASSIST'
  | 'INTAKE_SUGGEST'
  | 'PROTOCOL_SUGGEST';

export type AIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AIRequest = {
  type: AIRequestType;
  message?: string;
  messages?: AIMessage[];
  context?: Record<string, unknown>;
  patientId?: string;
  encounterId?: string;
  stream?: boolean;
};

export type AIResponse = {
  ok: boolean;
  status: number;
  content: string;
  data: Record<string, unknown>;
};

const ROUTE_BY_TYPE: Record<AIRequestType, string> = {
  COPILOT_CHAT: '/api/emergency/copilot/message',
  HANDOFF_BRIEF: '/api/chat/message',
  SCORE_ASSIST: '/api/chat/message',
  INTAKE_SUGGEST: '/api/chat/suggest-action',
  PROTOCOL_SUGGEST: '/api/chat/message',
};

function textFromData(data: Record<string, unknown>): string {
  const response = data.response;
  if (typeof response === 'string') return response;
  const message = data.message;
  if (typeof message === 'string') return message;
  const content = data.content;
  if (typeof content === 'string') return content;
  return '';
}

function bodyForRequest(request: AIRequest): Record<string, unknown> {
  const latestUserMessage = [...(request.messages || [])].reverse().find((message) => message.role === 'user');
  return {
    message: request.message || latestUserMessage?.content || '',
    messages: request.messages,
    requestType: request.type,
    workspaceContext: request.context,
    patientId: request.patientId,
    encounterId: request.encounterId,
    purpose: 'Emergency OS clinical decision support; human review required',
    sourceModule: 'emergency-os',
  };
}

export async function callAI(request: AIRequest): Promise<AIResponse> {
  const response = await apiFetch(ROUTE_BY_TYPE[request.type], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyForRequest(request)),
  });
  const data = await parseApiResponse(response, { fallback: {} }) as Record<string, unknown>;
  return {
    ok: response.ok,
    status: response.status,
    content: textFromData(data),
    data,
  };
}

export async function streamAI(request: AIRequest): Promise<ReadableStream<Uint8Array>> {
  const response = await apiFetch(ROUTE_BY_TYPE[request.type], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ ...bodyForRequest(request), stream: true }),
  });

  if (!response.body) {
    const fallback = await parseApiResponse(response, { fallback: {} }) as Record<string, unknown>;
    const encoder = new TextEncoder();
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(textFromData(fallback)));
        controller.close();
      },
    });
  }

  return response.body;
}

export default Object.freeze({
  callAI,
  streamAI,
});
