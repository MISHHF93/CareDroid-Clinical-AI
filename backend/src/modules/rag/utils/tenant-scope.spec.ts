import {
  filterRecordsByTenant,
  isAllowedTenantDocument,
  RAG_GLOBAL_ORG_SCOPE,
} from './tenant-scope';

describe('RAG tenant scope', () => {
  it('allows global corpus for any query org', () => {
    expect(isAllowedTenantDocument(RAG_GLOBAL_ORG_SCOPE, 'org-a')).toBe(true);
    expect(isAllowedTenantDocument(RAG_GLOBAL_ORG_SCOPE, 'org-b')).toBe(true);
  });

  it('blocks cross-tenant document access', () => {
    expect(isAllowedTenantDocument('org-a', 'org-b')).toBe(false);
    expect(isAllowedTenantDocument('org-a', 'org-a')).toBe(true);
  });

  it('blocks tenant docs when query has no org', () => {
    expect(isAllowedTenantDocument('org-a', null)).toBe(false);
    expect(isAllowedTenantDocument('org-a', '')).toBe(false);
  });

  it('filters mixed record sets without leaking neighbors', () => {
    const records = [
      { id: '1', organizationId: 'org-a' },
      { id: '2', organizationId: 'org-b' },
      { id: '3', organizationId: RAG_GLOBAL_ORG_SCOPE },
    ];
    const filtered = filterRecordsByTenant(records, 'org-a');
    expect(filtered.map((r) => r.id).sort()).toEqual(['1', '3']);
  });
});
