import './ProgressBar.css';

/**
 * Progress Bar Component
 * 
 * Visual indicator for progress or loading states with percentage
 * @param {number} value - Progress value (0-100)
 * @param {number} max - Maximum value (default 100)
 * @param {('sm'|'md'|'lg')} size - Progress bar size
 * @param {('accent'|'success'|'warning'|'danger')} color - Color variant
 * @param {boolean} animated - Whether to show animated stripes
 * @param {boolean} showLabel - Whether to show percentage label
 * @param {string} label - Custom label text
 * @param {string} className - Additional CSS classes
 */
export const ProgressBar = ({
  value = 0,
  max = 100,
  size = 'md',
  color = 'accent',
  animated = false,
  showLabel = false,
  label,
  className = '',
  ...props
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const displayLabel = label || `${Math.round(percentage)}%`;

  return (
    <div className={`progress-container ${className}`} {...props}>
      {showLabel && (
        <div className="progress-label">
          <span>{displayLabel}</span>
        </div>
      )}
      <div
        className={`progress-bar progress-${size}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || `${percentage}% complete`}
      >
        <div
          className={`progress-fill progress-${color} ${animated ? 'progress-animated' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Indeterminate Progress Bar (for unknown duration)
 */
export const ProgressBarIndeterminate = ({
  size = 'md',
  color = 'accent',
  label,
  className = '',
  ...props
}) => {
  return (
    <div className={`progress-container ${className}`} {...props}>
      {label && (
        <div className="progress-label">
          <span>{label}</span>
        </div>
      )}
      <div
        className={`progress-bar progress-${size}`}
        role="progressbar"
        aria-label={label || 'Loading'}
        aria-busy="true"
      >
        <div className={`progress-fill progress-${color} progress-indeterminate`} />
      </div>
    </div>
  );
};

/**
 * Circular Progress Indicator
 */
export const ProgressCircle = ({
  value = 0,
  max = 100,
  size = 64,
  strokeWidth = 4,
  color = 'accent',
  showLabel = true,
  label,
  className = '',
  ...props
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const displayLabel = label || `${Math.round(percentage)}%`;

  return (
    <div
      className={`progress-circle ${className}`}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          className="progress-circle-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          className={`progress-circle-fill progress-circle-${color}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
      </svg>
      {showLabel && (
        <div className="progress-circle-label">
          <span>{displayLabel}</span>
        </div>
      )}
    </div>
  );
};
