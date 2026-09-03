import { Link } from 'react-router-dom';
import './AccessDeniedPanel.css';

type AccessDeniedPanelProps = {
  roleLabel: string;
  fallbackPath: string;
  title?: string;
  message?: string;
};

export function AccessDeniedPanel({
  roleLabel,
  fallbackPath,
  title = 'CareDroid page unavailable',
  message,
}: AccessDeniedPanelProps) {
  const detail = message || `${roleLabel} does not have access to this CareDroid page.`;

  return (
    <section className="adp-page" aria-label="Access denied">
      <div role="alert" aria-live="assertive" className="adp-card">
        <span className="adp-eyebrow">Access denied</span>
        <h1 className="adp-title">{title}</h1>
        <p className="adp-message">{detail}</p>
        <Link to={fallbackPath} className="adp-link">
          Go to permitted CareDroid page
        </Link>
      </div>
    </section>
  );
}

export default AccessDeniedPanel;
