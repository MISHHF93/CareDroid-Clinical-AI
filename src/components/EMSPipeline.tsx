import React, { useEffect, useMemo, useRef, useState } from 'react';
import useProfileNavigate from '../hooks/useProfileNavigate';
import { Ambulance, Bed, CheckCircle2, Clock3 } from 'lucide-react';
import { useEmergencyStore } from '../store/emergencyStore';
import EMSPressureScore from './EMSPressureScore';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_ACTIONS, getReceptionEmbeddedIntakePath, prefersReceptionForPatientCreate } from '../config/emergencyRolePermissions';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import useEmsScreen from '../hooks/useEmsScreen';
import { useEMSIntake } from '../hooks/useEmergencyOs';
import { convertEmsArrivalForReception } from '../services/receptionIntakeBridge';
import { fetchEmsFleetSnapshot, fetchEmergencyDiversionStatus } from '../services/emergencyTransportApi';
import { postEmsHandoff } from '../services/emergencyOsApi';
import { reportEmsHandoffSyncFailure } from '../services/emsHandoffSyncFailure';
import EmsOffloadTrackerPanel from './ems/EmsOffloadTrackerPanel';
import EmsOffloadAttentionStrip from './ems/EmsOffloadAttentionStrip';
import EmsOperationalStrip from './ems/EmsOperationalStrip';
import { shouldShowEmsOperationalStrip } from './ems/emsWorkflowModel';
import AmbulanceHandoffChecklistPanel from './ems/AmbulanceHandoffChecklistPanel';
import AmbulanceHandoffChecklistBadge from './ems/AmbulanceHandoffChecklistBadge';
import PreArrivalNotificationForm from './ems/PreArrivalNotificationForm';
import PreArrivalForm from './ems/PreArrivalForm';
import ResourceActivationStrip from './ems/ResourceActivationStrip';
import HandoffClosePanel from './ems/HandoffClosePanel';
import { resolveAmbulanceHandoffChecklist } from '../services/ambulanceHandoffChecklist';
import { syncResourceActivationsForArrival } from '../services/resourceActivation';
import EdDataSourceBanner from './emergency/EdDataSourceBanner';
import { EmergencyRoutePage } from '../pages/emergency/emergencyRouteShared';
import { usePractitionerSurfaceVisibility } from '../contexts/PractitionerVisibilityContext';
import useEdRouteDataContext from '../hooks/useEdRouteDataContext';
import { buildPatientsPatientHref } from '../utils/receptionQueryParams';
import { EmsOffloadGauge, EmsUnitTrackGraphic } from './graphics/CdlGraphicKit';
import { EmsInteractiveAssistPanel } from './interactive-ai/EmsInteractiveAssistPanel';
import './EMSPipeline.css';

function minutesRemaining(arrival, now) {
  const target = new Date(arrival.estimatedArrivalTime).getTime();
  if (!Number.isFinite(target)) return arrival.eta ?? 0;
  return Math.ceil((target - now.getTime()) / 60000);
}

function minutesBetween(start, end) {
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return null;
  return Math.round((endMs - startMs) / 60000);
}

function offloadMinutes(arrival, now) {
  if (!arrival.arrivedAt) return null;
  return minutesBetween(arrival.arrivedAt, arrival.handoffCompletedAt || now.toISOString());
}

function etaTone(remainingMinutes, status) {
  if (status === 'Arrived' || status === 'Handoff' || remainingMinutes <= 0) return 'arrived';
  if (remainingMinutes < 5) return 'critical';
  if (remainingMinutes <= 10) return 'warning';
  return 'normal';
}

function formatEta(remainingMinutes, status) {
  if (status === 'Arrived' || status === 'Handoff' || remainingMinutes <= 0) return 'Arrived';
  return `${remainingMinutes} min`;
}

function formatFreshness(timestamp) {
  if (!timestamp) return 'latest local state';
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 'latest local state';
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - parsed) / 60000));
  if (elapsedMinutes < 1) return 'updated now';
  if (elapsedMinutes < 60) return `updated ${elapsedMinutes}m ago`;
  return `updated ${Math.round(elapsedMinutes / 60)}h ago`;
}

function sourceLabel(source) {
  if (!source) return 'local CareDroid state - no live EMS CAD integration';
  return /fixture|demo|fallback|scenario|first-customer/i.test(source)
    ? 'walkthrough/local dataset - no live EMS CAD integration'
    : source;
}

function vitalValue(vitals, ...keys) {
  for (const key of keys) {
    const value = vitals?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function vitalsStrip(vitals) {
  if (!vitals) return ['HR --', 'BP --/--', 'SpO2 --', 'GCS --'];
  const hr = vitalValue(vitals, 'hr', 'heartRate');
  const sbp = vitalValue(vitals, 'sbp', 'bpSystolic');
  const dbp = vitalValue(vitals, 'dbp', 'bpDiastolic');
  const spo2 = vitalValue(vitals, 'spo2', 'oxygenSaturation');
  const gcs = vitalValue(vitals, 'gcs');
  return [
    `HR ${hr ?? '--'}`,
    `BP ${sbp ?? '--'}/${dbp ?? '--'}`,
    `SpO2 ${spo2 ?? '--'}${spo2 === undefined ? '' : '%'}`,
    `GCS ${gcs ?? '--'}`,
  ];
}

function crewLabel(arrival) {
  return arrival.crewNames?.length ? arrival.crewNames.join(' / ') : 'Crew pending';
}

function unitLabel(arrival) {
  return arrival.unitName && arrival.unitName !== arrival.unitId
    ? `${arrival.unitName} · ${crewLabel(arrival)}`
    : crewLabel(arrival);
}

function roomName(rooms, roomId) {
  return rooms.find((room) => room.id === roomId)?.name || 'Bay pending';
}

function EMSArrivalRow({
  arrival,
  now,
  rooms,
  patients,
  onPrepareBay,
  onConvert,
  onCompleteHandoff,
  onOpenPatient,
  onUpdateHandoffChecklist,
  onUpdatePreArrivalNotification,
  onUpdateHandoffClose,
  offloadTargetMinutes,
  canPrepareBay,
  canConvert,
  canCompleteHandoff,
  showHandoffChecklistPanel = true,
  showEncounterConversion = true,
  showEtaDisplay = true,
  actorName,
}) {
  const [detailsOpen, setDetailsOpen] = useState(
    () => arrival.status === 'Arrived' || arrival.status === 'Handoff',
  );
  const remaining = minutesRemaining(arrival, now);
  const tone = etaTone(remaining, arrival.status);
  const isIncoming = arrival.status === 'Inbound' && remaining > 0;
  const offload = offloadMinutes(arrival, now);
  const offloadBreach = Number.isFinite(offload) && (offload as any) > offloadTargetMinutes;
  const linkedPatient = arrival.patientId
    ? patients.find((patient) => patient.id === arrival.patientId)
    : null;
  const handoffChecklist = resolveAmbulanceHandoffChecklist(arrival, {
    patient: linkedPatient,
    rooms,
  });
  const showHandoffChecklist =
    showHandoffChecklistPanel &&
    (!isIncoming ||
      arrival.status === 'Arrived' ||
      arrival.status === 'Handoff' ||
      Boolean(arrival.patientId));
  const hasExpandableDetails =
    isIncoming ||
    arrival.status === 'Inbound' ||
    showHandoffChecklist;
  const showDetails = detailsOpen;

  return (
    <article className={`ems-pipeline__row ems-pipeline__row--${tone} ems-pipeline__row--graphic`}>
      <div className="ems-pipeline__unit">
        <EmsUnitTrackGraphic
          status={arrival.status}
          unitId={arrival.unitId}
          breach={offloadBreach}
          className="ems-pipeline__unit-track"
        />
        <strong>{arrival.unitId}</strong>
        <span>{unitLabel(arrival)}</span>
      </div>

      <div className="ems-pipeline__complaint">
        <div className="ems-pipeline__complaint-title">
          <strong>{arrival.chiefComplaint}</strong>
          <span
            className={`ems-pipeline__severity ems-pipeline__severity--${arrival.severity.toLowerCase()}`}
          >
            {arrival.severity}
          </span>
          {showHandoffChecklist ? (
            <AmbulanceHandoffChecklistBadge
              arrival={arrival}
              patient={linkedPatient}
              rooms={rooms}
              compact
            />
          ) : null}
        </div>
        <span>{arrival.mechanismOfInjury || arrival.notes}</span>
      </div>

      <time
        className={`ems-pipeline__eta ems-pipeline__eta--${tone}`}
        dateTime={arrival.estimatedArrivalTime}
      >
        {showEtaDisplay ? (
          <>
            <Clock3 size={14} aria-hidden />
            {formatEta(remaining, arrival.status)}
          </>
        ) : (
          <span aria-hidden>—</span>
        )}
      </time>

      <div className="ems-pipeline__vitals" aria-label="EMS vitals">
        {vitalsStrip(arrival.vitals).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      <div className="ems-pipeline__actions">
        {Number.isFinite(offload) ? (
          <span
            className={`ems-pipeline__offload${offloadBreach ? ' ems-pipeline__offload--breach' : ''}`}
          >
            Offload {offload}m
          </span>
        ) : null}
        {arrival.preparedRoomId ? (
          <span className="ems-pipeline__prepared">
            <Bed size={13} aria-hidden />
            {roomName(rooms, arrival.preparedRoomId)}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onPrepareBay(arrival.id)}
            disabled={!isIncoming || !canPrepareBay}
            title={
              !canPrepareBay
                ? 'Prepare Bay unavailable for this role'
                : !isIncoming
                  ? 'Bay preparation is only available for inbound units'
                  : 'Prepare a bay for this EMS unit'
            }
          >
            Prepare Bay
          </button>
        )}
        {!isIncoming && !arrival.patientId && showEncounterConversion ? (
          <button
            type="button"
            className="ems-pipeline__handoff"
            onClick={() => onConvert(arrival.id)}
            disabled={!canConvert}
            title={
              canConvert
                ? 'Convert this arrived EMS unit to a whiteboard patient'
                : 'Add to Whiteboard unavailable for this role'
            }
          >
            <CheckCircle2 size={14} aria-hidden />
            Add to Whiteboard
          </button>
        ) : null}
        {arrival.patientId && !arrival.handoffCompletedAt ? (
          <button
            type="button"
            className="ems-pipeline__handoff"
            data-testid="ems-handoff-complete"
            data-arrival-id={arrival.id}
            onClick={() => onCompleteHandoff(arrival.id)}
            disabled={!canCompleteHandoff}
            title={
              canCompleteHandoff
                ? 'Mark this EMS handoff complete'
                : 'Handoff completion unavailable for this role'
            }
          >
            Handoff complete
          </button>
        ) : null}
        {arrival.patientId ? (
          <button
            type="button"
            className="ems-pipeline__handoff"
            onClick={() => onOpenPatient(arrival.patientId)}
            title="Open this EMS patient without searching"
          >
            Open Patient
          </button>
        ) : null}
        {arrival.patientId && arrival.handoffCompletedAt ? (
          <span className="ems-pipeline__prepared">Handoff complete</span>
        ) : null}
        {hasExpandableDetails ? (
          <button
            type="button"
            className="ems-pipeline__details-toggle"
            {...((showDetails) ? { 'aria-expanded': 'true' as const } : { 'aria-expanded': 'false' as const })}
            onClick={() => setDetailsOpen((open) => !open)}
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        ) : null}
      </div>

      {showDetails && (isIncoming || arrival.status === 'Inbound') ? (
        <div className="ems-pipeline__row-details">
          <ResourceActivationStrip arrival={arrival} patient={linkedPatient} />
          <PreArrivalNotificationForm
            notification={arrival.preArrivalNotification}
            actorName={actorName}
            canEdit={canCompleteHandoff}
            onUpdate={(notification) => onUpdatePreArrivalNotification?.(arrival.id, notification)}
          />
        </div>
      ) : null}

      {showDetails && showHandoffChecklist ? (
        <div className="ems-pipeline__row-details">
          <AmbulanceHandoffChecklistPanel
            arrival={arrival}
            patient={linkedPatient}
            rooms={rooms}
            actorName={actorName}
            canEdit={canCompleteHandoff}
            onUpdate={onUpdateHandoffChecklist}
          />
          <HandoffClosePanel
            arrival={arrival}
            checklist={handoffChecklist}
            handoffClose={arrival.handoffClose}
            actorName={actorName}
            canEdit={canCompleteHandoff}
            onUpdate={(record) => onUpdateHandoffClose?.(arrival.id, record)}
          />
        </div>
      ) : null}
    </article>
  );
}

export default function EMSPipeline() {
  const surfaces = usePractitionerSurfaceVisibility();
  const { backendAvailable, activeScenarioId } = useEdRouteDataContext();
  const { profileNavigate } = useProfileNavigate();
  const emergencyRole = useEmergencyRolePermissions();
  const ems = useEmsScreen();
  const emsModule = useEMSIntake();
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const rooms = useEmergencyStore((state) => state.rooms);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const prepareEMSBay = useEmergencyStore((state) => state.prepareEMSBay);
  const updateEMSArrival = useEmergencyStore((state) => state.updateEMSArrival);
  const addEMSArrival = useEmergencyStore((state) => state.addEMSArrival);
  const updateAmbulanceHandoffChecklist = useEmergencyStore(
    (state) => state.updateAmbulanceHandoffChecklist,
  );
  const [now, setNow] = useState(() => new Date());
  const [fleetSnapshot, setFleetSnapshot] = useState<any>({ status: 'loading', units: [], message: '' });
  const [diversionStatus, setDiversionStatus] = useState<any>({ status: 'idle', data: null, message: '' });
  const incomingSectionRef = useRef<any>(null);
  const receivingSectionRef = useRef<any>(null);
  const offloadSectionRef = useRef<any>(null);
  const prepareBayPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.prepareEmsBay);
  const convertPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.convertEmsArrival);
  const canPrepareBay =
    prepareBayPresentation.visible &&
    prepareBayPresentation.enabled &&
    (!ems.isEmsScreen || ems.canPrepareEmsBay);
  const canConvert =
    convertPresentation.visible &&
    convertPresentation.enabled &&
    (!ems.isEmsScreen || ems.canConvertArrival);
  const handoffPresentation = emergencyRole.presentAction(EMERGENCY_ROLE_ACTIONS.completeEmsHandoff);
  const canCompleteHandoff =
    handoffPresentation.visible &&
    handoffPresentation.enabled &&
    (!ems.isEmsScreen || ems.canCompleteHandoff);
  const showInboundSection = !ems.isEmsScreen || ems.showInboundAmbulances;
  const showReceivingSection = !ems.isEmsScreen || ems.showReceivingArea;
  const showOffloadSection = !ems.isEmsScreen || ems.showOffloadTimers;
  const showPressureWidget = !ems.isEmsScreen || ems.showEmsPressure;
  const showHandoffChecklistWidget = !ems.isEmsScreen || ems.showHandoffChecklist;
  const showEncounterConversionWidget = !ems.isEmsScreen || ems.showEncounterConversion;
  const showEtaWidget = !ems.isEmsScreen || ems.showEtaDisplay;
  const preArrivalStore = useMemo(
    () => ({
      addEMSArrival,
    }),
    [addEMSArrival],
  );
  const canSubmitPreArrival = canCompleteHandoff || canConvert || canPrepareBay;
  const showOperationalStrip = useMemo(
    () =>
      (!ems.isEmsScreen || ems.showOperationalStrip) &&
      shouldShowEmsOperationalStrip({
        screenMode: ems.screenMode,
        roleId: emergencyRole.role,
      }),
    [ems.isEmsScreen, ems.screenMode, ems.showOperationalStrip, emergencyRole.role],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchEmsFleetSnapshot()
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setFleetSnapshot({
            status: 'ready',
            units: result.data?.units || [],
            message: [
              result.data?.sourceLabel || 'Live EMS feed connected.',
              formatFreshness(result.data?.generatedAt),
            ].join(' '),
          });
        } else {
          setFleetSnapshot({
            status: 'error',
            units: [],
            message: 'EMS unit feed is unavailable. Use active inbound units below for coordination.',
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setFleetSnapshot({
          status: 'error',
          units: [],
          message: 'EMS unit feed is unavailable. Use active inbound units below for coordination.',
        });
      });
    fetchEmergencyDiversionStatus()
      .then((result) => {
        if (cancelled) return;
        setDiversionStatus({
          status: result.ok ? 'ready' : 'unavailable',
          data: result.data,
          message: result.message || '',
        });
      })
      .catch(() => {
        if (cancelled) return;
        setDiversionStatus({
          status: 'unavailable',
          data: null,
          message: 'Diversion status feed is unavailable. Confirm diversion status with charge leadership.',
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeArrivals = useMemo(
    () => emsArrivals.filter((arrival) => !['Complete', 'Cancelled'].includes(arrival.status)),
    [emsArrivals]
  );

  useEffect(() => {
    activeArrivals.forEach((arrival) => {
      if (arrival.status !== 'Inbound') return;
      if (minutesRemaining(arrival, now) <= 0) {
        if (!canConvert) return;
        convertEmsArrivalForReception(arrival.id, { actorName: emergencyRole.roleLabel });
      }
    });
  }, [activeArrivals, canConvert, emergencyRole.roleLabel, now]);

  const handleConvertEmsArrival = (arrivalId) => {
    const result = convertEmsArrivalForReception(arrivalId, { actorName: emergencyRole.roleLabel });
    if (!result.ok) return;
    if (prefersReceptionForPatientCreate(emergencyRole.role)) {
      profileNavigate(
        result.data.receptionVerifyPath ||
          getReceptionEmbeddedIntakePath({
            step: 'verify',
            patientId: result.data.patientId,
            emsArrivalId: result.data.emsArrivalId,
          }),
      );
    }
  };

  const incoming = activeArrivals
    .filter((arrival) => arrival.status === 'Inbound' && minutesRemaining(arrival, now) > 0)
    .sort((a, b) => minutesRemaining(a, now) - minutesRemaining(b, now));
  const awaitingHandoff = activeArrivals
    .filter(
      (arrival) =>
        arrival.status === 'Arrived' || arrival.status === 'Handoff' || minutesRemaining(arrival, now) <= 0
    )
    .sort((a, b) => minutesRemaining(a, now) - minutesRemaining(b, now));
  const offloadSamples = emsArrivals
    .map((arrival) => offloadMinutes(arrival, now))
    .filter(Number.isFinite);
  const avgOffload = offloadSamples.length
    ? Math.round((offloadSamples as any[]).reduce((sum, minutes) => sum + minutes, 0) / offloadSamples.length)
    : 0;
  const offloadTargetMinutes =
    Number(
      emergencySettings?.thresholds?.emsOffloadTargetMinutes ??
        emergencySettings?.emsThresholds?.offloadTargetMinutes ??
        15
    ) || 15;
  const offloadBreachCount = offloadSamples.filter((minutes) => (minutes as any) > offloadTargetMinutes).length;
  const emsSource = sourceLabel(emsModule.data?.source);
  const emsFreshness = formatFreshness(emsModule.data?.generatedAt);
  const completeHandoff = (arrivalId) => {
    const timestamp = new Date().toISOString();
    const arrival = emsArrivals.find((entry) => entry.id === arrivalId);
    const handoffStartedAt = arrival?.handoffStartedAt || arrival?.arrivedAt || timestamp;
    // Optimistic local update keeps offline/demo path working; server persist is best-effort.
    updateAmbulanceHandoffChecklist(
      arrivalId,
      { handoffAccepted: true, handoffAcceptedAt: timestamp },
      { staffName: emergencyRole.roleLabel },
    );
    updateEMSArrival(arrivalId, {
      status: 'Complete',
      handoffCompletedAt: timestamp,
      handoffStartedAt,
    });
    void postEmsHandoff({
      arrivalId,
      patientId: arrival?.patientId,
      actorName: emergencyRole.roleLabel,
      unitId: arrival?.unitId,
      unitName: arrival?.unitName,
      chiefComplaint: arrival?.chiefComplaint,
      handoffAcceptedAt: timestamp,
      handoffStartedAt,
      arrivedAt: arrival?.arrivedAt,
      checklist: { handoffAccepted: true, handoffAcceptedAt: timestamp },
    }).catch((error) => {
      reportEmsHandoffSyncFailure({
        arrivalId,
        patientId: arrival?.patientId,
        unitName: arrival?.unitName,
        error,
      });
    });
  };
  const handleHandoffChecklistUpdate = (arrivalId, patch, actor) => {
    updateAmbulanceHandoffChecklist(arrivalId, patch, actor);
  };
  const handlePreArrivalNotificationUpdate = (arrivalId, notification) => {
    const arrival = emsArrivals.find((entry) => entry.id === arrivalId);
    if (!arrival) return;
    const linkedPatient = arrival.patientId
      ? patients.find((patient) => patient.id === arrival.patientId)
      : null;
    const synced = syncResourceActivationsForArrival(
      { ...arrival, preArrivalNotification: notification },
      linkedPatient,
    );
    updateEMSArrival(arrivalId, {
      preArrivalNotification: notification,
      resourceActivations: synced.resourceActivations,
    });
  };
  const handleHandoffCloseUpdate = (arrivalId, handoffClose) => {
    updateEMSArrival(arrivalId, { handoffClose });
  };
  const openPatient = (patientId) => {
    if (!patientId) return;
    selectPatient(patientId);
    profileNavigate(buildPatientsPatientHref(patientId));
  };

  const handleEmsStripMetricSelect = (metric) => {
    if (metric.whiteboardAction === 'focus-inbound' && incomingSectionRef.current) {
      incomingSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (metric.whiteboardAction === 'focus-receiving-area' && receivingSectionRef.current) {
      receivingSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (metric.whiteboardAction === 'open-offload-tracker' && offloadSectionRef.current) {
      offloadSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const headerActions = (
    <>
      {showOffloadSection ? (
        <EmsOffloadGauge
          minutes={avgOffload}
          targetMinutes={offloadTargetMinutes}
          breachCount={offloadBreachCount}
        />
      ) : null}
      {showPressureWidget ? <EMSPressureScore /> : null}
    </>
  );

  return (
    <EmergencyRoutePage
      eyebrow="Flow coordination"
      title="EMS Coordination"
      maturity="demo"
      description={`Inbound units, bay prep, handoff timing, and diversion awareness. Source: ${emsSource}; ${emsFreshness}.`}
      actions={headerActions}
    >
      <div className="ems-pipeline" data-testid="ems-pipeline">
      <EdDataSourceBanner
        envelope={emsModule.data}
        loading={emsModule.loading}
        error={emsModule.error}
        activeScenarioId={activeScenarioId}
        backendAvailable={backendAvailable}
        compact
        className="ems-pipeline__data-source"
      />

      {showOperationalStrip ? (
        <EmsOperationalStrip
          emsArrivals={emsArrivals}
          patients={patients}
          staff={staff}
          rooms={rooms}
          offloadTargetMinutes={offloadTargetMinutes}
          visibleSurfaces={(ems.isEmsScreen ? ems.visibleOperationalSurfaces : null) as any}
          onMetricSelect={handleEmsStripMetricSelect}
        />
      ) : null}

      <div className="ems-pipeline__interactive-ai">
        <EmsInteractiveAssistPanel
          role={emergencyRole.role || 'paramedic'}
          userId={emergencyRole.canonicalProfile?.id}
          organizationId={emergencyRole.canonicalProfile?.organizationId}
          patientId={
            emsArrivals.find((a) => a.status === 'Inbound' || a.status === 'Arrived' || a.status === 'Handoff')
              ?.patientId
          }
          emsUnitId={
            emsArrivals.find((a) => a.status === 'Inbound' || a.status === 'Arrived' || a.status === 'Handoff')
              ?.unitId ||
            emsArrivals.find((a) => a.status === 'Inbound' || a.status === 'Arrived' || a.status === 'Handoff')
              ?.unitName
          }
        />
      </div>

      {emsModule.loading && !emsArrivals.length ? (
        <p className="ems-pipeline__empty" role="status">Loading CareDroid EMS intake...</p>
      ) : null}
      {emsModule.error ? (
        <p className="ems-pipeline__empty" role="alert">
          {emsModule.error}. Showing the last local EMS state.
        </p>
      ) : null}

      {showOffloadSection ? (
        <>
          <EmsOffloadAttentionStrip
            emsArrivals={emsArrivals}
            patients={patients}
            staff={staff}
            rooms={rooms}
            offloadTargetMinutes={offloadTargetMinutes}
            onSelectPatient={openPatient}
            onSelectArrival={(arrivalId, patientId) => {
              if (patientId) {
                openPatient(patientId);
                return;
              }
              const arrival = emsArrivals.find((entry) => entry.id === arrivalId);
              if (arrival?.patientId) openPatient(arrival.patientId);
            }}
            onOpenTracker={() => {
              if (offloadSectionRef.current) {
                offloadSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="ems-pipeline__offload-attention"
          />
          {surfaces.ems.showOffloadTrackerPanel ? (
            <div ref={offloadSectionRef}>
              <EmsOffloadTrackerPanel
                emsArrivals={emsArrivals}
                patients={patients}
                staff={staff}
                rooms={rooms}
                offloadTargetMinutes={offloadTargetMinutes}
                onSelectPatient={openPatient}
                onSelectArrival={(arrivalId, patientId) => {
                  if (patientId) {
                    openPatient(patientId);
                    return;
                  }
                  const arrival = emsArrivals.find((entry) => entry.id === arrivalId);
                  if (arrival?.patientId) openPatient(arrival.patientId);
                }}
              />
            </div>
          ) : (
            <div ref={offloadSectionRef} className="ems-pipeline__offload-anchor" aria-hidden />
          )}
        </>
      ) : null}

      <div className="ems-pipeline__sections">
        {showInboundSection ? (
          <>
            <section className="ems-pipeline__section">
              <div className="ems-pipeline__section-heading">
                <Ambulance size={17} aria-hidden />
                <h2>EMS Unit Visibility</h2>
                <span>{fleetSnapshot.units.length}</span>
              </div>
              <p className="ems-pipeline__source">
                {fleetSnapshot.message || 'Live EMS feed status is pending.'}
              </p>
              {diversionStatus.status === 'ready' && diversionStatus.data ? (
                <div className="ems-pipeline__diversion">
                  <strong>Diversion Status</strong>
                  <span role="status" aria-label="Diversion status">
                    {diversionStatus.data.active ? 'Active diversion' : 'No diversion'}
                  </span>
                </div>
              ) : null}
              {surfaces.ems.showFleetUnitGrid ? (
                <div className="ems-pipeline__unit-grid">
                  {fleetSnapshot.status === 'loading' ? (
                    <p className="ems-pipeline__empty" role="status">Loading department data...</p>
                  ) : fleetSnapshot.status === 'error' ? (
                    <p className="ems-pipeline__empty" role="alert">
                      {fleetSnapshot.message || 'EMS unit feed is unavailable. Use active inbound units below for coordination.'}
                    </p>
                  ) : fleetSnapshot.units.length ? (
                    fleetSnapshot.units.slice(0, 6).map((unit) => (
                      <article key={unit.id}>
                        <strong>{unit.callSign}</strong>
                        <span>{unit.status}</span>
                        <small>{unit.lastKnownLocation}</small>
                      </article>
                    ))
                  ) : (
                    <p className="ems-pipeline__empty">No EMS units returned by the current source. Confirm the live EMS/CAD feed before director demo claims.</p>
                  )}
                </div>
              ) : (
                <p className="ems-pipeline__source ems-pipeline__source--compact" role="note">
                  Fleet telemetry hidden during pilot review. Use incoming and awaiting-handoff rows below.
                </p>
              )}
            </section>

            <section className="ems-pipeline__section" ref={incomingSectionRef}>
              <PreArrivalForm
                store={preArrivalStore}
                canSubmit={canSubmitPreArrival}
                actorName={emergencyRole.roleLabel}
                notificationSource="ems-crew"
                onSubmitted={(result) => {
                  if (result?.patient?.id) {
                    openPatient(result.patient.id);
                  }
                }}
                className="ems-pipeline__pre-arrival-form"
              />
              <div className="ems-pipeline__section-heading">
                <Ambulance size={17} aria-hidden />
                <h2>Incoming</h2>
                <span>{incoming.length}</span>
              </div>
              <div className="ems-pipeline__list">
                {incoming.length ? (
                  incoming.map((arrival) => (
                    <EMSArrivalRow
                      key={arrival.id}
                      arrival={arrival}
                      now={now}
                      rooms={rooms}
                      patients={patients}
                      onPrepareBay={prepareEMSBay}
                      onConvert={handleConvertEmsArrival}
                      onCompleteHandoff={completeHandoff}
                      onOpenPatient={openPatient}
                      onUpdateHandoffChecklist={handleHandoffChecklistUpdate}
                      onUpdatePreArrivalNotification={handlePreArrivalNotificationUpdate}
                      onUpdateHandoffClose={handleHandoffCloseUpdate}
                      offloadTargetMinutes={offloadTargetMinutes}
                      canPrepareBay={canPrepareBay}
                      canConvert={canConvert}
                      canCompleteHandoff={canCompleteHandoff}
                      showHandoffChecklistPanel={showHandoffChecklistWidget}
                      showEncounterConversion={showEncounterConversionWidget}
                      showEtaDisplay={showEtaWidget}
                      actorName={emergencyRole.roleLabel}
                    />
                  ))
                ) : (
                  <p className="ems-pipeline__empty">No inbound EMS units in the active CareDroid state.</p>
                )}
              </div>
            </section>
          </>
        ) : null}

        {showReceivingSection ? (
          <section className="ems-pipeline__section" ref={receivingSectionRef}>
            <div className="ems-pipeline__section-heading">
              <Bed size={17} aria-hidden />
              <h2>Awaiting Handoff</h2>
              <span>{awaitingHandoff.length}</span>
            </div>
            <div className="ems-pipeline__list">
              {awaitingHandoff.length ? (
                awaitingHandoff.map((arrival) => (
                  <EMSArrivalRow
                    key={arrival.id}
                    arrival={arrival}
                    now={now}
                    rooms={rooms}
                    patients={patients}
                    onPrepareBay={prepareEMSBay}
                    onConvert={handleConvertEmsArrival}
                    onCompleteHandoff={completeHandoff}
                    onOpenPatient={openPatient}
                    onUpdateHandoffChecklist={handleHandoffChecklistUpdate}
                    onUpdatePreArrivalNotification={handlePreArrivalNotificationUpdate}
                    onUpdateHandoffClose={handleHandoffCloseUpdate}
                    offloadTargetMinutes={offloadTargetMinutes}
                    canPrepareBay={canPrepareBay}
                    canConvert={canConvert}
                    canCompleteHandoff={canCompleteHandoff}
                    showHandoffChecklistPanel={showHandoffChecklistWidget}
                    showEncounterConversion={showEncounterConversionWidget}
                    showEtaDisplay={showEtaWidget}
                    actorName={emergencyRole.roleLabel}
                  />
                ))
              ) : (
                <p className="ems-pipeline__empty">No crews waiting for handoff.</p>
              )}
            </div>
          </section>
        ) : null}
      </div>
      </div>
    </EmergencyRoutePage>
  );
}
