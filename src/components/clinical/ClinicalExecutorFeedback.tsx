import PropTypes from 'prop-types';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS } from '../../navigation/iconRegistry';
import './ClinicalExecutorFeedback.css';

/**
 * Loading, error, and unsupported states for POST orchestrator tools.
 */
export function ClinicalExecutorFeedback({ loading, error, unsupported, unsupportedDetail }) {
  if (loading) {
    return (
      <div className="clinical-executor-feedback clinical-executor-feedback--loading" role="status">
        <span className="clinical-executor-feedback__icon clinical-executor-feedback__icon--spin" aria-hidden>
          <NavIcon icon={CHROME_ICONS.loader} size={20} />
        </span>
        <span>Running on server…</span>
      </div>
    );
  }

  if (unsupported) {
    return (
      <div
        className="clinical-executor-feedback clinical-executor-feedback--unsupported"
        role="status"
      >
        <p className="clinical-executor-feedback__title">Server execution not available</p>
        <p className="clinical-executor-feedback__body">
          {unsupportedDetail ||
            'This tool runs in the browser or via guided chat only. It does not use a registered backend executor.'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="clinical-executor-feedback clinical-executor-feedback--error" role="alert">
        <p>{error}</p>
      </div>
    );
  }

  return null;
}

ClinicalExecutorFeedback.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  unsupported: PropTypes.bool,
  unsupportedDetail: PropTypes.string,
};
