import React from 'react';
import { StatCard } from '../../components/data-display/StatCard';
import './staff.css';

type KPI = {
  label: string;
  value: React.ReactNode;
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'flat';
};

type KPIStripProps = {
  kpis: KPI[];
  className?: string;
};

export function KPIStrip({ kpis, className }: KPIStripProps) {
  return (
    <div className={['cd-kpi-strip', className ?? ''].filter(Boolean).join(' ')}>
      {kpis.map((k) => (
        <StatCard key={k.label} label={k.label} value={k.value} delta={k.delta} deltaDirection={k.deltaDirection} />
      ))}
    </div>
  );
}
