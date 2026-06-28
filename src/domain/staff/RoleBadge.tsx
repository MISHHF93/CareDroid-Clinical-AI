import React from 'react';
import { CAREDROID_ROLE_LABELS } from '../../lib/users/roleAccess';
import type { HospitalRole } from '../../lib/users/userTypes';
import './staff.css';

type RoleBadgeProps = {
  role: string;
  className?: string;
  showLabel?: boolean;
};

const ROLE_CLASS: Record<string, string> = {
  // CareDroid hospital roles
  super_admin: 'admin',
  hospital_admin: 'admin',
  it_admin: 'admin',
  ed_director: 'director',
  emergency_physician: 'physician',
  attending_physician: 'physician',
  resident_physician: 'physician',
  specialist: 'physician',
  charge_nurse: 'charge',
  triage_nurse: 'triage',
  registered_nurse: 'nurse',
  paramedic: 'paramedic',
  registration_clerk: 'registration',
  patient_flow_coordinator: 'coordinator',
  lab_technician: 'lab',
  radiology_technician: 'radiology',
  pharmacist: 'pharmacy',
  social_worker: 'social',
  security_officer: 'security',
  quality_safety_officer: 'quality',
  demo_observer: 'observer',
  // Legacy/alias mappings
  physician: 'physician',
  doctor: 'physician',
  attending: 'physician',
  resident: 'physician',
  nurse: 'nurse',
  rn: 'nurse',
  charge: 'charge',
  'charge nurse': 'charge',
  registration: 'registration',
  clerk: 'registration',
  ems: 'paramedic',
  ems_user: 'paramedic',
};

function roleKey(role: string): string {
  return ROLE_CLASS[role.toLowerCase().replace(/ /g, '_')] ??
    ROLE_CLASS[role.toLowerCase()] ??
    'default';
}

function resolveLabel(role: string): string {
  return (CAREDROID_ROLE_LABELS as Record<string, string>)[role] ?? role;
}

export function RoleBadge({ role, className, showLabel = true }: RoleBadgeProps) {
  return (
    <span className={['cd-role-badge', `cd-role-badge--${roleKey(role)}`, className ?? ''].filter(Boolean).join(' ')}>
      {showLabel ? resolveLabel(role) : role}
    </span>
  );
}
