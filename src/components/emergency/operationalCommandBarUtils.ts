import { CANONICAL_ROUTES } from '../../config/routes.config';

const HOSPITAL_OPERATIONAL_PREFIXES = Object.freeze([
  '/emergency',
  '/reception',
  '/triage',
  '/queue',
  '/intake',
  '/alerts',
  '/analytics',
  '/reports',
]);

export function isHospitalOperationalPath(pathname: string): boolean {
  return HOSPITAL_OPERATIONAL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function resolveOperationalActorId(user: {
  id?: string;
  email?: string;
  name?: string;
} | null | undefined): string {
  return user?.id || user?.email || user?.name || 'clinical-user';
}

export function buildOperationalCommandRoute(fallback = CANONICAL_ROUTES.emergencyCommandCenter): string {
  return fallback;
}