import { useMemo } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { buildDataQualitySnapshot } from '../../services/dataQualityDiscovery';
import DataQualityRiskPanel from '../dataQuality/DataQualityRiskPanel';
import './DataQualityRiskStrip.css';

export default function DataQualityRiskStrip({ limit = 4 }) {
  const patients = useEmergencyStore((state) => state.patients);
  const snapshot = useMemo(() => buildDataQualitySnapshot(patients), [patients]);

  if (!snapshot.summary.patientsWithRisks) return null;

  return (
    <div className="data-quality-risk-strip" aria-label="Data quality risks">
      <DataQualityRiskPanel
        snapshot={{
          ...snapshot,
          topRisks: snapshot.topRisks.slice(0, limit),
        }}
        title="Registration data gaps"
        description="Missing demographics, arrival reason, verification, or possible duplicate patients."
        compact
        limit={limit}
        className="data-quality-risk-strip__panel"
      />
    </div>
  );
}
