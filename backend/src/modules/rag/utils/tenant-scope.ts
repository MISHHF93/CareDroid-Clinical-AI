/**
 * Architect Mode Stage H — explicit tenant scope rules for RAG vectors.
 * Retrieval must never return another tenant's documents.
 */
export const RAG_GLOBAL_ORG_SCOPE = '__global__';

export function isAllowedTenantDocument(
  documentOrgId: string | null | undefined,
  queryOrgId: string | null | undefined,
): boolean {
  const docOrg = String(documentOrgId || '').trim();
  const queryOrg = String(queryOrgId || '').trim();

  // Global clinical corpus is readable by any authenticated tenant query.
  if (docOrg === RAG_GLOBAL_ORG_SCOPE || docOrg === '') {
    // Empty doc org treated as global only for legacy rows; prefer explicit __global__.
    if (docOrg === '') return true;
    return true;
  }

  // Tenant-scoped documents require exact org match.
  if (!queryOrg) return false;
  return docOrg === queryOrg;
}

export function filterRecordsByTenant<T extends { organizationId?: string | null; metadata?: { organizationId?: string } }>(
  records: readonly T[],
  queryOrgId: string | null | undefined,
): T[] {
  return records.filter((record) => {
    const org =
      record.organizationId ??
      record.metadata?.organizationId ??
      null;
    return isAllowedTenantDocument(org, queryOrgId);
  });
}
