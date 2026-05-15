/**
 * Shared sort helpers for clinical catalog tables.
 */

/**
 * @param {Array} rows
 * @param {string} sortKey - id | name | category | status | access | chat
 * @param {'asc'|'desc'} sortDir
 * @param {(row: object) => string|number|boolean} [getValue]
 */
export function sortCatalogRows(rows, sortKey, sortDir = 'asc', getValue) {
  const dir = sortDir === 'desc' ? -1 : 1;
  const pick =
    getValue ||
    ((row) => {
      switch (sortKey) {
        case 'id':
          return row.id ?? row.toolId ?? row.primaryId ?? '';
        case 'name':
          return row.name ?? row.toolName ?? '';
        case 'category':
          return row.category ?? '';
        case 'status':
          return row.status ?? '';
        case 'access':
          return row.accessSummary ?? row.access ?? '';
        case 'chat':
          return row.chatOnRequest ? 1 : 0;
        case 'page':
          return row.pagePath ?? row.path ?? '';
        default:
          return row.name ?? row.id ?? '';
      }
    });

  return [...rows].sort((a, b) => {
    const va = pick(a);
    const vb = pick(b);
    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * dir;
    }
    return String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' }) * dir;
  });
}
