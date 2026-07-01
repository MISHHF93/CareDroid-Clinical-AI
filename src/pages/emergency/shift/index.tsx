import { useEffect, useMemo, useState } from 'react';
import HandoffBriefGenerator from '../../../components/HandoffBriefGenerator';
import OperationalEmptyState from '../../../components/ui/OperationalEmptyState';
import { CareDroidPage } from '../../../components/ui/CareDroidPrimitives';
import { EMPTY_STATE_COPY } from '../../../config/emptyStateCopy';
import EdDataSourceBanner from '../../../components/emergency/EdDataSourceBanner';
import { usePractitionerSurfaceVisibility } from '../../../contexts/PractitionerVisibilityContext';
import useEdRouteDataContext from '../../../hooks/useEdRouteDataContext';
import { useEmergencyStore } from '../../../store/emergencyStore';
import {
  buildShiftSummary,
  formatClock,
  formatHHMM,
  formatMinutes,
  type ShiftSummary,
} from './shiftSummaryData';
import './ShiftSummary.css';

type StatTileProps = {
  label: string;
  value: string | number;
  tone?: 'blue' | 'green' | 'yellow' | 'red' | 'neutral';
  mono?: boolean;
};

function StatTile({ label, value, tone = 'neutral', mono = false }: StatTileProps) {
  return (
    <article className={`shift-summary__stat shift-summary__stat--${tone}`}>
      <strong className={mono ? 'shift-summary__mono' : undefined}>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="shift-summary__section">
      <div className="shift-summary__section-header">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function CapacityBar({ totals }: { totals: ShiftSummary['capacity']['totals'] }) {
  return (
    <div className="shift-summary__capacity-bars">
      {totals.map((item) => (
        <div key={item.band} className="shift-summary__capacity-row">
          <span>{item.band}</span>
          <div className="shift-summary__capacity-track" aria-label={`${item.band} ${item.minutes} minutes`}>
            <div
              className={`shift-summary__capacity-fill shift-summary__capacity-fill--${item.band.toLowerCase()}`}
              style={{ width: `${Math.max(item.percent, item.minutes > 0 ? 4 : 0)}%` }}
            />
          </div>
          <strong>{formatMinutes(item.minutes)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function EmergencyShiftSummaryPage() {
  const surfaces = usePractitionerSurfaceVisibility();
  const { activeScenarioId, backendAvailable, envelope, loading } = useEdRouteDataContext();
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const activeShift = useEmergencyStore((state) => state.activeShift);
  const referrals = useEmergencyStore((state) => state.referrals);
  const alerts = useEmergencyStore((state) => state.alerts);
  const capacity = useEmergencyStore((state) => state.capacity);
  const capacityHistory = useEmergencyStore((state) => state.capacityHistory);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const emsUnits = useEmergencyStore((state) => state.emsUnits);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const emsIncomingPatients = useEmergencyStore((state) => state.emsIncomingPatients);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const [now, setNow] = useState(() => new Date());
  const [handoffStatus, setHandoffStatus] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const summary = useMemo(
    () =>
      buildShiftSummary({
        patients,
        staff,
        activeShift,
        referrals,
        alerts,
        capacity,
        capacityHistory,
        workflowLogs,
        emsUnits,
        emsArrivals,
        emsIncomingPatients,
        emergencySettings,
        now,
      }),
    [activeShift, alerts, capacity, capacityHistory, emergencySettings, emsArrivals, emsIncomingPatients, emsUnits, now, patients, referrals, staff, workflowLogs],
  );

  const triggerHandoffBrief = () => {
    const detail = {
      source: 'C15_SHIFT_SUMMARY',
      requestedAt: new Date().toISOString(),
      summary,
    };
    window.dispatchEvent(new CustomEvent('c16:generate-handoff-brief', { detail }));
    document.dispatchEvent(new CustomEvent('generate-shift-handoff-brief', { detail }));
    setHandoffStatus('Handoff brief requested from C16 using the current shift summary.');
    document.getElementById('shift-handoff-generator')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showSecondarySections = surfaces.shift.showSecondarySections;

  return (
    <CareDroidPage
      as="section"
      eyebrow="Shift operations"
      title="Emergency Shift Summary"
      titleId="shift-summary-title"
      description={
        surfaces.emergencyRoutes.showDescriptions
          ? 'Data-driven handoff view computed from the CareDroid store, patient timelines, referrals, alerts, capacity state, and EMS records.'
          : undefined
      }
      actions={
        <button type="button" className="shift-summary__handoff cd-btn cd-btn--primary cd-btn--sm" onClick={triggerHandoffBrief}>
          Generate Handoff Brief
        </button>
      }
      className={`shift-summary${
        surfaces.compactLayout ? ' shift-summary--practitioner-compact' : ''
      }`}
      headerClassName="shift-summary__hero"
      contentClassName="shift-summary__content"
      aria-labelledby="shift-summary-title"
      zones={{
        operationalSummary: (
          <>
            <EdDataSourceBanner
              envelope={envelope}
              loading={loading}
              activeScenarioId={activeScenarioId}
              backendAvailable={backendAvailable}
              compact
              className="shift-summary__data-source"
            />
            <section className="shift-summary__header-card cdl-surface cdl-surface--operational-status" aria-label="Shift header">
        <div>
          <span>Shift start</span>
          <strong>{formatClock(summary.shift.startTime)}</strong>
          <small>{new Date(summary.shift.startTime).toLocaleString()}</small>
        </div>
        <div>
          <span>Duration</span>
          <strong className="shift-summary__mono">{formatHHMM(summary.shift.durationMinutes)}</strong>
          <small>Running timer</small>
        </div>
        <div>
          <span>Staff on duty</span>
          <strong>{summary.shift.staffOnDuty.length}</strong>
          <small>{summary.shift.staffOnDuty.join(', ') || 'No on-shift staff recorded'}</small>
        </div>
            </section>
            {handoffStatus ? <p className="shift-summary__status">{handoffStatus}</p> : null}
          </>
        ),
        activeWork: (
          <>
            {summary.volume.active === 0 ? (
              <OperationalEmptyState
                title={EMPTY_STATE_COPY.shift.empty.title}
                guidance={EMPTY_STATE_COPY.shift.empty.guidance}
                status={EMPTY_STATE_COPY.shift.empty.status}
                nextSteps={EMPTY_STATE_COPY.shift.empty.nextSteps}
                helpTopicId="shift"
              />
            ) : null}
            <Section title="Volume Metrics">
              <div className="shift-summary__stat-grid">
                <StatTile label="Patients seen" value={summary.volume.patientsSeen} tone="blue" />
                <StatTile label="Discharged this shift" value={summary.volume.discharged} tone="green" />
                <StatTile label="Admitted this shift" value={summary.volume.admitted} tone="yellow" />
                <StatTile label="Currently active" value={summary.volume.active} tone="blue" />
                <StatTile label="Left without being seen" value={summary.volume.lwbs} tone={summary.volume.lwbs > 0 ? 'red' : 'neutral'} />
              </div>
            </Section>
            <Section title="Time Metrics" description="Averages are computed from patient arrival and timeline timestamps.">
              <div className="shift-summary__stat-grid shift-summary__stat-grid--four">
                <StatTile label="Avg door-to-triage" value={formatMinutes(summary.timeMetrics.avgDoorToTriageMinutes)} mono />
                <StatTile label="Avg door-to-provider" value={formatMinutes(summary.timeMetrics.avgDoorToProviderMinutes)} mono />
                <StatTile label="Avg length of stay" value={formatMinutes(summary.timeMetrics.avgLengthOfStayMinutes)} mono />
                <StatTile label="Longest wait this shift" value={formatMinutes(summary.timeMetrics.longestWaitMinutes)} mono tone="yellow" />
              </div>
            </Section>
            <Section
              title="Queue Performance"
              description={showSecondarySections ? 'Breaches use CTAS target minutes by patient priority.' : undefined}
            >
              <div className="shift-summary__table-wrap">
                <table className="shift-summary__table cd-data-table">
                  <thead>
                    <tr>
                      <th>Queue</th>
                      <th>Patients</th>
                      <th>Avg Wait</th>
                      <th>Max Wait</th>
                      <th>Breaches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.queues.length ? (
                      summary.queues.map((queue) => (
                        <tr key={queue.queue}>
                          <td>{queue.queue}</td>
                          <td>{queue.patients}</td>
                          <td className="shift-summary__mono">{formatMinutes(queue.avgWaitMinutes)}</td>
                          <td className="shift-summary__mono">{formatMinutes(queue.maxWaitMinutes)}</td>
                          <td className={queue.breaches > 0 ? 'shift-summary__breach' : undefined}>{queue.breaches}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5}>No active queues.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          </>
        ),
        analytics: showSecondarySections ? (
          <>
            <Section title="LWBS Safety Metrics" description="Computed from CTAS wait targets and LongWait/LWBSRisk flags.">
              <div className="shift-summary__stat-grid shift-summary__stat-grid--four">
                <StatTile label="Long wait events" value={summary.longWait.longWaitEvents} tone="yellow" />
                <StatTile label="LWBS risk events" value={summary.longWait.lwbsRiskEvents} tone={summary.longWait.lwbsRiskEvents > 0 ? 'red' : 'neutral'} />
                <StatTile label="Max wait this shift" value={formatMinutes(summary.longWait.maxWaitMinutes)} mono tone="yellow" />
                <StatTile
                  label="Patients exceeding CTAS target"
                  value={`${summary.longWait.exceedingTargetCount} (${summary.longWait.exceedingTargetPercent}%)`}
                  tone={summary.longWait.exceedingTargetCount > 0 ? 'red' : 'green'}
                />
              </div>
            </Section>
            <Section title="Capacity Events Timeline" description="Band changes are sourced from store capacity history.">
              <div className="shift-summary__capacity-layout">
                <div className="shift-summary__timeline">
                  {summary.capacity.events.length ? (
                    summary.capacity.events.map((event) => (
                      <article key={event.id}>
                        <time>{formatClock(event.time)}</time>
                        <span>
                          {event.fromBand} -&gt; {event.toBand}
                          {event.durationMinutes !== null ? ` (${event.durationMinutes} min)` : ''}
                        </span>
                      </article>
                    ))
                  ) : (
                    <p>No capacity band changes recorded yet this shift.</p>
                  )}
                </div>
                <CapacityBar totals={summary.capacity.totals} />
              </div>
            </Section>
            <Section title="Clinical Activity">
              <div className="shift-summary__clinical-grid">
                <article>
                  <span>P1 patients seen</span>
                  <strong>{summary.clinical.p1Seen}</strong>
                </article>
                <article>
                  <span>P2 patients seen</span>
                  <strong>{summary.clinical.p2Seen}</strong>
                </article>
                <article>
                  <span>Clinical scores run</span>
                  <strong>
                    {summary.clinical.scores.length
                      ? summary.clinical.scores.map((score) => `${score.type} ${score.count}`).join(' | ')
                      : 'None found'}
                  </strong>
                </article>
                <article>
                  <span>Protocols activated</span>
                  <strong>
                    STEMI {summary.clinical.protocols.stemi} | Sepsis {summary.clinical.protocols.sepsis} | Stroke {summary.clinical.protocols.stroke}
                  </strong>
                </article>
                <article>
                  <span>Referrals</span>
                  <strong>
                    Sent {summary.clinical.referrals.sent} | Accepted {summary.clinical.referrals.accepted} | Declined {summary.clinical.referrals.declined}
                  </strong>
                </article>
                <article>
                  <span>Reassessments</span>
                  <strong>
                    Flagged {summary.clinical.reassessments.flagged} | Completed {summary.clinical.reassessments.completed}
                  </strong>
                </article>
              </div>
            </Section>
            <Section title="EMS Summary">
              <div className="shift-summary__stat-grid shift-summary__stat-grid--four">
                <StatTile label="Units received" value={summary.ems.unitsReceived} tone="blue" />
                <StatTile label="Avg offload time" value={formatMinutes(summary.ems.avgOffloadMinutes)} mono />
                <StatTile label="Critical arrivals" value={summary.ems.criticalArrivals} tone={summary.ems.criticalArrivals > 0 ? 'red' : 'neutral'} />
                <StatTile
                  label={`EMS pressure peak at ${formatClock(summary.ems.pressurePeak.time)}`}
                  value={summary.ems.pressurePeak.score}
                  tone="yellow"
                  mono
                />
              </div>
            </Section>
          </>
        ) : null,
        history: (
          <>
            <section id="shift-handoff-generator" className="shift-summary__handoff-generator">
              <HandoffBriefGenerator />
            </section>
            {summary.limitations.length ? (
              <aside className="shift-summary__limitations cdl-surface cdl-surface--inactive" aria-label="Data limitations">
                <strong>Data fallbacks</strong>
                <ul>
                  {summary.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </>
        ),
      }}
    />
  );
}
