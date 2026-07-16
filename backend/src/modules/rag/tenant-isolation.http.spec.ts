/**
 * Architect Mode Stage H — HTTP-shaped tenant isolation contract for RAG filters.
 * Full Postgres e2e requires docker; this locks the filter contract used by retrieval HTTP handlers.
 */
import {
  filterRecordsByTenant,
  isAllowedTenantDocument,
  RAG_GLOBAL_ORG_SCOPE,
} from './utils/tenant-scope';

type FakeRagHit = {
  id: string;
  organizationId: string;
  text: string;
};

function simulateRagQueryHttp(
  hits: FakeRagHit[],
  request: { organizationId?: string | null; authorization?: string },
): { status: number; body: { results: FakeRagHit[] } | { error: string } } {
  if (!request.authorization?.startsWith('Bearer ')) {
    return { status: 401, body: { error: 'Authentication required.' } };
  }
  const org = request.organizationId;
  if (!org) {
    // Tenant-bound queries must declare org; global-only public corpus optional later.
    return { status: 400, body: { error: 'organizationId required' } };
  }
  const results = filterRecordsByTenant(hits, org);
  // Double-check no foreign tenant slipped through
  for (const hit of results) {
    if (!isAllowedTenantDocument(hit.organizationId, org)) {
      return { status: 500, body: { error: 'tenant_filter_failed' } };
    }
  }
  return { status: 200, body: { results } };
}

describe('RAG tenant isolation HTTP contract', () => {
  const corpus: FakeRagHit[] = [
    { id: 'a1', organizationId: 'org-a', text: 'Org A sepsis note' },
    { id: 'b1', organizationId: 'org-b', text: 'Org B private protocol' },
    { id: 'g1', organizationId: RAG_GLOBAL_ORG_SCOPE, text: 'Public ACLS guideline' },
  ];

  it('returns 401 without bearer token', () => {
    const res = simulateRagQueryHttp(corpus, { organizationId: 'org-a' });
    expect(res.status).toBe(401);
  });

  it('returns 400 without organizationId', () => {
    const res = simulateRagQueryHttp(corpus, { authorization: 'Bearer t' });
    expect(res.status).toBe(400);
  });

  it('never returns another tenant document to org-a', () => {
    const res = simulateRagQueryHttp(corpus, {
      authorization: 'Bearer t',
      organizationId: 'org-a',
    });
    expect(res.status).toBe(200);
    if (res.status === 200 && 'results' in res.body) {
      const ids = res.body.results.map((r) => r.id).sort();
      expect(ids).toEqual(['a1', 'g1']);
      expect(ids).not.toContain('b1');
    }
  });

  it('org-b cannot read org-a hits', () => {
    const res = simulateRagQueryHttp(corpus, {
      authorization: 'Bearer t',
      organizationId: 'org-b',
    });
    expect(res.status).toBe(200);
    if (res.status === 200 && 'results' in res.body) {
      const ids = res.body.results.map((r) => r.id);
      expect(ids).toContain('b1');
      expect(ids).not.toContain('a1');
    }
  });
});
