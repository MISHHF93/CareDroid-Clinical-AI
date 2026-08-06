import { AppNavigatorService } from './app-navigator.service';

describe('AppNavigatorService', () => {
  let service: AppNavigatorService;
  const originalGroqKey = process.env.GROQ_API_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env.GROQ_API_KEY;
    service = new AppNavigatorService();
  });

  afterEach(() => {
    if (originalGroqKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalGroqKey;
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
    global.fetch = jest.fn(async () => ({ ok: false, status: 503 })) as unknown as typeof fetch;

    const result = await service.query('where do I manage ambulances?');
    expect(result.source).toBe('catalog');
    expect(result.providerError).toContain('503');
    expect(result.answer).toContain(result.destinations[0].label);
  });
});
