/**
 * PHI / secret minimization applied at the single LLM egress boundary.
 * Pattern-based — not a full de-identification pipeline; prefer withholding
 * patient context (AI_PATIENT_CONTEXT_ENABLED=false) when possible.
 */

const PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\b\d{3}-\d{2}-\d{4}\b/g, label: '[redacted-ssn]' },
  { re: /\b(?:MRN|mrn|Medical Record(?: Number)?)[:\s#]*[A-Z0-9-]{4,}\b/gi, label: '[redacted-mrn]' },
  { re: /\b[A-Z]{2,4}-?\d{5,}\b/g, label: '[redacted-id]' },
  { re: /\b(?:sk|pk|tok|key|api)[_-][A-Za-z0-9_-]{8,}\b/gi, label: '[redacted-secret]' },
  { re: /\b\d{3}[-. ]?\d{3}[-. ]?\d{4}\b/g, label: '[redacted-phone]' },
  { re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, label: '[redacted-email]' },
  // US-style dates that often appear with DOB labels
  {
    re: /\b(?:DOB|Date of Birth|Born)[:\s]+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi,
    label: '[redacted-dob]',
  },
  {
    re: /\b(?:patient\s*(?:id|identifier)|encounter\s*id)[:\s#]*[A-Za-z0-9-]{4,}\b/gi,
    label: '[redacted-clinical-id]',
  },
];

export interface PhiMinimizeResult {
  text: string;
  redactionCount: number;
  labels: string[];
}

export function minimizePhiText(input: string): PhiMinimizeResult {
  let text = String(input ?? '');
  let redactionCount = 0;
  const labels = new Set<string>();

  for (const { re, label } of PATTERNS) {
    const next = text.replace(re, () => {
      redactionCount += 1;
      labels.add(label);
      return label;
    });
    text = next;
  }

  return { text, redactionCount, labels: [...labels] };
}

export function minimizePhiMessages<T extends { role: string; content: string }>(
  messages: T[],
): { messages: T[]; redactionCount: number } {
  let redactionCount = 0;
  const next = messages.map((message) => {
    const result = minimizePhiText(message.content);
    redactionCount += result.redactionCount;
    return { ...message, content: result.text };
  });
  return { messages: next, redactionCount };
}

export function minimizePhiRequest<T extends {
  systemPrompt: string;
  messages?: Array<{ role: string; content: string }>;
  message?: string;
}>(request: T): { request: T; redactionCount: number; phiMinimized: boolean } {
  const system = minimizePhiText(request.systemPrompt || '');
  const messagesResult = minimizePhiMessages(request.messages || []);
  const messageResult = request.message
    ? minimizePhiText(request.message)
    : { text: request.message, redactionCount: 0 };

  const redactionCount =
    system.redactionCount + messagesResult.redactionCount + (messageResult.redactionCount || 0);

  return {
    request: {
      ...request,
      systemPrompt: system.text,
      messages: messagesResult.messages as T['messages'],
      message: messageResult.text as T['message'],
    },
    redactionCount,
    phiMinimized: redactionCount > 0,
  };
}
