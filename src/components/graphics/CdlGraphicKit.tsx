import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  IconActivity,
  IconActivityHeartbeat,
  IconAlertTriangle,
  IconAmbulance,
  IconArrowRight,
  IconBabyCarriage,
  IconBed,
  IconBell,
  IconBodyScan,
  IconBrain,
  IconChartBar,
  IconClipboardPlus,
  IconDroplet,
  IconFlask2,
  IconGauge,
  IconLayoutDashboard,
  IconListDetails,
  IconLungs,
  IconMoodSmile,
  IconNotes,
  IconPill,
  IconRefresh,
  IconReport,
  IconRobot,
  IconSchool,
  IconSend,
  IconShieldCheck,
  IconStethoscope,
  IconUserCircle,
  IconUsers,
} from '@tabler/icons-react';
import {
  ROUTE_NAV_GRAPHIC_KEYS,
  SITUATION_BRIEF_GRAPHICS,
  type SituationBriefGraphicId,
  resolveCommandMetricGraphicKey,
  resolveEmsPhaseProgress,
  resolveMetricGraphicKey,
} from '../../config/cdlGraphicModel';
import './CdlGraphicKit.css';

type TablerIcon = typeof IconActivity;

const GRAPHIC_ICON_MAP: Record<string, TablerIcon> = {
  activity: IconActivity,
  alert: IconAlertTriangle,
  owner: IconUserCircle,
  route: IconArrowRight,
  'layout-dashboard': IconLayoutDashboard,
  'emergency-patients': IconUsers,
  journey: IconListDetails,
  notes: IconNotes,
  ems: IconAmbulance,
  send: IconSend,
  intake: IconClipboardPlus,
  'chart-bar': IconChartBar,
  capacity: IconGauge,
  'emergency-analytics': IconChartBar,
  alerts: IconBell,
  'department-pulse': IconActivity,
  queues: IconListDetails,
  reassessment: IconRefresh,
  boarding: IconBed,
  'ed-copilot': IconRobot,
  'shield-check': IconShieldCheck,
  stethoscope: IconStethoscope,
  'clinical-tools': IconStethoscope,
  report: IconReport,
  settings: IconShieldCheck,
  help: IconListDetails,
  'user-check': IconUserCircle,
  // Hospital-department dashboards (Pharmacy/Radiology/Education/Cardiology/
  // Nephrology/Neurology/Gastroenterology/Endocrinology/Pediatrics-OBGYN/
  // Psychiatry/Pulmonology) — one distinct icon per specialty rather than
  // reusing the generic 'activity' glyph for all of them.
  pharmacy: IconPill,
  radiology: IconBodyScan,
  education: IconSchool,
  cardiology: IconActivityHeartbeat,
  nephrology: IconDroplet,
  neurology: IconBrain,
  gastroenterology: IconFlask2,
  endocrinology: IconDroplet,
  'pediatrics-obgyn': IconBabyCarriage,
  psychiatry: IconMoodSmile,
  pulmonology: IconLungs,
};

function resolveGraphicIcon(iconKey: string): TablerIcon {
  return GRAPHIC_ICON_MAP[iconKey] || IconActivity;
}

type GraphicIconBadgeProps = {
  iconKey: string;
  accent?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function GraphicIconBadge({
  iconKey,
  accent = 'information',
  size = 'md',
  className = '',
}: GraphicIconBadgeProps) {
  const IconComponent = resolveGraphicIcon(iconKey);
  return (
    <span
      className={[
        'cdl-graphic-icon-badge',
        `cdl-graphic-icon-badge--${accent}`,
        `cdl-graphic-icon-badge--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden
    >
      <IconComponent size={size === 'lg' ? 22 : size === 'sm' ? 15 : 18} stroke={size === 'lg' ? 2.25 : 2.1} />
    </span>
  );
}

type SituationGraphicCardProps = {
  id: SituationBriefGraphicId;
  label: string;
  value: ReactNode;
};

export function SituationGraphicCard({ id, label, value }: SituationGraphicCardProps) {
  const graphic = SITUATION_BRIEF_GRAPHICS[id];
  return (
    <li
      className={`cdl-situation-cell cdl-situation-graphic-card--${graphic.accent}`}
      data-cdl-surface="flat"
    >
      <GraphicIconBadge iconKey={graphic.iconKey} accent={graphic.accent} size="sm" />
      <div className="cdl-situation-graphic-card__content">
        <span className="cdl-situation-graphic-card__label">{label}</span>
        <span className="cdl-situation-graphic-card__value">{value}</span>
      </div>
    </li>
  );
}

type MetricGraphicCardProps = {
  label: string;
  value: ReactNode;
  iconKey?: string;
  tone?: string;
  color?: string;
  progress?: number;
};

export function MetricGraphicCard({
  label,
  value,
  iconKey,
  tone,
  color,
  progress,
}: MetricGraphicCardProps) {
  const resolvedIcon = iconKey || resolveMetricGraphicKey(label);
  const accent = tone || 'neutral';
  const barWidth = progress != null ? Math.min(100, Math.max(0, progress)) : undefined;

  return (
    <article
      className={[
        /* Single leaf surface — do not stack emergency-route-card + metric-card + graphic */
        'cdl-metric-graphic-card',
        tone ? `cdl-metric-graphic-card--${tone}` : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={color ? ({ '--metric-color': color } as React.CSSProperties) : undefined}
    >
      <div className="cdl-metric-graphic-card__header">
        <GraphicIconBadge iconKey={resolvedIcon} accent={accent} size="md" />
        <span className="cdl-metric-graphic-card__ring" aria-hidden>
          <svg viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.12" />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${barWidth != null ? (barWidth / 100) * 94 : 47} 94`}
              transform="rotate(-90 18 18)"
              opacity="0.65"
            />
          </svg>
        </span>
      </div>
      <strong className="emergency-route-metric-card__value cdl-metric-graphic-card__value">{value}</strong>
      <span className="emergency-route-metric-card__label cdl-metric-graphic-card__label">{label}</span>
      {barWidth != null ? (
        <div className="cdl-metric-graphic-card__bar" aria-hidden>
          <span style={{ width: `${barWidth}%` }} />
        </div>
      ) : null}
    </article>
  );
}

type RouteGraphicBadgeProps = {
  navId?: string | null;
  className?: string;
};

export function RouteGraphicBadge({ navId, className = '' }: RouteGraphicBadgeProps) {
  if (!navId) return null;
  const iconKey = ROUTE_NAV_GRAPHIC_KEYS[navId] || 'activity';
  return (
    <span className={['cdl-route-graphic-badge', className].filter(Boolean).join(' ')} aria-hidden>
      <GraphicIconBadge iconKey={iconKey} accent="brand" size="lg" />
      <span className="cdl-route-graphic-badge__glow" />
    </span>
  );
}

const PRIORITY_RING_COLORS: Record<string, string> = {
  P1: 'var(--priority-p1, #dc2626)',
  P2: 'var(--priority-p2, #ea580c)',
  P3: 'var(--priority-p3, #ca8a04)',
  P4: 'var(--priority-p4, #16a34a)',
  P5: 'var(--priority-p5, #0ea5e9)',
};

type PatientAcuityRingProps = {
  priority: string;
  label?: string;
  className?: string;
};

export function PatientAcuityRing({ priority, label, className = '' }: PatientAcuityRingProps) {
  const color = PRIORITY_RING_COLORS[priority] || PRIORITY_RING_COLORS.P3;
  const fill = priority === 'P1' ? 92 : priority === 'P2' ? 78 : priority === 'P3' ? 62 : priority === 'P4' ? 48 : 36;

  return (
    <span
      className={['cdl-patient-acuity-ring', className].filter(Boolean).join(' ')}
      style={{ '--acuity-color': color } as CSSProperties}
      aria-hidden
    >
      <svg viewBox="0 0 44 44" className="cdl-patient-acuity-ring__svg">
        <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.14" />
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${(fill / 100) * 113} 113`}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span className="cdl-patient-acuity-ring__code">{priority}</span>
      {label ? <span className="cdl-patient-acuity-ring__label">{label}</span> : null}
    </span>
  );
}

type EmsUnitTrackGraphicProps = {
  status: string;
  unitId?: string;
  breach?: boolean;
  className?: string;
};

export function EmsUnitTrackGraphic({ status, unitId, breach = false, className = '' }: EmsUnitTrackGraphicProps) {
  const progress = resolveEmsPhaseProgress(status);
  return (
    <div
      className={[
        'cdl-ems-unit-track',
        breach ? 'cdl-ems-unit-track--breach' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={unitId ? `${unitId} track ${progress}%` : `EMS track ${progress}%`}
    >
      <div className="cdl-ems-unit-track__rail" aria-hidden>
        <span className="cdl-ems-unit-track__fill" style={{ width: `${progress}%` }} />
        {[15, 35, 55, 80, 100].map((mark) => (
          <span key={mark} className={`cdl-ems-unit-track__mark cdl-ems-unit-track__mark--${mark}`} />
        ))}
      </div>
      <GraphicIconBadge iconKey="ems" accent={breach ? 'critical' : progress >= 80 ? 'action' : 'information'} size="sm" />
    </div>
  );
}

type CommandMetricGraphicCardProps = {
  id: string;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: string;
  route: string;
};

export function CommandMetricGraphicCard({
  id,
  label,
  value,
  detail,
  tone = 'neutral',
  route,
}: CommandMetricGraphicCardProps) {
  const iconKey = resolveCommandMetricGraphicKey(id);
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  const progress = Number.isFinite(numericValue) ? Math.min(100, numericValue * (numericValue <= 1 ? 100 : 1)) : 55;

  return (
    <Link
      to={route}
      className={[
        'hospital-command-center__metric-card',
        'cdl-command-metric-card',
        `hospital-command-center__metric-card--${tone}`,
        `cdl-command-metric-card--${tone}`,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="cdl-command-metric-card__header">
        <GraphicIconBadge iconKey={iconKey} accent={tone === 'critical' ? 'critical' : tone === 'warning' ? 'warning' : 'information'} size="sm" />
        <svg viewBox="0 0 40 40" className="cdl-command-metric-card__spark" aria-hidden>
          <polyline
            points="4,32 12,24 18,28 26,14 36,18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.45"
          />
        </svg>
      </div>
      <span className="hospital-command-center__metric-value">{value}</span>
      <span className="hospital-command-center__metric-label">{label}</span>
      {detail ? <span className="hospital-command-center__metric-detail">{detail}</span> : null}
      <div className="cdl-metric-graphic-card__bar" aria-hidden>
        <span style={{ width: `${progress}%` }} />
      </div>
    </Link>
  );
}

type CommandActionGraphicCardProps = {
  label: string;
  count: ReactNode;
  reason: ReactNode;
  owner: ReactNode;
  deadlineLabel: ReactNode;
  nextAction: ReactNode;
  tone: string;
  active?: boolean;
  route: string;
};

export function CommandActionGraphicCard({
  label,
  count,
  reason,
  owner,
  deadlineLabel,
  nextAction,
  tone,
  active = false,
  route,
}: CommandActionGraphicCardProps) {
  return (
    <article
      className={[
        'emergency-route-card',
        'emergency-command-action',
        'cdl-command-action-card',
        `emergency-command-action--${tone}`,
        `cdl-command-action-card--${tone}`,
        active ? 'emergency-command-action--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="cdl-command-action-card__header">
        <GraphicIconBadge
          iconKey={tone === 'critical' ? 'alert' : tone === 'warning' ? 'activity' : 'route'}
          accent={tone === 'critical' ? 'critical' : tone === 'warning' ? 'warning' : 'action'}
          size="md"
        />
        <div className="emergency-command-action__header">
          <strong>{label}</strong>
          <span className="emergency-command-action__count cdl-command-action-card__count">{count}</span>
        </div>
      </div>
      <p>{reason}</p>
      <dl className="emergency-command-action__meta">
        <div>
          <dt>Owner</dt>
          <dd>{owner}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd>{deadlineLabel}</dd>
        </div>
      </dl>
      <div className="emergency-command-action__footer">
        <span>{nextAction}</span>
        <Link to={route} className="emergency-route-filter-banner__btn">
          Open
        </Link>
      </div>
    </article>
  );
}

type ReceptionFlowGraphicProps = {
  steps: ReadonlyArray<{ id: string; label: string; complete: boolean }>;
  className?: string;
};

const RECEPTION_FLOW_ICONS: Record<string, string> = {
  arrival: 'user-check',
  critical: 'alert',
  ai: 'ed-copilot',
  route: 'route',
};

export function ReceptionFlowGraphic({ steps, className = '' }: ReceptionFlowGraphicProps) {
  return (
    <div className={['cdl-reception-flow-graphic', className].filter(Boolean).join(' ')} role="img" aria-label="Reception intake flow">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={[
            'cdl-reception-flow-graphic__step',
            step.complete ? 'cdl-reception-flow-graphic__step--complete' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <GraphicIconBadge
            iconKey={RECEPTION_FLOW_ICONS[step.id] || 'activity'}
            accent={step.complete ? 'action' : 'neutral'}
            size="sm"
          />
          <span className="cdl-reception-flow-graphic__label">{step.label}</span>
          {index < steps.length - 1 ? (
            <span className="cdl-reception-flow-graphic__connector" aria-hidden />
          ) : null}
        </div>
      ))}
    </div>
  );
}

type EmsOffloadGaugeProps = {
  minutes: number;
  targetMinutes: number;
  breachCount?: number;
  className?: string;
};

export function EmsOffloadGauge({ minutes, targetMinutes, breachCount = 0, className = '' }: EmsOffloadGaugeProps) {
  const progress = Math.min(100, Math.round((minutes / Math.max(targetMinutes, 1)) * 100));
  const breach = progress > 100 || breachCount > 0;

  return (
    <span
      className={[
        'cdl-ems-offload-gauge',
        'ems-pipeline__offload-kpi',
        breach ? 'ems-pipeline__offload-kpi--breach cdl-ems-offload-gauge--breach' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={breachCount ? `${breachCount} crews over ${targetMinutes} minutes` : undefined}
    >
      <svg viewBox="0 0 48 48" className="cdl-ems-offload-gauge__ring" aria-hidden>
        <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.15" />
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${(Math.min(progress, 100) / 100) * 113} 113`}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <span className="cdl-ems-offload-gauge__value">Avg offload {minutes}m</span>
    </span>
  );
}