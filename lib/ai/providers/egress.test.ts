import { afterEach, describe, expect, it } from 'vitest';
import { AIError } from '../llmTransport';
import {
  getAiMonitorSnapshot,
  resetAiMonitor,
} from '../productionMonitoring';
import { completeViaEgress, getEgressHealth } from './egress';
import { getProviderCircuit, resetAllProviderCircuits } from './transportSafety';

describe('completeViaEgress', () => {
  const prevKill = process.env.AI_KILL_SWITCH;
  const prevProvider = process.env.AI_PROVIDER;
  const prevPatient = process.env.AI_PATIENT_CONTEXT_ENABLED;

  afterEach(() => {
    if (prevKill === undefined) delete process.env.AI_KILL_SWITCH;
    else process.env.AI_KILL_SWITCH = prevKill;
    if (prevProvider === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = prevProvider;
    if (prevPatient === undefined) delete process.env.AI_PATIENT_CONTEXT_ENABLED;
    else process.env.AI_PATIENT_CONTEXT_ENABLED = prevPatient;
    resetAiMonitor();
    resetAllProviderCircuits();
    delete process.env.AI_CIRCUIT_FAILURE_THRESHOLD;
    delete process.env.AI_CIRCUIT_COOLDOWN_MS;
  });

  it('blocks when AI_KILL_SWITCH is engaged', async () => {
    process.env.AI_KILL_SWITCH = '1';
    await expect(
      completeViaEgress({
        systemPrompt: 'test',
        requestType: 'COPILOT_CHAT' as any,
        messages: [{ role: 'user', content: 'hello' }],
      }),
    ).rejects.toMatchObject({ code: 'AI_KILL_SWITCH' });
  });

  it('uses local adapter without external network', async () => {
    delete process.env.AI_KILL_SWITCH;
    process.env.AI_PROVIDER = 'local';
    const result = await completeViaEgress({
      systemPrompt: 'You are a test assistant.',
      requestType: 'COPILOT_CHAT' as any,
      messages: [{ role: 'user', content: 'status?' }],
    });
    expect(result.ok).toBe(true);
    expect(String(result.content)).toContain('local AI adapter');
    expect(result.data.provider).toBe('local');
    expect(result.data.killSwitchChecked).toBe(true);
  });

  it('minimizes PHI before local completion', async () => {
    delete process.env.AI_KILL_SWITCH;
    process.env.AI_PROVIDER = 'local';
    const result = await completeViaEgress({
      systemPrompt: 'Safe system',
      requestType: 'COPILOT_CHAT' as any,
      messages: [{ role: 'user', content: 'Reach me at 555-987-6543' }],
    });
    expect(String(result.content)).not.toContain('555-987-6543');
    expect(result.data.phiMinimized).toBe(true);
  });

  it('reports adapter health', () => {
    const health = getEgressHealth();
    expect(health.adapters.length).toBeGreaterThanOrEqual(5);
    expect(health.adapters.some((a) => a.provider === 'anthropic')).toBe(true);
    expect(health.adapters.some((a) => a.provider === 'local' && a.ok)).toBe(true);
  });

  it('throws AIError instances from kill switch path', async () => {
    process.env.AI_KILL_SWITCH = 'true';
    try {
      await completeViaEgress({
        systemPrompt: 'x',
        requestType: 'COPILOT_CHAT' as any,
        message: 'y',
      });
      expect.fail('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AIError);
    }
  });

  it('live-local: records egress_success monitor event', async () => {
    delete process.env.AI_KILL_SWITCH;
    process.env.AI_PROVIDER = 'local';
    resetAiMonitor();
    await completeViaEgress({
      systemPrompt: 'You are a test assistant.',
      requestType: 'COPILOT_CHAT' as any,
      messages: [{ role: 'user', content: 'ping' }],
    });
    const snap = getAiMonitorSnapshot();
    expect(snap.counts.egress_success).toBeGreaterThanOrEqual(1);
  });

  it('live-local: patient-context gate strips patientId when disabled', async () => {
    delete process.env.AI_KILL_SWITCH;
    delete process.env.AI_PATIENT_CONTEXT_ENABLED;
    process.env.AI_PROVIDER = 'local';
    resetAiMonitor();
    const result = await completeViaEgress({
      systemPrompt: 'Safe system',
      requestType: 'COPILOT_CHAT' as any,
      patientId: 'should-not-leave-boundary',
      encounterId: 'enc-strip',
      context: { patient: { name: 'Secret' }, unit: 'ED' },
      messages: [{ role: 'user', content: 'summarize' }],
    });
    expect(result.ok).toBe(true);
    expect(result.data.provider).toBe('local');
    const snap = getAiMonitorSnapshot();
    expect(snap.counts.phi_redaction).toBeGreaterThanOrEqual(1);
    expect(
      snap.lastEvents.some(
        (e) => e.type === 'phi_redaction' && e.detail?.reason === 'patient_context_gate',
      ),
    ).toBe(true);
  });

  it('live-local: kill switch records monitor event', async () => {
    process.env.AI_KILL_SWITCH = '1';
    process.env.AI_PROVIDER = 'local';
    resetAiMonitor();
    await expect(
      completeViaEgress({
        systemPrompt: 'x',
        requestType: 'COPILOT_CHAT' as any,
        messages: [{ role: 'user', content: 'y' }],
      }),
    ).rejects.toMatchObject({ code: 'AI_KILL_SWITCH' });
    expect(getAiMonitorSnapshot().counts.kill_switch).toBeGreaterThanOrEqual(1);
  });

  it('reports patientContextEnabled on health', () => {
    delete process.env.AI_PATIENT_CONTEXT_ENABLED;
    const health = getEgressHealth();
    expect(health.patientContextEnabled).toBe(false);
  });

  it('reports request timeout and circuit snapshots on health', () => {
    const health = getEgressHealth();
    expect(typeof health.requestTimeoutMs).toBe('number');
    expect(health.requestTimeoutMs).toBeGreaterThan(0);
    expect(Array.isArray(health.circuits)).toBe(true);
  });

  it('fails fast with AI_CIRCUIT_OPEN when the provider circuit is open', async () => {
    delete process.env.AI_KILL_SWITCH;
    process.env.AI_PROVIDER = 'local';
    process.env.AI_CIRCUIT_FAILURE_THRESHOLD = '1';
    process.env.AI_CIRCUIT_COOLDOWN_MS = '60000';
    const circuit = getProviderCircuit('local');
    circuit.recordFailure();

    await expect(
      completeViaEgress({
        systemPrompt: 'x',
        requestType: 'COPILOT_CHAT' as any,
        messages: [{ role: 'user', content: 'y' }],
      }),
    ).rejects.toMatchObject({ code: 'AI_CIRCUIT_OPEN' });
  });

  it('records success and keeps the circuit closed on healthy local completion', async () => {
    delete process.env.AI_KILL_SWITCH;
    process.env.AI_PROVIDER = 'local';
    resetAllProviderCircuits();
    await completeViaEgress({
      systemPrompt: 'You are a test assistant.',
      requestType: 'COPILOT_CHAT' as any,
      messages: [{ role: 'user', content: 'ping' }],
    });
    expect(getProviderCircuit('local').state()).toBe('closed');
  });
});
