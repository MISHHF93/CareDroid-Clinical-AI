import React from 'react';
import ReceptionAlertRail from './ReceptionAlertRail';
import './ReceptionThroughputAttentionCluster.css';

/**
 * Reception desk throughput awareness — compact alert rail for front-desk staff.
 */
export default function ReceptionThroughputAttentionCluster({
  patients = [],
  emsArrivals = [],
  referrals = [],
  staff = [],
  rooms = [],
  workflowLogs = [],
  emergencySettings = null,
  alerts = [],
  showSafetyEscalation = true,
  onSelectPatient,
  className = '',
}) {
  return (
    <section
      className={['reception-throughput-cluster', 'reception-throughput-cluster--compact', className]
        .filter(Boolean)
        .join(' ')}
      aria-label="Reception throughput and waiting-room safety"
    >
      <ReceptionAlertRail
        patients={patients}
        emsArrivals={emsArrivals}
        referrals={referrals}
        staff={staff}
        rooms={rooms}
        workflowLogs={workflowLogs}
        settings={emergencySettings}
        alerts={alerts}
        features={{
          showTriageBreach: true,
          showProviderWait: true,
          showEmsOffload: true,
        }}
        onSelectPatient={onSelectPatient}
        className="reception-throughput-cluster__rail"
      />
    </section>
  );
}