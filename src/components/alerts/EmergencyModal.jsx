import { Modal } from '../ui/Modal';
import './EmergencyModal.css';

/**
 * Emergency Modal Component
 * 
 * Full-screen modal for critical emergency situations
 * Blocks all interaction until action is taken
 * 
 * @param {boolean} isOpen - Whether the modal is shown
 * @param {Function} onClose - Callback when modal closes (usually after action taken)
 * @param {Function} onCall911 - Callback when user clicks Call 911
 * @param {Function} onEscalate - Callback when user escalates to MD
 * @param {string} patientInfo - Patient context information
 * @param {string} detectedCondition - Detected emergency condition
 * @param {Array<string>} recommendations - List of immediate action recommendations
 * @param {string} severity - Emergency severity ('critical' | 'high')
 */
export const EmergencyModal = ({
  isOpen,
  onClose,
  onCall911,
  onEscalate,
  patientInfo,
  detectedCondition,
  recommendations = [],
  severity = 'critical',
}) => {
  const handleCall911 = () => {
    onCall911?.();
    
    // Trigger phone call on mobile
    if (window.navigator.userAgent.match(/iPhone|Android/i)) {
      window.location.href = 'tel:911';
    }
    
    // Keep modal open to show that action was taken
  };

  const handleEscalate = () => {
    onEscalate?.();
    onClose();
  };

  const handleAcknowledge = () => {
    // User acknowledges but doesn't call 911 - should log this
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleAcknowledge}
      size="lg"
      closeOnEscape={false}
      closeOnOverlay={false}
      className="emergency-modal"
    >
      <div className={`emergency-modal-content emergency-modal-${severity}`}>
        <div className="emergency-modal-header">
          <div className="emergency-modal-icon emergency-pulse">
            ⚠️
          </div>
          <h2 className="emergency-modal-title">
            {severity === 'critical' ? 'CRITICAL MEDICAL EMERGENCY' : 'URGENT MEDICAL ATTENTION REQUIRED'}
          </h2>
        </div>

        <div className="emergency-modal-body">
          {patientInfo && (
            <div className="emergency-section">
              <h3 className="emergency-section-title">Patient Context</h3>
              <p className="emergency-section-content">{patientInfo}</p>
            </div>
          )}

          {detectedCondition && (
            <div className="emergency-section emergency-section-highlight">
              <h3 className="emergency-section-title">Detected Condition</h3>
              <p className="emergency-section-content emergency-condition">{detectedCondition}</p>
            </div>
          )}

          {recommendations && recommendations.length > 0 && (
            <div className="emergency-section">
              <h3 className="emergency-section-title">Immediate Actions Required</h3>
              <ul className="emergency-recommendations">
                {recommendations.map((rec, index) => (
                  <li key={index} className="emergency-recommendation-item">
                    <span className="emergency-recommendation-number">{index + 1}</span>
                    <span className="emergency-recommendation-text">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="emergency-disclaimer">
            <strong>⚠️ Medical Disclaimer:</strong> This AI system provides decision support only. 
            Always use clinical judgment and follow your facility's protocols for emergency situations.
          </div>
        </div>

        <div className="emergency-modal-actions">
          <button
            className="btn-emergency-primary"
            onClick={handleCall911}
            type="button"
          >
            <span className="btn-icon">📞</span>
            <span className="btn-text">
              <span className="btn-main">Call 911 Now</span>
              <span className="btn-sub">Dispatch emergency services</span>
            </span>
          </button>

          <button
            className="btn-emergency-secondary"
            onClick={handleEscalate}
            type="button"
          >
            <span className="btn-icon">👨‍⚕️</span>
            <span className="btn-text">
              <span className="btn-main">Escalate to Physician</span>
              <span className="btn-sub">Notify MD immediately</span>
            </span>
          </button>

          <button
            className="btn-emergency-tertiary"
            onClick={handleAcknowledge}
            type="button"
          >
            I Acknowledge - Dismiss
          </button>
        </div>
      </div>
    </Modal>
  );
};

/**
 * Emergency Action Log Item
 * Shows that an emergency action was taken
 */
export const EmergencyActionLog = ({ 
  timestamp,
  action,
  user,
  patientInfo 
}) => {
  return (
    <div className="emergency-action-log">
      <div className="emergency-action-log-icon">⚠️</div>
      <div className="emergency-action-log-content">
        <div className="emergency-action-log-header">
          <span className="emergency-action-log-action">{action}</span>
          <span className="emergency-action-log-time">{timestamp}</span>
        </div>
        <div className="emergency-action-log-details">
          <span>User: {user}</span>
          {patientInfo && <span> • Patient: {patientInfo}</span>}
        </div>
      </div>
    </div>
  );
};
