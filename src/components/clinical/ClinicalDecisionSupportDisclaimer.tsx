import PropTypes from 'prop-types';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';
import {
  AI_DOCUMENTATION_DISCLAIMER_UI,
  DECISION_SUPPORT_DISCLAIMER_UI,
  DRUG_INTERACTION_DISCLAIMER_UI,
  FLEET_OPERATIONAL_DISCLAIMER_UI,
} from '../../data/clinicalSafetyGuardrails';
import './ClinicalDecisionSupportDisclaimer.css';

const VARIANT_COPY = {
  clinical: DECISION_SUPPORT_DISCLAIMER_UI,
  fleet: FLEET_OPERATIONAL_DISCLAIMER_UI,
  'ai-documentation': AI_DOCUMENTATION_DISCLAIMER_UI,
  'drug-interaction': DRUG_INTERACTION_DISCLAIMER_UI,
};

/**
 * @param {{ variant?: keyof VARIANT_COPY, className?: string, children?: import('react').ReactNode }} props
 */
export default function ClinicalDecisionSupportDisclaimer({
  variant = 'clinical',
  className = '',
  children = undefined as any,
}) {
  const copy = children || VARIANT_COPY[variant] || VARIANT_COPY.clinical;

  return (
    <div
      className={`clinical-ds-disclaimer clinical-ds-disclaimer--${variant} ${className}`.trim()}
      role="note"
      aria-label="Clinical decision support disclaimer"
    >
      <span className="clinical-ds-disclaimer__icon" aria-hidden>
        <NavIcon icon={CHROME_ICONS.alert} size={18} />
      </span>
      <p className="clinical-ds-disclaimer__text">{copy}</p>
    </div>
  );
}

ClinicalDecisionSupportDisclaimer.propTypes = {
  variant: PropTypes.oneOf(['clinical', 'fleet', 'ai-documentation', 'drug-interaction']),
  className: PropTypes.string,
  children: PropTypes.node,
};
