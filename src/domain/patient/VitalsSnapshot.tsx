import React from 'react';
import type { Vitals } from '../../types/emergency';
import './patient.css';

type VitalsSnapshotProps = {
  vitals: Vitals | null | undefined;
  className?: string;
};

function v(val: unknown): string {
  return val == null ? '—' : String(val);
}

function hrTone(hr?: number): string {
  if (hr == null) return '';
  if (hr < 50 || hr > 130) return 'cd-vitals__value--abnormal';
  if (hr < 60 || hr > 100) return 'cd-vitals__value--warning';
  return '';
}

function spo2Tone(spo2?: number): string {
  if (spo2 == null) return '';
  if (spo2 < 90) return 'cd-vitals__value--abnormal';
  if (spo2 < 94) return 'cd-vitals__value--warning';
  return '';
}

export function VitalsSnapshot({ vitals, className }: VitalsSnapshotProps) {
  if (!vitals) return <span className="cd-vitals__empty">No vitals recorded</span>;

  const hr   = vitals.hr   ?? (vitals.heartRate as number | undefined);
  const sbp  = vitals.sbp  ?? (vitals.bpSystolic as number | undefined);
  const dbp  = vitals.dbp  ?? (vitals.bpDiastolic as number | undefined);
  const spo2 = vitals.spo2 ?? (vitals.oxygenSaturation as number | undefined);
  const temp = vitals.temp ?? (vitals.temperature as number | undefined);
  const rr   = vitals.rr   ?? (vitals.respiratoryRate as number | undefined);
  const gcs  = vitals.gcs;

  const items: Array<{ label: string; value: string; tone?: string }> = [
    { label: 'HR',   value: v(hr),   tone: hrTone(hr) },
    { label: 'BP',   value: sbp != null ? `${sbp}/${dbp ?? '—'}` : '—' },
    { label: 'SpO₂', value: spo2 != null ? `${spo2}%` : '—', tone: spo2Tone(spo2) },
    { label: 'Temp', value: temp != null ? `${temp}°` : '—' },
    { label: 'RR',   value: v(rr) },
    ...(gcs != null ? [{ label: 'GCS', value: String(gcs) }] : []),
  ];

  return (
    <div className={['cd-vitals', className ?? ''].filter(Boolean).join(' ')} aria-label="Latest vitals">
      {items.map(({ label, value, tone }) => (
        <div key={label} className="cd-vitals__item">
          <span className="cd-vitals__label">{label}</span>
          <span className={['cd-vitals__value', tone ?? ''].filter(Boolean).join(' ')}>{value}</span>
        </div>
      ))}
    </div>
  );
}
