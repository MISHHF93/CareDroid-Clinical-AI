import React, { useMemo } from 'react';
import { selectReceptionQueues } from './receptionQueueModel';
import EmsPreArrivalPanel from './EmsPreArrivalPanel';
import RecentArrivalsPanel from './RecentArrivalsPanel';
import ReceptionWorkQueues from './ReceptionWorkQueues';
import './ArrivalDashboard.css';

export default function ArrivalDashboard({
  patients = [],
  emsArrivals = [],
  receptionLoading = false,
  activeQueueTab = 'ems',
  canPrepareRegistration = false,
  canConvertArrival = false,
  onSelectPatient,
  onTabChange,
  onOpenVerification,
  onPrepareRegistration,
  onConvertArrival,
  onRefreshEms,
  expandedPatientId = null,
  onExpandPatient,
}) {
  const queues = useMemo(() => selectReceptionQueues(patients), [patients]);

  return (
    <section className="arrival-dashboard" aria-labelledby="arrival-dashboard-title">
      <h2 id="arrival-dashboard-title" className="arrival-dashboard__title">
        Queues &amp; arrivals
      </h2>

      <div className="arrival-dashboard__feeds">
        <RecentArrivalsPanel patients={queues.recentArrivals} onSelectPatient={onSelectPatient} />
        <EmsPreArrivalPanel
          arrivals={emsArrivals}
          loading={receptionLoading}
          canPrepareRegistration={canPrepareRegistration}
          canConvertArrival={canConvertArrival}
          onPrepareRegistration={onPrepareRegistration}
          onConvertArrival={onConvertArrival}
          onRefresh={onRefreshEms}
        />
      </div>

      <ReceptionWorkQueues
        patients={patients}
        activeTab={activeQueueTab}
        onTabChange={onTabChange}
        onOpenVerification={onOpenVerification}
        onOpenPatient={onSelectPatient}
        expandedPatientId={expandedPatientId}
        onExpandPatient={onExpandPatient}
      />
    </section>
  );
}
