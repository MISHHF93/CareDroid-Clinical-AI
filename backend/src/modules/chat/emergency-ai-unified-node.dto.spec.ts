import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UnifiedNodeConversationalDto } from './emergency-ai.controller';

/**
 * Regression coverage for a real bug found by driving the actual live app
 * (real backend + real browser, not mocks): the frontend's browser client
 * (src/lib/ai/client.ts's bodyForBackendRequest) always sends a `stream`
 * key — even `stream: false` — but this DTO never declared it. The app's
 * global ValidationPipe uses whitelist:true + forbidNonWhitelisted:true
 * (backend/src/main.ts), which rejects unrecognized properties by presence,
 * not value — so every real call to POST /api/ai/node/conversational failed
 * with 400 "property stream should not exist", unconditionally, regardless
 * of streaming vs non-streaming. No prior test caught this because the only
 * existing spec for this file (emergency-ai.controller.spec.ts) asserts
 * against the source text, never against a real class-validator pass.
 */
async function validateAgainstDto(payload: Record<string, unknown>) {
  const instance = plainToInstance(UnifiedNodeConversationalDto, payload, {
    excludeExtraneousValues: false,
  });
  return validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
  });
}

describe('UnifiedNodeConversationalDto — real client payload shape', () => {
  const realBrowserClientPayload = {
    message: 'How many patients are currently active?',
    messages: [{ role: 'user', content: 'How many patients are currently active?' }],
    requestType: 'COPILOT_CHAT',
    systemPrompt: 'You are the CareDroid ED copilot.',
    workspaceContext: { aiRequest: { requestType: 'COPILOT_CHAT' } },
    patientId: undefined,
    encounterId: undefined,
    stream: false,
    purpose: 'CareDroid clinical decision support; human review required',
    sourceModule: 'emergency-os',
  };

  it('accepts the exact payload shape src/lib/ai/client.ts sends, including stream:false', async () => {
    const errors = await validateAgainstDto(realBrowserClientPayload);
    expect(errors).toEqual([]);
  });

  it('accepts stream:true (the actual streaming request case)', async () => {
    const errors = await validateAgainstDto({ ...realBrowserClientPayload, stream: true });
    expect(errors).toEqual([]);
  });

  it('still rejects a genuinely unrecognized property (whitelist stays enforced)', async () => {
    const errors = await validateAgainstDto({
      ...realBrowserClientPayload,
      notARealField: 'should be rejected',
    });
    const properties = errors.map((error) => error.property);
    expect(properties).toContain('notARealField');
  });
});
