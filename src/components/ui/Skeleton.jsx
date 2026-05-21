import './Skeleton.css';

/**
 * Skeleton Loader Component
 * 
 * Placeholder component for loading states that mimics content structure
 * @param {('text'|'title'|'avatar'|'thumbnail'|'rect')} variant - Skeleton shape
 * @param {string|number} width - Width in px or percentage
 * @param {string|number} height - Height in px or percentage
 * @param {boolean} animated - Whether to show shimmer animation
 * @param {string} className - Additional CSS classes
 */
export const Skeleton = ({
  variant = 'text',
  width,
  height,
  animated = true,
  className = '',
  ...props
}) => {
  const style = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`skeleton skeleton-${variant} ${animated ? 'skeleton-animated' : ''} ${className}`}
      style={style}
      role="status"
      aria-label="Loading content"
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * Skeleton for message bubbles in chat
 */
export const SkeletonMessage = () => {
  return (
    <div className="skeleton-message">
      <Skeleton variant="avatar" width={32} height={32} />
      <div className="skeleton-message-content">
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="90%" />
      </div>
    </div>
  );
};

/**
 * Skeleton for conversation list items
 */
export const SkeletonConversation = () => {
  return (
    <div className="skeleton-conversation">
      <Skeleton variant="title" width="70%" />
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="text" width="40%" />
    </div>
  );
};

/**
 * Skeleton for cards
 */
export const SkeletonCard = () => {
  return (
    <div className="skeleton-card">
      <Skeleton variant="thumbnail" width="100%" height={120} />
      <div className="skeleton-card-content">
        <Skeleton variant="title" width="80%" />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="85%" />
      </div>
    </div>
  );
};

/**
 * Skeleton for table rows
 */
export const SkeletonTable = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="skeleton-table-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" width="90%" />
          ))}
        </div>
      ))}
    </div>
  );
};

/* Screen reader only */
export const ScreenReaderOnly = ({ children }) => (
  <span className="sr-only">{children}</span>
);
