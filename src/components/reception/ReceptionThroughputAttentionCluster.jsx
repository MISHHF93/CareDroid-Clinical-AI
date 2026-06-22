import React from 'react';
import TriageBreachStrip from '../triage/TriageBreachStrip';
import LwbsRiskStrip from '../waiting-room/LwbsRiskStrip';
import DeteriorationWatchStrip from '../waiting-room/DeteriorationWatchStrip';
import QueueReasonAttentionStrip from '../queues/QueueReasonAttentionStrip';
import EmsOffloadAttentionStrip from '../ems/EmsOffloadAttentionStrip';
import './ReceptionThroughputAttentionCluster.css';

/**
 * Reception desk throughput awareness — reuses whiteboard attention strips
 * so front-desk staff see the same operational signals without opening the board.
 */
export default function ReceptionThroughputAttentionCluster({
  patients = [],
  emsArrivals = [],
  referrals = [],
  staff = [],
  rooms = [],
  workflowLogs = [],
  emergencySettings = null,
  onSelectPatient,
  onSelectEmsArrival,
  className = '',
}) {
  const offloadTargetMinutes =
    Number(
      emergencySettings?.thresholds?.emsOffloadTargetMinutes ??
        emergencySettings?.emsThresholds?.offloadTargetMinutes ??
        15,
    ) || 15;

  return (
    <section
      className={['reception-throughput-cluster', className].filter(Boolean).join(' ')}
      aria-label="Reception throughput and waiting-room safety"
    >
      <header className="reception-throughput-cluster__header">
        <p className="reception-throughput-cluster__eyebrow">Throughput awareness</p>
        <h2>Department pressure signals</h2>
        <p className="reception-throughput-cluster__subtitle">
          Arrival-to-triage, waiting-room safety, queue reasons, and EMS offload — aggregate staff view only.
        </p>
      </header>
      <div className="reception-throughput-cluster__grid">
        <TriageBreachStrip
          patients={patients}
          settings={emergencySettings}
          onSelectPatient={onSelectPatient}
          className="reception-throughput-cluster__strip"
        />
        <LwbsRiskStrip
          patients={patients}
          workflowLogs={workflowLogs}
          staff={staff}
          onSelectPatient={onSelectPatient}
          className="reception-throughput-cluster__strip"
        />
        <DeteriorationWatchStrip
          patients={patients}
          emsArrivals={emsArrivals}
          onSelectPatient={onSelectPatient}
          className="reception-throughput-cluster__strip"
        />
        <QueueReasonAttentionStrip
          patients={patients}
          referrals={referrals}
          staff={staff}
          onSelectPatient={onSelectPatient}
          className="reception-throughput-cluster__strip"
        />
        <EmsOffloadAttentionStrip
          emsArrivals={emsArrivals}
          patients={patients}
          staff={staff}
          rooms={rooms}
          offloadTargetMinutes={offloadTargetMinutes}
          onSelectPatient={onSelectPatient}
          onSelectArrival={onSelectEmsArrival}
          className="reception-throughput-cluster__strip"
        />
      </div>
    </section>
  );
}
