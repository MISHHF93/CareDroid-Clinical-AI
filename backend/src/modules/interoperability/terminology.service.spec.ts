import { Test } from '@nestjs/testing';
import { TERMINOLOGY_SYSTEM_URIS, TerminologyService } from './terminology.service';

/** Real shape returned by the NLM Clinical Table Search Service. */
const ICD10_PAYLOAD = [
  3,
  ['R07.89', 'R07.9', 'R07.1'],
  null,
  [
    ['R07.89', 'Other chest pain'],
    ['R07.9', 'Chest pain, unspecified'],
    ['R07.1', 'Chest pain on breathing'],
  ],
];

/** Real shape returned by RxNav. */
const RXNORM_PAYLOAD = {
  drugGroup: {
    conceptGroup: [
      { tty: 'BPCK' },
      {
        tty: 'SBD',
        conceptProperties: [
          { rxcui: '2047766', name: '24 HR metoprolol succinate 100 MG', tty: 'SBD' },
          { rxcui: '1234567', name: 'metoprolol tartrate 25 MG', tty: 'SBD' },
        ],
      },
    ],
  },
};

function mockFetchOnce(payload: unknown, ok = true, status = 200) {
  return jest.fn().mockResolvedValue({ ok, status, json: async () => payload });
}

describe('TerminologyService', () => {
  let service: TerminologyService;
  const originalFetch = global.fetch;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [TerminologyService] }).compile();
    service = moduleRef.get(TerminologyService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns real ICD-10-CM codings, not a system label with no code', async () => {
    global.fetch = mockFetchOnce(ICD10_PAYLOAD) as unknown as typeof fetch;

    const result = await service.search('icd10cm', 'chest pain', { limit: 3 });

    expect(result.resolved).toBe(true);
    expect(result.codings).toHaveLength(3);
    expect(result.codings[0]).toEqual({
      system: TERMINOLOGY_SYSTEM_URIS.icd10cm,
      code: 'R07.89',
      display: 'Other chest pain',
    });
    // The whole point of this service: every coding carries an actual code.
    expect(result.codings.every((c) => Boolean(c.code))).toBe(true);
  });

  it('flattens RxNorm concept groups and respects the limit', async () => {
    global.fetch = mockFetchOnce(RXNORM_PAYLOAD) as unknown as typeof fetch;

    const result = await service.search('rxnorm', 'metoprolol', { limit: 1 });

    expect(result.resolved).toBe(true);
    expect(result.codings).toEqual([
      {
        system: TERMINOLOGY_SYSTEM_URIS.rxnorm,
        code: '2047766',
        display: '24 HR metoprolol succinate 100 MG',
      },
    ]);
  });

  it('degrades calmly instead of throwing when the public API is unreachable', async () => {
    // Terminology is an enrichment, never a gate -- a slow or down NLM service
    // must not fail the clinical request that asked for a code.
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

    const result = await service.search('icd10cm', 'chest pain');

    expect(result.resolved).toBe(false);
    expect(result.codings).toEqual([]);
    expect(result.unavailableReason).toMatch(/unreachable/i);
  });

  it('degrades calmly on a non-OK response', async () => {
    global.fetch = mockFetchOnce(null, false, 503) as unknown as typeof fetch;

    const result = await service.search('icd10cm', 'chest pain');

    expect(result.resolved).toBe(false);
    expect(result.codings).toEqual([]);
  });

  it('serves a repeat lookup from cache without a second network call', async () => {
    const fetchMock = mockFetchOnce(ICD10_PAYLOAD);
    global.fetch = fetchMock as unknown as typeof fetch;

    await service.search('icd10cm', 'chest pain', { limit: 3 });
    const second = await service.search('icd10cm', 'CHEST PAIN', { limit: 3 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.fromCache).toBe(true);
    expect(second.codings).toHaveLength(3);
  });

  it('does not cache an unresolved lookup, so a transient outage is retried', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('timeout'));
    global.fetch = failing as unknown as typeof fetch;
    await service.search('icd10cm', 'sepsis');

    global.fetch = mockFetchOnce(ICD10_PAYLOAD) as unknown as typeof fetch;
    const retried = await service.search('icd10cm', 'sepsis');

    expect(retried.resolved).toBe(true);
    expect(retried.fromCache).toBeUndefined();
  });

  it('rejects an empty query without calling the network', async () => {
    const fetchMock = mockFetchOnce(ICD10_PAYLOAD);
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await service.search('icd10cm', '   ');

    expect(result.resolved).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
