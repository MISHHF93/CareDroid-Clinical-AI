import { useState, useEffect } from 'react';
import './EmergencyBanner.css';

/**
 * Emergency Banner Component
 * 
 * Critical alert banner for emergency situations
 * Appears at the top of the screen and persists until acknowledged
 * 
 * @param {boolean} isVisible - Whether the banner is shown
 * @param {Function} onDismiss - Callback when user dismisses
 * @param {Function} onCall911 - Callback when user clicks Call 911
 * @param {Function} onEscalate - Callback when user escalates to MD
 * @param {string} message - Emergency message to display
 * @param {('critical'|'high'|'medium')} severity - Alert severity level
 * @param {boolean} persistent - Whether banner can be dismissed (default: true for critical)
 */
export const EmergencyBanner = ({
  isVisible,
  onDismiss,
  onCall911,
  onEscalate,
  message = 'CRITICAL EMERGENCY DETECTED - Patient requires immediate medical attention',
  severity = 'critical',
  persistent = true,
}) => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowBanner(true);
      
      // Trigger haptic feedback if available
      if (window.navigator.vibrate) {
        window.navigator.vibrate([200, 100, 200]); // Attention pattern
      }

      // Play alert sound (optional - would need audio file)
      // const audio = new Audio('/alert.mp3');
      // audio.play();
    }
  }, [isVisible]);

  if (!showBanner) return null;

  const handleDismiss = () => {
    if (!persistent) {
      setShowBanner(false);
      onDismiss?.();
    }
  };

  const handleCall911 = () => {
    onCall911?.();
    
    // On mobile, try to trigger phone call
    if (window.navigator.userAgent.match(/iPhone|Android/i)) {
      window.location.href = 'tel:911';
    }
  };

  return (
    <div
      className={`emergency-banner emergency-${severity}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="emergency-banner-icon">
        <span className="emergency-pulse">⚠️</span>
      </div>

      <div className="emergency-banner-content">
        <h3 className="emergency-banner-title">
          {severity === 'critical' && 'CRITICAL EMERGENCY'}
          {severity === 'high' && 'HIGH PRIORITY ALERT'}
          {severity === 'medium' && 'URGENT ATTENTION NEEDED'}
        </h3>
        <p className="emergency-banner-message">{message}</p>
      </div>

      <div className="emergency-banner-actions">
        {onCall911 && (
          <button
            className="btn-emergency btn-emergency-critical"
            onClick={handleCall911}
            type="button"
          >
            <span className="btn-icon">📞</span>
            Call 911
          </button>
        )}

        {onEscalate && (
          <button
            className="btn-emergency btn-emergency-secondary"
            onClick={onEscalate}
            type="button"
          >
            Escalate to MD
          </button>
        )}

        {!persistent && onDismiss && (
          <button
            className="emergency-banner-close"
            onClick={handleDismiss}
            aria-label="Dismiss alert"
            type="button"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Emergency Toast (Smaller, less intrusive)
 */
export const EmergencyToast = ({
  isVisible,
  onDismiss,
  message,
  severity = 'medium',
  autoHide = false,
  duration = 5000,
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);

      if (autoHide) {
        const timer = setTimeout(() => {
          setShow(false);
          onDismiss?.();
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, autoHide, duration, onDismiss]);

  if (!show) return null;

  return (
    <div
      className={`emergency-toast emergency-toast-${severity}`}
      role="alert"
      aria-live="polite"
    >
      <span className="emergency-toast-icon">⚠️</span>
      <span className="emergency-toast-message">{message}</span>
      {onDismiss && (
        <button
          className="emergency-toast-close"
          onClick={() => {
            setShow(false);
            onDismiss();
          }}
          aria-label="Dismiss"
          type="button"
        >
          ✕
        </button>
      )}
    </div>
  );
};

/**
 * Emergency Status Indicator (Persistent indicator in corner)
 */
export const EmergencyStatusIndicator = ({ 
  isActive,
  count = 1,
  onClick 
}) => {
  if (!isActive) return null;

  return (
    <button
      className="emergency-status-indicator"
      onClick={onClick}
      aria-label={`${count} active emergency alert${count > 1 ? 's' : ''}`}
      type="button"
    >
      <span className="emergency-indicator-icon emergency-pulse">⚠️</span>
      {count > 1 && (
        <span className="emergency-indicator-count">{count}</span>
      )}
    </button>
  );
};
