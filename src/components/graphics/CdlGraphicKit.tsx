import type { ReactNode } from 'react';
import {
  IconActivity,
  IconAlertTriangle,
  IconAmbulance,
  IconArrowRight,
  IconBed,
  IconBell,
  IconChartBar,
  IconClipboardPlus,
  IconGauge,
  IconLayoutDashboard,
  IconListDetails,
  IconNotes,
  IconRefresh,
  IconReport,
  IconRobot,
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
  resolveMetricGraphicKey,
} from '../../config/cdlGraphicModel';
import { CdlGraphicMotif } from './CdlGraphicIllustrations';
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
      <IconComponent size={size === 'lg' ? 22 : size === 'sm' ? 14 : 18} stroke={2} />
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
    <li className={`cdl-situation-graphic-card cdl-situation-graphic-card--${graphic.accent}`}>
      <CdlGraphicMotif motif={graphic.motif} className="cdl-situation-graphic-card__motif" />
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
        'cdl-metric-graphic-card',
        'emergency-route-card',
        'emergency-route-metric-card',
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