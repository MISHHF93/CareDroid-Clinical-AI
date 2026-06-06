import { PlatformAsset } from './entities/platform-asset.entity';
import { PlatformAssetType } from './enums/platform-asset.enums';

export const DEPARTMENT_TAXONOMY = [
  { id: 'emergency', name: 'Emergency' },
  { id: 'icu', name: 'ICU' },
  { id: 'cardiology', name: 'Cardiology' },
  { id: 'neurology', name: 'Neurology' },
  { id: 'pediatrics', name: 'Pediatrics' },
  { id: 'surgery', name: 'Surgery' },
  { id: 'laboratory', name: 'Laboratory' },
  { id: 'pharmacy', name: 'Pharmacy' },
  { id: 'radiology', name: 'Radiology' },
  { id: 'respiratory-therapy', name: 'Respiratory Therapy' },
  { id: 'biomedical-engineering', name: 'Biomedical Engineering' },
  { id: 'operations', name: 'Operations' },
  { id: 'fleet', name: 'Fleet' },
  { id: 'administration', name: 'Administration' },
  { id: 'research', name: 'Research' },
  { id: 'education', name: 'Education' },
] as const;

export type DepartmentId = (typeof DEPARTMENT_TAXONOMY)[number]['id'];

export const DEPARTMENT_IDS = DEPARTMENT_TAXONOMY.map((department) => department.id);

const DEPARTMENT_BY_ID = new Map(DEPARTMENT_TAXONOMY.map((department) => [department.id, department]));

const DEPARTMENT_ALIASES: Record<string, DepartmentId> = {
  emergency: 'emergency',
  ed: 'emergency',
  trauma: 'emergency',
  icu: 'icu',
  critical: 'icu',
  cardiology: 'cardiology',
  cardiac: 'cardiology',
  neurology: 'neurology',
  neuro: 'neurology',
  stroke: 'neurology',
  pediatrics: 'pediatrics',
  pediatric: 'pediatrics',
  surgery: 'surgery',
  surgical: 'surgery',
  laboratory: 'laboratory',
  lab: 'laboratory',
  pharmacy: 'pharmacy',
  pharmacist: 'pharmacy',
  radiology: 'radiology',
  imaging: 'radiology',
  respiratory: 'respiratory-therapy',
  'respiratory-therapy': 'respiratory-therapy',
  biomedical: 'biomedical-engineering',
  biomedit: 'biomedical-engineering',
  'medical-iot': 'biomedical-engineering',
  devices: 'biomedical-engineering',
  operations: 'operations',
  operational: 'operations',
  governance: 'administration',
  admin: 'administration',
  administration: 'administration',
  fleet: 'fleet',
  dispatch: 'fleet',
  research: 'research',
  education: 'education',
  simulation: 'education',
};

export function departmentName(id: string) {
  return DEPARTMENT_BY_ID.get(id as DepartmentId)?.name || id;
}

export function normalizeDepartmentId(value: unknown): DepartmentId | null {
  if (!value) return null;
  const raw = String(value).trim().toLowerCase().replace(/_/g, '-');
  if (DEPARTMENT_BY_ID.has(raw as DepartmentId)) return raw as DepartmentId;
  return DEPARTMENT_ALIASES[raw] || null;
}

export function normalizeDepartmentIds(values: unknown[] = []): DepartmentId[] {
  return [
    ...new Set(
      values
        .map((value) => normalizeDepartmentId(value))
        .filter((department): department is DepartmentId => Boolean(department)),
    ),
  ];
}

export function inferDepartmentsForAsset(input: Partial<PlatformAsset>) {
  const tokens = [
    input.id,
    input.title,
    input.category,
    input.clinicalSpecialty,
    input.route,
    input.assetType,
    ...(input.workspaceTags || []),
    ...(input.specialties || []),
    ...(input.intendedRoles || []),
    ...(input.packIds || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const departments = new Set<DepartmentId>();
  for (const [alias, department] of Object.entries(DEPARTMENT_ALIASES)) {
    if (tokens.includes(alias)) departments.add(department);
  }

  if (input.assetType === PlatformAssetType.LABORATORY) departments.add('laboratory');
  if (input.assetType === PlatformAssetType.IOT) departments.add('biomedical-engineering');
  if (input.assetType === PlatformAssetType.FLEET) departments.add('fleet');
  if (input.assetType === PlatformAssetType.GOVERNANCE) departments.add('administration');
  if (input.assetType === PlatformAssetType.SIMULATION) departments.add('education');
  if (input.assetType === PlatformAssetType.AI_AGENT) departments.add('administration');
  if (!departments.size) departments.add('operations');

  const [primaryDepartment, ...secondaryDepartments] = [...departments];
  return {
    primaryDepartment,
    secondaryDepartments,
  };
}

export function defaultRequiredPermissions(input: Partial<PlatformAsset>): string[] {
  const permissions = new Set<string>();
  const policy = input.permissionPolicy || {};
  const policyPermissions = [
    ...(Array.isArray((policy as any).requiredPermissions) ? (policy as any).requiredPermissions : []),
    ...(Array.isArray((policy as any).toolCallingPermissions) ? (policy as any).toolCallingPermissions : []),
  ];
  policyPermissions.forEach((permission) => {
    if (typeof permission === 'string' && permission.trim()) permissions.add(permission);
  });

  if (input.assetType === PlatformAssetType.AI_AGENT) permissions.add('use-ai-agents');
  if (input.assetType === PlatformAssetType.DASHBOARD) permissions.add('view-dashboards');
  if (input.assetType === PlatformAssetType.CALCULATOR) permissions.add('use-calculators');
  if (input.assetType === PlatformAssetType.PROTOCOL) permissions.add('view-protocols');
  if (input.assetType === PlatformAssetType.SIMULATION) permissions.add('launch-simulations');
  if (input.assetType === PlatformAssetType.GOVERNANCE) permissions.add('manage-governance');
  if (!permissions.size) permissions.add('view-assets');

  return [...permissions];
}
