import './Spinner.css';

/**
 * Loading Spinner Component
 *
 * A simple, accessible loading spinner with multiple size options
 * @param {('sm'|'md'|'lg'|'xl')} size - Spinner size
 * @param {('accent'|'white'|'muted')} color - Spinner color variant
 * @param {string} className - Additional CSS classes
 */
export const Spinner = ({ size = 'md', color = 'accent', className = '', ...props }) => {
  return (
    <div
      className={`spinner spinner-${size} spinner-${color} ${className}`}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <span className="sr-only">Loading department data...</span>
    </div>
  );
};

/**
 * Full-screen loading overlay
 */
export const LoadingScreen = ({ message = 'Loading department data...' }) => {
  return (
    <div className="loading-screen">
      <div className="loading-screen-content">
        <Spinner size="xl" />
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

/**
 * Inline loading text with spinner
 */
export const LoadingText = ({ text = 'Loading', size = 'sm' }) => {
  return (
    <div className="loading-text">
      <Spinner size={size} />
      <span>{text}</span>
    </div>
  );
};
