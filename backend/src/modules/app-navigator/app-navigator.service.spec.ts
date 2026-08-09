import { AppNavigatorService } from './app-navigator.service';
import { resetAllProviderCircuits } from '../../../../lib/ai/providers/transportSafety';

describe('AppNavigatorService', () => {
  let service: AppNavigatorService;
  const originalGroqKey = process.env.GROQ_API_KEY;
  const originalFetch = global.fetch;
  const originalKillSwitch = process.env.AI_KILL_SWITCH;

  beforeEach(() => {
    delete process.env.GROQ_API_KEY;
    resetAllProviderCircuits();
    service = new AppNavigatorService();
  });

  afterEach(() => {
    if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalGroqKey;
    if (originalKillSwitch === undefined) delete process.env.AI_KILL_SWITCH;
    else process.env.AI_KILL_SWITCH = originalKillSwitch;
    global.fetch = originalFetch;
  });

  it('getHealth() reports the indexed document count and groqConfigured=false when no key is set', () => {
    const health = service.getHealth();
    expect(health.ok).toBe(true);
    expect(health.documents).toBeGreaterThan(0);
    expect(health.groqConfigured).toBe(false);
  });

  it('getCatalog() returns every indexed record with a generatedAt timestamp', () => {
    const catalog = service.getCatalog();
    expect(catalog.records.length).toBe(service.getHealth().documents);
    expect(typeof catalog.generatedAt).toBe('string');
  });

  it('query() finds a real catalog record for a workflow-shaped question, catalog-only mode', async () => {
    const result = await service.query('where do I manage ambulances?');
    expect(result.source).toBe('catalog');
    expect(result.providerError).toBeNull();
    expect(result.destinations.length).toBeGreaterThan(0);
    expect(result.answer).toContain(result.destinations[0].label);
  });

  it('query() never invents a route — destinations are always drawn from the closed catalog', async () => {
    const result = await service.query('completely unrelated nonsense zzz111');
    expect(result.destinations).toEqual([]);
    expect(result.answer).toContain('could not map');
  });

  it('query() uses Groq synthesis when GROQ_API_KEY is set and the call succeeds', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Try the Command Center at /emergency/command-center.' } }] }),
    })) as unknown as typeof fetch;

    const result = await service.query('where do I manage ambulances?');
    expect(result.source).toBe('groq');
    expect(result.answer).toBe('Try the Command Center at /emergency/command-center.');
    expect(result.providerError).toBeNull();
  });

  it('query() degrades to the deterministic catalog answer when Groq fails', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    const result = await service.query('where do I manage ambulances?');
    expect(result.source).toBe('catalog');
    expect(result.providerError).toContain('503');
    expect(result.answer).toContain(result.destinations[0].label);
  });

  /**
   * Regression coverage for a real governance gap found by a repository-wide
   * AI-egress audit (2026-08-08): this service used to call api.groq.com
   * directly with its own bespoke fetch, bypassing the shared LLM egress
   * boundary (lib/ai/providers/egress.ts) that AI_KILL_SWITCH depends on.
   * An operator flipping the kill switch during an incident would not have
   * actually stopped this path. Now routed through callAI(), the kill
   * switch must degrade every Groq-backed navigator answer to the
   * deterministic catalog fallback, with no network call attempted.
   */
  it('honors AI_KILL_SWITCH — a Groq-backed query degrades to the catalog answer with no network call', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    process.env.AI_KILL_SWITCH = '1';
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await service.query('where do I manage ambulances?');

    expect(result.source).toBe('catalog');
    expect(result.providerError).toContain('AI_KILL_SWITCH');
    expect(result.answer).toContain(result.destinations[0].label);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
