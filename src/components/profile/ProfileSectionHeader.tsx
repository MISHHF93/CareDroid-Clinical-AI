import { Link } from 'react-router-dom';
import { GraphicIconBadge } from '../graphics/CdlGraphicKit';

type ProfileSectionHeaderProps = {
  title: string;
  subtitle?: string;
  iconKey?: string;
  accent?: 'information' | 'action' | 'brand' | 'neutral' | 'warning' | 'critical';
  ctaLabel?: string;
  ctaPath?: string;
};

export default function ProfileSectionHeader({
  title,
  subtitle,
  iconKey = 'layout-dashboard',
  accent = 'brand',
  ctaLabel,
  ctaPath,
}: ProfileSectionHeaderProps) {
  return (
    <div className="profile-section-header">
      <div className="profile-section-header__lead">
        <GraphicIconBadge iconKey={iconKey} accent={accent} size="md" />
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      {ctaLabel && ctaPath ? (
        <Link to={ctaPath} className="profile-section-header__cta">
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}