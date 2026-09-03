import { useState } from 'react';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useRouteChromeRegistration } from '../../contexts/RouteChromeContext';
import useProfileNavigate from '../../hooks/useProfileNavigate';
import { Checkbox } from '../../components/forms/Checkbox';
import { recordConsentPreferences } from '../../services/complianceApi';
import { getStoredAccessToken } from '../../services/apiClient';
import './ConsentFlow.css';
import logger from '../../utils/logger';

/**
 * ConsentFlow Component
 *
 * In-app consent collection for HIPAA, privacy policy, and terms
 * REQUIRED before user can access clinical tools
 * Tracks consent in audit log
 */
export const ConsentFlow = ({ onComplete }) => {
  useRouteChromeRegistration({ title: 'Privacy & Consent' });
  const { profileNavigate } = useProfileNavigate();
  const [consents, setConsents] = useState({
    hipaa: false,
    privacy: false,
    terms: false,
    dataSharing: false,
    communications: false,
  });
  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConsentChange = (key, checked) => {
    setConsents((prev) => ({ ...prev, [key]: checked }));
    // Clear error when user checks the box
    if (checked && errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: null }));
    }
  };

  const validateConsents = () => {
    const newErrors: any = {};

    // Required consents
    if (!consents.hipaa) {
      newErrors.hipaa = 'HIPAA authorization is required to use CareDroid';
    }
    if (!consents.privacy) {
      newErrors.privacy = 'You must accept the Privacy Policy to continue';
    }
    if (!consents.terms) {
      newErrors.terms = 'You must accept the Terms of Service to continue';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateConsents()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (!getStoredAccessToken()) {
        throw new Error('Sign in required to record consent on the server.');
      }

      const result = await recordConsentPreferences({
        dataProcessing: consents.hipaa && consents.privacy && consents.terms,
        thirdPartySharing: consents.dataSharing,
        marketing: consents.communications,
      });

      if (!result.ok) {
        throw new Error(result.message || 'Failed to record consent');
      }

      // Mark onboarding as complete
      localStorage.setItem('consentsAccepted', 'true');

      // Call completion callback or navigate
      if (onComplete) {
        onComplete();
      } else {
        profileNavigate('/');
      }
    } catch (error: any) {
      logger.error('Consent submission error', { error });
      setErrors({ submit: 'Failed to record your consent. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="consent-flow">
      <div className="consent-container">
        <div className="consent-header">
          <p className="consent-header__title-text" data-testid="cd-page-title-text">
            Privacy & Consent
          </p>
          <p className="consent-intro">
            Before you can use CareDroid, we need your consent to collect and process Protected
            Health Information (PHI) in compliance with HIPAA regulations.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="consent-form">
          {/* HIPAA Authorization */}
          <div className="consent-section consent-section-required">
            <div className="consent-section-header">
              <h2>1. HIPAA Authorization</h2>
              <span className="consent-badge consent-badge-required">Required</span>
            </div>
            <div className="consent-content">
              <p>
                I authorize CareDroid to use and disclose my Protected Health Information (PHI) for
                the purpose of providing clinical decision support services.
              </p>
              <div className="consent-details">
                <h4>What PHI May Be Used:</h4>
                <ul>
                  <li>Patient identifiers (as provided by you)</li>
                  <li>Medical history and clinical data</li>
                  <li>Laboratory results and diagnostic information</li>
                  <li>Treatment plans and recommendations</li>
                </ul>
                <h4>Who May Access PHI:</h4>
                <ul>
                  <li>You (the authorized user)</li>
                  <li>Authorized users in your organization</li>
                  <li>CareDroid's AI processing systems</li>
                  <li>HIPAA-compliant service providers under Business Associate Agreements</li>
                </ul>
                <h4>Your Rights:</h4>
                <ul>
                  <li>
                    You may revoke this authorization at any time by contacting{' '}
                    <a href="mailto:privacy@caredroid.ai">privacy@caredroid.ai</a>
                  </li>
                  <li>Revocation will not affect actions already taken</li>
                  <li>After revocation, you will not be able to use CareDroid's clinical tools</li>
                </ul>
              </div>
              <Checkbox
                id="consent-hipaa"
                label="I authorize the use of PHI as described above"
                checked={consents.hipaa}
                onChange={(checked) => handleConsentChange('hipaa', checked)}
                required
                error={errors.hipaa}
                size="lg"
              />
            </div>
          </div>

          {/* Privacy Policy */}
          <div className="consent-section consent-section-required">
            <div className="consent-section-header">
              <h2>2. Privacy Policy</h2>
              <span className="consent-badge consent-badge-required">Required</span>
            </div>
            <div className="consent-content">
              <p>
                Please review our{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>{' '}
                to understand how we collect, use, and protect your information.
              </p>
              <Checkbox
                id="consent-privacy"
                label="I have read and accept the Privacy Policy"
                checked={consents.privacy}
                onChange={(checked) => handleConsentChange('privacy', checked)}
                required
                error={errors.privacy}
                size="lg"
              />
            </div>
          </div>

          {/* Terms of Service */}
          <div className="consent-section consent-section-required">
            <div className="consent-section-header">
              <h2>3. Terms of Service</h2>
              <span className="consent-badge consent-badge-required">Required</span>
            </div>
            <div className="consent-content">
              <p>
                Please review our{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </a>{' '}
                including our medical disclaimer and acceptable use policy.
              </p>
              <div className="consent-warning">
                <p>
                  <strong>⚠️ Important:</strong> CareDroid is a decision support tool only. It is
                  NOT a substitute for professional medical judgment.
                </p>
              </div>
              <Checkbox
                id="consent-terms"
                label="I have read and accept the Terms of Service"
                checked={consents.terms}
                onChange={(checked) => handleConsentChange('terms', checked)}
                required
                error={errors.terms}
                size="lg"
              />
            </div>
          </div>

          {/* Data Sharing (Optional) */}
          <div className="consent-section consent-section-optional">
            <div className="consent-section-header">
              <h2>4. Anonymized Data for Research</h2>
              <span className="consent-badge consent-badge-optional">Optional</span>
            </div>
            <div className="consent-content">
              <p>
                Help us improve CareDroid by allowing us to use anonymized, de-identified data for
                research and AI model training.{' '}
                <strong>No PHI or personal information will be included.</strong>
              </p>
              <Checkbox
                id="consent-data-sharing"
                label="I consent to anonymized data use for research purposes"
                description="You can change this preference later in Settings"
                checked={consents.dataSharing}
                onChange={(checked) => handleConsentChange('dataSharing', checked)}
                size="lg"
              />
            </div>
          </div>

          {/* Communications (Optional) */}
          <div className="consent-section consent-section-optional">
            <div className="consent-section-header">
              <h2>5. Communications</h2>
              <span className="consent-badge consent-badge-optional">Optional</span>
            </div>
            <div className="consent-content">
              <p>
                Receive updates about new features, clinical guidelines, and educational content.
                You can unsubscribe at any time.
              </p>
              <Checkbox
                id="consent-communications"
                label="I want to receive product updates and educational content"
                description="No marketing or promotional emails"
                checked={consents.communications}
                onChange={(checked) => handleConsentChange('communications', checked)}
                size="lg"
              />
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && <div className="consent-error-global">{errors.submit}</div>}

          {/* Actions */}
          <div className="consent-actions">
            <button
              type="button"
              className="btn-consent-secondary"
              onClick={() => profileNavigate(CANONICAL_ROUTES.platformStart)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-consent-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Recording Consent...' : 'Accept and Continue'}
            </button>
          </div>

          <p className="consent-footer-note">
            This consent will be recorded with a timestamp, your IP address, and user information
            for our audit log as required by HIPAA.
          </p>
        </form>
      </div>
    </div>
  );
};
