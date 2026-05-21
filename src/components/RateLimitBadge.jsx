/**
 * AI Rate Limit Display Component
 * Shows user their remaining AI queries for the day
 */

import { useSystemConfig } from '../contexts/SystemConfigContext.jsx';
import './RateLimitBadge.css';

export function RateLimitBadge() {
  const { aiUsage, loading } = useSystemConfig();

  if (loading || !aiUsage) {
    return null;
  }

  const percentageUsed = (aiUsage.usedToday / aiUsage.dailyLimit) * 100;
  const isNearLimit = percentageUsed >= 80;
  const isLimitReached = percentageUsed >= 100;

  return (
    <div className={`rate-limit-badge ${isLimitReached ? 'limit-reached' : isNearLimit ? 'near-limit' : ''}`}>
      <div className="rate-limit-content">
        <span className="rate-limit-label">AI Queries</span>
        <span className="rate-limit-counter">
          {aiUsage.remaining}/{aiUsage.dailyLimit}
        </span>
      </div>
      <div className="rate-limit-bar">
        <div 
          className={`rate-limit-progress ${isLimitReached ? 'full' : isNearLimit ? 'warning' : ''}`}
          style={{ width: `${Math.min(percentageUsed, 100)}%` }}
        />
      </div>
      {isLimitReached && (
        <div className="rate-limit-message">
          Daily limit reached. Resets at {new Date(aiUsage.resetAt).toLocaleTimeString()}
        </div>
      )}
      {isNearLimit && !isLimitReached && (
        <div className="rate-limit-message warning">
          {aiUsage.remaining} queries remaining
        </div>
      )}
    </div>
  );
}

export default RateLimitBadge;
