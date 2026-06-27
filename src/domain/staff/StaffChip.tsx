import React from 'react';
import { Avatar } from '../../components/primitives/Avatar';
import { RoleBadge } from './RoleBadge';
import './staff.css';

type StaffChipProps = {
  name: string;
  role?: string;
  avatarSrc?: string;
  size?: 'sm' | 'md';
  className?: string;
};

export function StaffChip({ name, role, avatarSrc, size = 'md', className }: StaffChipProps) {
  return (
    <div className={['cd-staff-chip', className ?? ''].filter(Boolean).join(' ')}>
      <Avatar name={name} src={avatarSrc} size={size} />
      <span className="cd-staff-chip__name">{name}</span>
      {role && <RoleBadge role={role} />}
    </div>
  );
}
