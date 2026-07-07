import { useMemo, useState } from 'react';
import type { Patient } from '../../types/emergency';
import { useNativeAiDashboardData } from '../../hooks/useNativeAiDashboardData';
import {
  DEFAULT_NATIVE_AI_THRESHOLDS,
  resolveNativeAiThresholds,
  type NativeAiThresholdConfig,
} from '../../config/nativeAiThresholds.config';
import { buildOperationalCommandDashboardSnapshot } from '../../services/operationalCommandDashboardModel';
import { logNativeAiDashboardAudit } from '../../services/nativeAiAudit';
import AiTransparencyDashboard from '../copilot/AiTransparencyDashboard';
import DiagnosticSafetyDashboard from '../copilot/DiagnosticSafetyDashboard';
import ClinicalAcuityLeaderboard from './ClinicalAcuityLeaderboard';
import DriftMonitoringPanel from './DriftMonitoringPanel';
import './NativeAiCommandSuitePanel.css';
import './native-ai-dashboard-theme.css';

type NativeAiCommandSuitePanelProps = {
  patients: Patient[];
  rooms?: Array<{ id: string; status?: string; type?: string; patientId?: string; currentPatientId?: string | null }>;
  capacity?: { band?: string; occupancyPercent?: number };
  onSelectPatient?: (patientId: string) => void;
  thresholds?: Partial<NativeAiThresholdConfig>;
  className?: string;
};

export default function NativeAiCommandSuitePanel({
  patients,
  rooms = [] as any[],
  capacity,
  onSelectPatient,
  thresholds,
  className = '',
}: NativeAiCommandSuitePanelProps) {
  const [localThresholds, setLocalThresholds] = useState<NativeAiThresholdConfig>(() =>
    resolveNativeAiThresholds(thresholds),
  );

  const dashboardData = useNativeAiDashboardData(patients);

  const snapshot = useMemo(
    () =>
      buildOperationalCommandDashboardSnapshot({
        patients,
        rooms: rooms as import('../../types/emergency').Room[],
        admissionAlertThreshold: localThresholds.admissionAlertPercent,
        prolongedStayAlertThreshold: localThresholds.prolongedStayAlertPercent,
        now: new Date(),
      }),
    [localThresholds.admissionAlertPercent, localThresholds.prolongedStayAlertPercent, patients, rooms],
  );

  const occupancyPercent =
    capacity?.occupancyPercent ??
    (rooms.length
      ? Math.round(
          (rooms.filter((room) => room.status === 'Occupied' || room.patientId || room.currentPatientId).length /
            rooms.length) *
            100,
        )
      : 0);

  const prolongedStayBreached = snapshot.prolongedStayAlerts.length >= localThresholds.highProlongedStayPatientCount;
  const occupancyBreached = occupancyPercent >= localThresholds.occupancyAlertPercent;

  const handlePatientSelect = (patientId: string) => {
    logNativeAiDashboardAudit({
      action: 'acuity_dashboard_select_patient',
      patientId,
      details: { source: 'clinical_acuity_dashboard' },
    });
    onSelectPatient?.(patientId);
  };

  return (
    <section className={['native-ai-command-suite', className].filter(Boolean).join(' ')} aria-label="Native AI command suite">
      <header className="native-ai-command-suite__header">
        <div>
          <p className="native-ai-command-suite__eyebrow">Native AI · Command suite</p>
          <h2>Clinical Acuity &amp; ML Operations</h2>
        </div>
        <div className="native-ai-command-suite__status" aria-label="Native AI backend status">
          <span data-state={dashboardData.acuitySource}>Acuity · {dashboardData.acuitySource}</span>
          <span data-state={dashboardData.registrySource}>
            Registry · {dashboardData.registryModelCount} models
          </span>
          <span data-state={dashboardData.driftSource}>
            Drift · {dashboardData.driftAlertCount} alerts
          </span>
          {dashboardData.connectionError ? (
            <span data-state="error">{dashboardData.connectionError}</span>
          ) : null}
        </div>
        {(prolongedStayBreached || occupancyBreached) && (
          <div className="native-ai-command-suite__alert-banner" role="status">
            {occupancyBreached ? `Occupancy ${occupancyPercent}% exceeds ${localThresholds.occupancyAlertPercent}% threshold. ` : ''}
            {prolongedStayBreached
              ? `${snapshot.prolongedStayAlerts.length} patients exceed prolonged-stay risk threshold.`
              : ''}
          </div>
        )}
      </header>

      <div className="native-ai-command-suite__thresholds" aria-label="Charge nurse ML alert thresholds">
        <label>
          Admission alert %
          <input
            type="number"
            min={40}
            max={95}
            value={localThresholds.admissionAlertPercent}
            onChange={(event) =>
              setLocalThresholds((current) => ({
                ...current,
                admissionAlertPercent: Number(event.target.value) || DEFAULT_NATIVE_AI_THRESHOLDS.admissionAlertPercent,
              }))
            }
          />
        </label>
        <label>
          Prolonged stay alert %
          <input
            type="number"
            min={40}
            max={95}
            value={localThresholds.prolongedStayAlertPercent}
            onChange={(event) =>
              setLocalThresholds((current) => ({
                ...current,
                prolongedStayAlertPercent:
                  Number(event.target.value) || DEFAULT_NATIVE_AI_THRESHOLDS.prolongedStayAlertPercent,
              }))
            }
          />
        </label>
        <label>
          Occupancy alert %
          <input
            type="number"
            min={70}
            max={100}
            value={localThresholds.occupancyAlertPercent}
            onChange={(event) =>
              setLocalThresholds((current) => ({
                ...current,
                occupancyAlertPercent:
                  Number(event.target.value) || DEFAULT_NATIVE_AI_THRESHOLDS.occupancyAlertPercent,
              }))
            }
          />
        </label>
        <label>
          High prolonged-stay count
          <input
            type="number"
            min={1}
            max={12}
            value={localThresholds.highProlongedStayPatientCount}
            onChange={(event) =>
              setLocalThresholds((current) => ({
                ...current,
                highProlongedStayPatientCount:
                  Number(event.target.value) || DEFAULT_NATIVE_AI_THRESHOLDS.highProlongedStayPatientCount,
              }))
            }
          />
        </label>
      </div>

      <ClinicalAcuityLeaderboard
        patients={patients}
        entries={dashboardData.acuityEntries}
        dataSource={dashboardData.acuitySource}
        onSelectPatient={handlePatientSelect}
      />
      <DiagnosticSafetyDashboard patients={patients} onSelectPatient={handlePatientSelect} />
      <DriftMonitoringPanel />
      <AiTransparencyDashboard patients={patients.slice(0, 12)} />
    </section>
  );
}