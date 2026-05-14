import React from 'react';
import './DataDisplay.css';

/**
 * Badge Component
 * 
 * Status or category badge for displaying labels
 * Variants: success, error, warning, info, neutral
 * 
 * @param {String} variant - Badge type (success, error, warning, info, neutral)
 * @param {String} label - Badge text
 * @param {String} icon - Optional emoji/icon
 * @param {Boolean} removable - Shows X button if true
 * @param {Function} onRemove - Callback when X is clicked
 */
export const Badge = ({
  variant = 'neutral',
  label,
  icon,
  removable = false,
  onRemove,
  size = 'md',
  className = '',
}) => {
  return (
    <span className={`badge badge-${variant} badge-${size} ${className}`}>
      {icon && <span className="badge-icon">{icon}</span>}
      <span className="badge-label">{label}</span>
      {removable && (
        <button
          className="badge-remove"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          type="button"
        >
          ✕
        </button>
      )}
    </span>
  );
};

/**
 * StatusBadge Component
 * 
 * Specialized badge for showing status (active, inactive, pending)
 */
export const StatusBadge = ({ status, label }) => {
  const statusMap = {
    active: { variant: 'success', icon: '🟢' },
    inactive: { variant: 'neutral', icon: '⚫' },
    pending: { variant: 'warning', icon: '🟡' },
    error: { variant: 'error', icon: '🔴' },
  };

  const { variant, icon } = statusMap[status] || statusMap.inactive;

  return (
    <Badge
      variant={variant}
      icon={icon}
      label={label || status}
      className="status-badge"
    />
  );
};

/**
 * Avatar Component
 * 
 * User avatar with initials fallback
 * Can display image or initials
 * 
 * @param {String} src - Image URL
 * @param {String} name - User name (for initials)
 * @param {String} size - Avatar size (sm, md, lg, xl)
 * @param {String} status - Optional status (online, offline, away)
 */
export const Avatar = ({
  src,
  name = 'User',
  size = 'md',
  status,
  className = '',
}) => {
  const getInitials = (fullName) => {
    return fullName
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`avatar avatar-${size} ${className}`}>
      {src ? (
        <img src={src} alt={name} className="avatar-image" />
      ) : (
        <div className="avatar-initials">{getInitials(name)}</div>
      )}
      {status && <span className={`avatar-status avatar-status-${status}`}></span>}
    </div>
  );
};

/**
 * AvatarGroup Component
 * 
 * Display multiple avatars in a group
 * Shows first N avatars with +X overflow indicator
 */
export const AvatarGroup = ({
  avatars = [],
  maxDisplay = 3,
  size = 'md',
}) => {
  const displayed = avatars.slice(0, maxDisplay);
  const remaining = avatars.length - maxDisplay;

  return (
    <div className="avatar-group">
      {displayed.map((avatar, index) => (
        <div
          key={avatar.id || index}
          className="avatar-group-item"
          style={{ zIndex: displayed.length - index }}
        >
          <Avatar
            src={avatar.src}
            name={avatar.name}
            size={size}
            status={avatar.status}
          />
        </div>
      ))}
      {remaining > 0 && (
        <div className={`avatar-overflow avatar-${size}`}>
          +{remaining}
        </div>
      )}
    </div>
  );
};

/**
 * Tooltip Component
 * 
 * Hover tooltip for help text and information
 * Positions automatically to avoid viewport edges
 * 
 * @param {String} content - Tooltip text
 * @param {String} position - Position (top, bottom, left, right)
 * @param {ReactNode} children - Element to attach tooltip to
 */
export const Tooltip = ({
  content,
  position = 'top',
  children,
  delay = 200,
  className = '',
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [showPosition, setShowPosition] = React.useState(position);
  const tooltipRef = React.useRef(null);

  const handleMouseEnter = () => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      // Auto-adjust position if tooltip would go off-screen
      if (tooltipRef.current) {
        const rect = tooltipRef.current.getBoundingClientRect();
        if (position === 'top' && rect.top < 0) {
          setShowPosition('bottom');
        } else if (position === 'bottom' && rect.bottom > window.innerHeight) {
          setShowPosition('top');
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  };

  return (
    <div
      className={`tooltip-wrapper ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
      ref={tooltipRef}
    >
      {children}
      {isVisible && (
        <div className={`tooltip tooltip-${showPosition}`} role="tooltip">
          {content}
        </div>
      )}
    </div>
  );
};

/**
 * Tag Component
 * 
 * Small label tag for categorization
 * Similar to Badge but used for content classification
 */
export const Tag = ({
  label,
  color = 'blue',
  removable = false,
  onRemove,
  size = 'sm',
}) => {
  const colorMap = {
    blue: 'var(--accent-2)',
    green: 'var(--accent-1)',
    red: '#ff6b6b',
    yellow: '#ffa502',
    purple: '#9c27b0',
    gray: 'rgba(248, 250, 252, 0.5)',
  };

  return (
    <span
      className={`tag tag-${size}`}
      style={{ backgroundColor: `${colorMap[color] || colorMap.blue}20` }}
    >
      <span className="tag-label">{label}</span>
      {removable && (
        <button
          className="tag-remove"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
        >
          ✕
        </button>
      )}
    </span>
  );
};

/**
 * ProgressBadge Component
 * 
 * Badge showing progress with visual indicator
 */
export const ProgressBadge = ({
  label,
  percentage,
  showPercentage = true,
}) => {
  return (
    <div className="progress-badge">
      <div
        className="progress-badge-fill"
        style={{ width: `${Math.min(percentage, 100)}%` }}
      ></div>
      <span className="progress-badge-label">
        {label}
        {showPercentage && ` (${percentage}%)`}
      </span>
    </div>
  );
};

/**
 * IconBadge Component
 * 
 * Badge with icon and count
 * Useful for notifications, messages, etc.
 */
export const IconBadge = ({
  icon,
  count,
  label,
  variant = 'neutral',
}) => {
  return (
    <div className={`icon-badge icon-badge-${variant}`}>
      <span className="icon-badge-icon">{icon}</span>
      <span className="icon-badge-count">{count}</span>
      {label && <span className="icon-badge-label">{label}</span>}
    </div>
  );
};
