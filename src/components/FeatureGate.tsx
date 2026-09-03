import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useFeature } from '../hooks/useFeature';
import { CANONICAL_ROUTES } from '../config/routes.config';
import './FeatureGate.css';

export default function FeatureGate({
  feature,
  children,
  showPlaceholder = false,
  placeholder = null,
  compact = false,
}) {
  const { enabled, feature: featureDefinition } = useFeature(feature);

  if (!feature || enabled) return children;
  if (!showPlaceholder) return null;
  if (placeholder) return placeholder;

  const label = featureDefinition?.label || feature;
  return (
    <div
      className={`feature-gate-placeholder${compact ? ' feature-gate-placeholder--compact' : ''}`}
    >
      <div>
        <Lock size={16} aria-hidden />
        <strong>{label} — Enable in Settings</strong>
      </div>
      <p>This feature is currently disabled and will stay hidden until enabled.</p>
      <Link to={`${CANONICAL_ROUTES.featureFlags}#feature-${feature}`}>Enable in Settings</Link>
    </div>
  );
}
