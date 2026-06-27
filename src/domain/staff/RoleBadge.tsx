import React from 'react';
import './staff.css';

type RoleBadgeProps = {
  role: string;
  className?: string;
};

const ROLE_CLASS: Record<string, string> = {
  physician: 'physician', doctor: 'physician', attending: 'physician', resident: 'physician',
  nurse: 'nurse', rn: 'nurse',
  charge: 'charge', 'charge nurse': 'charge',
  registration: 'registration', clerk: 'registration',
  paramedic: 'paramedic', ems: 'paramedic',
};

function roleKey(role: string): string {
  return ROLE_CLASS[role.toLowerCase()] ?? 'default';
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span className={['cd-role-badge', `cd-role-badge--${roleKey(role)}`, className ?? ''].filter(Boolean).join(' ')}>
      {role}
    </span>
  );
}
