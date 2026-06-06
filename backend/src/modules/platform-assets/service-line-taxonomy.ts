import { DEPARTMENT_IDS, DepartmentId } from './department-taxonomy';

export const SERVICE_LINE_TAXONOMY = [
  { id: 'emergency-medicine', name: 'Emergency Medicine', departmentIds: ['emergency'] },
  {
    id: 'critical-care',
    name: 'Critical Care',
    departmentIds: ['icu', 'respiratory-therapy', 'pharmacy'],
  },
  { id: 'cardiology', name: 'Cardiology', departmentIds: ['cardiology'] },
  { id: 'neurology', name: 'Neurology', departmentIds: ['neurology', 'radiology'] },
  { id: 'pediatrics', name: 'Pediatrics', departmentIds: ['pediatrics'] },
  { id: 'surgery', name: 'Surgery', departmentIds: ['surgery', 'radiology', 'laboratory'] },
  {
    id: 'laboratory-medicine',
    name: 'Laboratory Medicine',
    departmentIds: ['laboratory', 'pharmacy'],
  },
  {
    id: 'operations',
    name: 'Operations',
    departmentIds: ['operations', 'fleet', 'biomedical-engineering', 'administration'],
  },
  { id: 'education', name: 'Education', departmentIds: ['education'] },
  { id: 'research', name: 'Research', departmentIds: ['research', 'education'] },
] as const;

export type ServiceLineId = (typeof SERVICE_LINE_TAXONOMY)[number]['id'];

export const SERVICE_LINE_IDS = SERVICE_LINE_TAXONOMY.map((serviceLine) => serviceLine.id);

const SERVICE_LINE_BY_ID = new Map(
  SERVICE_LINE_TAXONOMY.map((serviceLine) => [serviceLine.id, serviceLine]),
);

export function serviceLineName(id: string) {
  return SERVICE_LINE_BY_ID.get(id as ServiceLineId)?.name || id;
}

export function serviceLineIdsForDepartment(departmentId: string): ServiceLineId[] {
  return SERVICE_LINE_TAXONOMY.filter((serviceLine) =>
    (serviceLine.departmentIds as readonly string[]).includes(departmentId),
  ).map((serviceLine) => serviceLine.id);
}

export function normalizeServiceLineId(value: unknown): ServiceLineId | null {
  if (!value) return null;
  const raw = String(value).trim().toLowerCase().replace(/_/g, '-');
  return SERVICE_LINE_BY_ID.has(raw as ServiceLineId) ? (raw as ServiceLineId) : null;
}

export function validateServiceLineDepartments() {
  const departmentIds = new Set(DEPARTMENT_IDS);
  return SERVICE_LINE_TAXONOMY.flatMap((serviceLine) =>
    (serviceLine.departmentIds as readonly string[])
      .filter((departmentId) => !departmentIds.has(departmentId as DepartmentId))
      .map((departmentId) => ({
        serviceLineId: serviceLine.id,
        departmentId,
      })),
  );
}
