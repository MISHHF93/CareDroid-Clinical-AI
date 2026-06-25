import React, { Suspense, lazy, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ClinicalCalculatorHub from '../ClinicalCalculatorHub';
import { HUMAN_REVIEW_DISCLAIMER } from '../../lib/ai/safety/policy';
import useEffectiveUserProfile from '../../hooks/useEffectiveUserProfile';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { resolveReceptionDeskCalculatorIds } from '../../services/unifiedClinicalToolsBridge';
import './ReceptionEmbeddedCalculator.css';

const EmbeddedCalculators = lazy(() => import('../../pages/tools/Calculators'));

export default function ReceptionEmbeddedCalculator({
  calculatorId = null,
  patientId = null,
  onClose,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { saasRole } = useEffectiveUserProfile();
  const emergencyRole = useEmergencyRolePermissions();
  const allowedCalculatorIds = useMemo(
    () =>
      resolveReceptionDeskCalculatorIds({
        saasRole,
        emergencyRoleId: emergencyRole.role,
      }),
    [emergencyRole.role, saasRole],
  );
  const activeCalc = calculatorId || searchParams.get('calc') || searchParams.get('open');
  const showHub = !activeCalc || activeCalc === 'hub' || searchParams.get('tools') === 'calculators';

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    const next = new URLSearchParams(searchParams);
    ['calc', 'open', 'tools', 'source', 'patientId'].forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  }, [onClose, searchParams, setSearchParams]);

  return (
    <section className="reception-embedded-calculator" aria-label="Clinical calculators">
      <header className="reception-embedded-calculator__header">
        <div>
          <h2 className="reception-embedded-calculator__title">Clinical calculators</h2>
          <p className="reception-embedded-calculator__hint">{HUMAN_REVIEW_DISCLAIMER}</p>
        </div>
        <button type="button" className="reception-embedded-calculator__close" onClick={handleClose}>
          Close
        </button>
      </header>

      {showHub ? (
        <ClinicalCalculatorHub
          embedded
          allowedCalculatorIds={allowedCalculatorIds}
        />
      ) : (
        <Suspense fallback={<p className="reception-embedded-calculator__loading">Loading calculator…</p>}>
          <EmbeddedCalculators initialCalculatorId={activeCalc} embedded patientId={patientId} />
        </Suspense>
      )}
    </section>
  );
}