import { Link } from 'react-router-dom';
import { buildInfo, shortCommit } from '../config/buildInfo';
import './BuildInfoBadge.css';

export default function BuildInfoBadge({ className = '' }) {
  const classes = ['build-info-badge', className].filter(Boolean).join(' ');

  return (
    <Link
      to="/version"
      className={classes}
      aria-label={`Build version ${buildInfo.appVersion}, commit ${shortCommit(buildInfo.commit)}`}
    >
      <span className="build-info-badge__label">Build</span>
      <span className="build-info-badge__value">{shortCommit(buildInfo.commit)}</span>
      <span className="build-info-badge__env">{buildInfo.environment}</span>
    </Link>
  );
}
