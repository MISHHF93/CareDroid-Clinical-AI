import './EmptyState.css';

/**
 * Empty State Component
 *
 * Displays when there's no data to show (empty lists, search results, etc.)
 * @param {string} icon - Icon/emoji to display
 * @param {string} title - Main heading text
 * @param {string} description - Supportive description text
 * @param {ReactNode} action - Optional action button(s)
 * @param {('sm'|'md'|'lg')} size - Size variant
 * @param {string} className - Additional CSS classes
 */
export const EmptyState = ({
  icon = '📭',
  title = 'No data yet',
  description,
  action = undefined,
  size = 'md',
  className = '',
  ...props
}) => {
  return (
    <div className={`empty-state empty-state-${size} ${className}`} {...props}>
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-content">
        <h3 className="empty-state-title">{title}</h3>
        {description && <p className="empty-state-description">{description}</p>}
        {action && <div className="empty-state-action">{action}</div>}
      </div>
    </div>
  );
};

/**
 * Empty conversation list state
 */
export const EmptyConversations = ({ onNewConversation }) => {
  return (
    <EmptyState
      icon="💬"
      title="No conversations yet"
      description="Start a new conversation to ask CareDroid clinical questions"
      action={
        onNewConversation && (
          <button type="button" className="btn-primary" onClick={onNewConversation}>
            Start Conversation
          </button>
        )
      }
    />
  );
};

/**
 * Empty search results state
 */
export const EmptySearchResults = ({ query }) => {
  return (
    <EmptyState
      icon="🔍"
      title="No results found"
      description={
        query
          ? `No results for "${query}". Try different keywords.`
          : 'Try searching for conversations, tools, or topics.'
      }
      size="sm"
    />
  );
};

/**
 * Empty notifications state
 */
export const EmptyNotifications = () => {
  return (
    <EmptyState
      icon="🔔"
      title="All caught up!"
      description="You have no new notifications"
      size="sm"
    />
  );
};

/**
 * Empty audit logs state
 */
export const EmptyAuditLogs = () => {
  return (
    <EmptyState
      icon="📋"
      title="No audit logs"
      description="Audit logs will appear here when actions are performed"
      size="sm"
    />
  );
};

/**
 * Error state (for when data fetch fails)
 */
export const ErrorState = ({
  title = 'Something went wrong',
  description = 'Unable to load data. Please try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`empty-state error-state ${className}`}>
      <div className="empty-state-icon">⚠️</div>
      <div className="empty-state-content">
        <h3 className="empty-state-title">{title}</h3>
        {description && <p className="empty-state-description">{description}</p>}
        {onRetry && (
          <div className="empty-state-action">
            <button type="button" className="btn-secondary" onClick={onRetry}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
