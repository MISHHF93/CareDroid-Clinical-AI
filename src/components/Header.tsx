import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useEmergencyStore } from '../store/emergencyStore';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  EMERGENCY_ACTIONS,
  EMERGENCY_ROLE_IDS,
  getReceptionEmbeddedIntakePath,
  getReceptionQuickCreatePath,
  prefersReceptionForPatientCreate,
  prefersReceptionForPatientSearch,
} from '../config/emergencyRolePermissions';
import { getCentralControlPolicy } from '../config/centralControl.config';
import { PILOT_CUSTOMER_MODE } from '../config/unified-navigation.config';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import useEffectiveUserProfile from '../hooks/useEffectiveUserProfile';
import { navigateProfileAware } from '../navigation/profileRouteLaunch';
import useHeaderOperationalMetrics from '../hooks/useHeaderOperationalMetrics';
import useScreenModeCapabilities from '../hooks/useScreenModeCapabilities';
import { rankPatientsBySearch } from '../utils/patientSearch';
import { searchPatientsFromBackend } from '../services/patientManagementApi';
import PatientSearchResults, {
  PATIENT_SEARCH_LISTBOX_ID,
  patientSearchOptionId,
} from './PatientSearchResults';
import {
  buildEncounterSearchPath,
  buildEmsCasePath,
  buildQueueItemPath,
  buildReferralSearchPath,
  buildReceptionSearchFilterPath,
  buildViewEncounterPath,
  createEncounterForPatient,
} from '../services/patientSearchActions';
import {
  groupOperationalSearchHits,
  searchOperationalEntities,
  type OperationalSearchHit,
} from '../services/unifiedOperationalSearch';
import UserAccountMenu from './account/UserAccountMenu';
import OperationalAlertRail from './emergency/OperationalAlertRail';
import OperationsCenterMenu from './chrome/OperationsCenterMenu';
import ThemeToggle from './chrome/ThemeToggle';
import { isPilotStationKpiPolicyActive } from '../config/stationKpiPolicy';
import './Header.css';

const MAX_HEADER_PATIENT_RESULTS = 5;

function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return <span className="caredroid-header__clock">{now.toLocaleTimeString()}</span>;
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const emergencyRole = useEmergencyRolePermissions();
  const { saasRole } = useEffectiveUserProfile();
  const screenCapabilities = useScreenModeCapabilities();
  const patientLookupInputRef = useRef<HTMLInputElement>(null);
  const isReceptionRoute = location.pathname === CANONICAL_ROUTES.emergencyReception;
  // useHeaderOperationalMetrics derives exactly these seven values, and the
  // header had its own character-for-character copy of the whole derivation --
  // formatter, websocket subscription, sync pulse effect and label/title
  // strings. Two copies of the same operational-status logic drift; this is
  // the shared one. `screenMode` is aliased so every downstream reference
  // below reads the same as before.
  const {
    centralSnapshot,
    intelligenceSnapshot,
    syncLabel,
    syncTitle,
    syncStale,
    syncPulse,
    screenMode: routeScreenMode,
  } = useHeaderOperationalMetrics();

  const patients = useEmergencyStore((store) => store.patients);
  const referrals = useEmergencyStore((store) => store.referrals);
  const emsArrivals = useEmergencyStore((store) => store.emsArrivals);
  const queues = useEmergencyStore((store) => store.queues);
  const selectPatient = useEmergencyStore((store) => store.selectPatient);
  const centralControlSettings = useEmergencyStore(
    (store) => store.emergencySettings.centralControl,
  );
  const [patientLookupQuery, setPatientLookupQuery] = useState('');
  const [patientLookupOpen, setPatientLookupOpen] = useState(false);
  const [lookupActiveIndex, setLookupActiveIndex] = useState(-1);
  const lookupWrapperRef = useRef<HTMLDivElement>(null);
  const [lookupPanelPosition, setLookupPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [backendVerifiedPatientIds, setBackendVerifiedPatientIds] = useState<Set<string>>(
    () => new Set(),
  );
  const createPatientAction = emergencyRole.presentAction(EMERGENCY_ACTIONS.createPatient);
  const canCreatePatient = createPatientAction.enabled;
  const canOpenPatients = emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyPatients);
  const centralControl = useMemo(
    () =>
      getCentralControlPolicy({
        role: emergencyRole.role,
        can: emergencyRole.can,
        settings: centralControlSettings,
      }),
    [centralControlSettings, emergencyRole],
  );
  // Previously also allowed any non-read-only role to see "New Patient" whenever
  // central control governance was on (`centralControl.enabled && !emergencyRole.readOnly`)
  // -- centralControl.enabled is an org-wide toggle unrelated to the CURRENT role's
  // own granted actions, so this fallback enabled the button (and its click handler
  // navigated straight into the real SmartIntake creation flow, not a lighter
  // "submit for review" pathway) for any role lacking EMERGENCY_ACTIONS.createPatient
  // but also lacking an explicit readOnly:true flag -- confirmed reachable for
  // ed_manager today, and would have newly affected it_admin once its own missing
  // ROLE_ALIASES self-entry (see normalizeEmergencyRole) was fixed. The role's own
  // declared createPatient action is the single source of truth used everywhere
  // else in this permission system; rely on that alone here too.
  const canSubmitCentralIntake = canCreatePatient;

  const patientLookupResults = useMemo(
    () =>
      // Gated at the source, not just at render: the Enter-key shortcut below
      // acts on patientLookupResults[0] directly, so filtering only inside
      // PatientSearchResults' render would still let a role with no patient
      // access navigate straight to a matching patient via the keyboard.
      canOpenPatients
        ? rankPatientsBySearch(patients, patientLookupQuery, MAX_HEADER_PATIENT_RESULTS).map(
            (result) => result,
          )
        : [],
    [canOpenPatients, patientLookupQuery, patients],
  );

  const operationalSearchGroups = useMemo(() => {
    // HEAL-206: encounter/referral/EMS/queue hits embed patient name, MRN,
    // and chief complaint (unifiedOperationalSearch.ts) -- the same PHI
    // class HEAL-203 gated for the "Patients" section, but this section was
    // still being computed and rendered unconditionally.
    if (!canOpenPatients) {
      return { patient: [], encounter: [], referral: [], ems: [], queue: [] };
    }
    return groupOperationalSearchHits(
      searchOperationalEntities({
        query: patientLookupQuery,
        patients,
        referrals,
        emsArrivals,
        queues,
      }),
    );
  }, [canOpenPatients, emsArrivals, patientLookupQuery, patients, queues, referrals]);

  const firstOperationalHit = useMemo(() => {
    const ordered = [
      ...operationalSearchGroups.encounter,
      ...operationalSearchGroups.referral,
      ...operationalSearchGroups.ems,
      ...operationalSearchGroups.queue,
    ];
    return ordered[0] || null;
  }, [operationalSearchGroups]);

  const navigateEmergencyRoute = useCallback(
    (path: string) => {
      navigateProfileAware(navigate, path, { emergencyRole, saasRole });
    },
    [emergencyRole, navigate, saasRole],
  );

  const openSmartIntakeFromSearch = (options: { step?: string; patientId?: string } = {}) => {
    if (!canCreatePatient) return;
    if (isReceptionRoute) {
      document.dispatchEvent(
        new CustomEvent('open-reception-smart-intake', { detail: options }),
      );
      setPatientLookupOpen(false);
      return;
    }
    navigateEmergencyRoute(
      getReceptionEmbeddedIntakePath({
        step: options.step,
        patientId: options.patientId,
      }),
    );
    setPatientLookupOpen(false);
  };

  const openCentralIntake = () => {
    if (!canSubmitCentralIntake) return;
    if (
      isReceptionRoute ||
      prefersReceptionForPatientCreate(emergencyRole.role, screenCapabilities.screenMode)
    ) {
      if (isReceptionRoute) {
        document.dispatchEvent(new Event('open-reception-intake'));
        return;
      }
      navigateEmergencyRoute(getReceptionQuickCreatePath());
      return;
    }
    navigateEmergencyRoute(CANONICAL_ROUTES.emergencyWhiteboard);
    window.setTimeout(() => document.dispatchEvent(new Event('open-intake')), 0);
  };

  const openPatientLookupRoute = () => {
    const query = patientLookupQuery.trim();
    if (!canOpenPatients && !isReceptionRoute) return;
    if (
      isReceptionRoute ||
      prefersReceptionForPatientSearch(emergencyRole.role, screenCapabilities.screenMode)
    ) {
      const nextParams = new URLSearchParams(searchParams);
      if (query) nextParams.set('q', query);
      else nextParams.delete('q');
      setSearchParams(nextParams, { replace: true });
      setPatientLookupOpen(false);
      return;
    }
    if (emergencyRole.role === EMERGENCY_ROLE_IDS.registrationClerk) {
      navigateEmergencyRoute(
        query
          ? `${CANONICAL_ROUTES.emergencyReception}?q=${encodeURIComponent(query)}`
          : CANONICAL_ROUTES.emergencyReception,
      );
      setPatientLookupOpen(false);
      return;
    }
    navigateEmergencyRoute(
      query
        ? `${CANONICAL_ROUTES.emergencyPatients}?q=${encodeURIComponent(query)}`
        : CANONICAL_ROUTES.emergencyPatients,
    );
    setPatientLookupOpen(false);
  };

  const selectLookupPatient = (patientId: string) => {
    selectPatient(patientId);
    if (prefersReceptionForPatientSearch(emergencyRole.role, screenCapabilities.screenMode)) {
      navigateEmergencyRoute(
        `${CANONICAL_ROUTES.emergencyReception}?patientId=${encodeURIComponent(patientId)}`,
      );
      setPatientLookupQuery('');
      setPatientLookupOpen(false);
      return;
    }
    navigateEmergencyRoute(
      `${CANONICAL_ROUTES.emergencyPatients}?patientId=${encodeURIComponent(patientId)}`,
    );
    setPatientLookupQuery('');
    setPatientLookupOpen(false);
  };

  const handleSearchViewEncounter = (patientId: string, encounterId: string | null) => {
    selectPatient(patientId);
    navigateEmergencyRoute(buildViewEncounterPath(patientId, encounterId));
    setPatientLookupOpen(false);
  };

  const handleSearchCreateEncounter = (patientId: string) => {
    const handoff = createEncounterForPatient(useEmergencyStore.getState(), patientId);
    handleSearchViewEncounter(patientId, handoff.encounterId);
  };

  const handleSearchFilterQueues = (query: string) => {
    navigateEmergencyRoute(buildReceptionSearchFilterPath(query));
    setPatientLookupOpen(false);
  };

  const handleOpenOperationalHit = useCallback(
    (hit: OperationalSearchHit) => {
      if (hit.patientId) selectPatient(hit.patientId);

      if (hit.entityType === 'encounter' && hit.patientId) {
        navigateEmergencyRoute(buildEncounterSearchPath(hit.patientId, hit.encounterId));
      } else if (hit.entityType === 'referral' && hit.referralId) {
        navigateEmergencyRoute(buildReferralSearchPath(hit.referralId, hit.patientId));
      } else if (hit.entityType === 'ems' && hit.emsArrivalId) {
        navigateEmergencyRoute(buildEmsCasePath(hit.emsArrivalId));
      } else if (hit.entityType === 'queue') {
        navigateEmergencyRoute(buildQueueItemPath(hit.queueType || 'Waiting', hit.patientId));
      } else if (hit.entityType === 'patient' && hit.patientId) {
        selectLookupPatient(hit.patientId);
        return;
      }

      setPatientLookupQuery('');
      setPatientLookupOpen(false);
    },
    [navigateEmergencyRoute, selectLookupPatient, selectPatient],
  );

  const syncPatientLookupQuery = (value: string) => {
    setPatientLookupQuery(value);
    if (!isReceptionRoute) return;
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) nextParams.set('q', value.trim());
    else nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    if (!isReceptionRoute) return;
    const urlQuery = searchParams.get('q') || '';
    setPatientLookupQuery(urlQuery);
  }, [isReceptionRoute, searchParams]);

  useEffect(() => {
    if (!isReceptionRoute) {
      setBackendVerifiedPatientIds(new Set());
      return;
    }
    const query = patientLookupQuery.trim();
    if (query.length < 2) {
      setBackendVerifiedPatientIds(new Set());
      return;
    }
    let cancelled = false;
    void searchPatientsFromBackend(query, { localPatients: patients, limit: MAX_HEADER_PATIENT_RESULTS })
      .then((response) => {
        if (cancelled) return;
        const verified = new Set(
          (response.results || [])
            .filter((entry) => entry.backendVerified)
            .map((entry) => entry.patientId),
        );
        setBackendVerifiedPatientIds(verified);
      })
      .catch(() => {
        if (!cancelled) setBackendVerifiedPatientIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [isReceptionRoute, patientLookupQuery, patients]);

  useEffect(() => {
    const focusLookup = () => patientLookupInputRef.current?.focus();
    document.addEventListener('focus-reception-search', focusLookup);
    if (isReceptionRoute) focusLookup();
    return () => document.removeEventListener('focus-reception-search', focusLookup);
  }, [isReceptionRoute]);

  const lookupResultsOpen = patientLookupOpen && patientLookupQuery.trim().length > 0;

  const updateLookupPanelPosition = useCallback(() => {
    const wrapper = lookupWrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    setLookupPanelPosition({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  }, []);

  useLayoutEffect(() => {
    if (!lookupResultsOpen) {
      setLookupPanelPosition(null);
      return undefined;
    }
    updateLookupPanelPosition();
    window.addEventListener('resize', updateLookupPanelPosition);
    window.addEventListener('scroll', updateLookupPanelPosition, true);
    return () => {
      window.removeEventListener('resize', updateLookupPanelPosition);
      window.removeEventListener('scroll', updateLookupPanelPosition, true);
    };
  }, [lookupResultsOpen, updateLookupPanelPosition]);

  const pilotHeaderMetrics = isPilotStationKpiPolicyActive() && screenCapabilities.showOperationalStrip;

  return (
    <header
      className={[
        'caredroid-header',
        'caredroid-header--compact',
        'caredroid-header--slim',
        pilotHeaderMetrics ? 'caredroid-header--pilot-metrics' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="caredroid-header__topbar">
        <div className="caredroid-header__brand caredroid-header__brand--slim">
          <Clock />
        </div>

        <div className="caredroid-header__center">
          {screenCapabilities.showCentralNodeBadge && !PILOT_CUSTOMER_MODE.enabled ? (
            <span
              className="caredroid-header__central-node"
              title={`${centralControl.statusLabel}. ${centralControl.dashboardControlLabel}. ${centralControl.inputProfile.label}. ${centralControl.contributorMode ? 'Users submit inputs only.' : 'This role can operate central controls.'}`}
            >
              {centralControl.label}: {centralControl.contributorMode ? 'Input only' : 'Controller'}{' '}
              · {centralControl.inputProfile.label}
            </span>
          ) : null}
          {screenCapabilities.showOperationalStrip ? (
            <OperationalAlertRail
              className="caredroid-header__central-status"
              centralSnapshot={centralSnapshot}
              syncLabel={syncLabel}
              syncTitle={syncTitle}
              syncStale={syncStale}
              syncPulse={syncPulse}
              intelligenceSnapshot={intelligenceSnapshot}
              screenMode={routeScreenMode}
              variant="header"
            />
          ) : null}
        </div>

        <div className="caredroid-header__actions">
          {!isReceptionRoute && (
            <div className="caredroid-header__primary-actions" aria-label="CareDroid primary actions">
              <button
                type="button"
                className="caredroid-header__action caredroid-header__action--primary"
                onClick={openCentralIntake}
                disabled={!canSubmitCentralIntake}
                aria-label="Start a new patient intake"
                title={
                  canSubmitCentralIntake
                    ? 'Start a new patient intake'
                    : `${emergencyRole.roleLabel} cannot start patient intake`
                }
              >
                New Patient
              </button>
            </div>
          )}

          <div
            ref={lookupWrapperRef}
            className={`caredroid-header__lookup${isReceptionRoute ? ' caredroid-header__lookup--emphasis' : ''}`}
          >
            <Search size={15} strokeWidth={2} aria-hidden />
            <input
              ref={patientLookupInputRef}
              type="search"
              value={patientLookupQuery}
              placeholder="Search patient, encounter, referral, EMS, queue..."
              aria-label={
                screenCapabilities.isRegistrationScreen ? 'Patient search' : 'Operational search'
              }
              role="combobox"
              aria-expanded={lookupResultsOpen}
              aria-controls={PATIENT_SEARCH_LISTBOX_ID}
              aria-autocomplete="list"
              aria-activedescendant={
                lookupResultsOpen && lookupActiveIndex >= 0
                  ? patientSearchOptionId(lookupActiveIndex)
                  : undefined
              }
              onFocus={() => setPatientLookupOpen(true)}
              onChange={(event) => {
                syncPatientLookupQuery(event.target.value);
                setPatientLookupOpen(true);
                setLookupActiveIndex(-1);
              }}
              onKeyDown={(event) => {
                // Arrow keys move a highlight through the patient rows. Without this
                // Enter always took result[0], so a keyboard-only clinician could
                // never reach the second match.
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  if (!patientLookupResults.length) return;
                  event.preventDefault();
                  setPatientLookupOpen(true);
                  setLookupActiveIndex((current) => {
                    const step = event.key === 'ArrowDown' ? 1 : -1;
                    const next = current + step;
                    if (next < 0) return patientLookupResults.length - 1;
                    if (next >= patientLookupResults.length) return 0;
                    return next;
                  });
                  return;
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const highlighted = patientLookupResults[lookupActiveIndex];
                  if (highlighted) selectLookupPatient(highlighted.patient.id);
                  else if (patientLookupResults[0]) selectLookupPatient(patientLookupResults[0].patient.id);
                  else if (firstOperationalHit) handleOpenOperationalHit(firstOperationalHit);
                  else openPatientLookupRoute();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setPatientLookupOpen(false);
                  setLookupActiveIndex(-1);
                }
              }}
            />
            {lookupResultsOpen && lookupPanelPosition && typeof document !== 'undefined'
              ? createPortal(
                  <div
                    className="caredroid-header__lookup-results"
                    style={{
                      top: lookupPanelPosition.top,
                      left: lookupPanelPosition.left,
                      width: Math.max(lookupPanelPosition.width, 320),
                    }}
                  >
                    <PatientSearchResults
                      query={patientLookupQuery}
                      results={patientLookupResults}
                      operationalGroups={operationalSearchGroups}
                      backendVerifiedPatientIds={backendVerifiedPatientIds}
                      canCreatePatient={canCreatePatient}
                      canViewPatients={canOpenPatients}
                      activeIndex={lookupActiveIndex}
                      isReceptionRoute={isReceptionRoute}
                      onFindPatient={selectLookupPatient}
                      onStartIntake={(patientId) =>
                        openSmartIntakeFromSearch({ patientId, step: 'verify' })
                      }
                      onViewEncounter={handleSearchViewEncounter}
                      onCreateEncounter={handleSearchCreateEncounter}
                      onOpenOperationalHit={handleOpenOperationalHit}
                      onFilterQueues={handleSearchFilterQueues}
                      onStartNewIntake={() => openSmartIntakeFromSearch()}
                    />
                  </div>,
                  document.body,
                )
              : null}
          </div>

          {!PILOT_CUSTOMER_MODE.enabled && !screenCapabilities.isRegistrationScreen ? (
            <button
              type="button"
              className="caredroid-header__palette-trigger"
              onClick={() => document.dispatchEvent(new Event('open-command-palette'))}
              aria-label="Open command palette"
              title="Search patients, encounters, referrals, EMS, and queues"
            >
              <Search size={18} strokeWidth={2} />
            </button>
          ) : null}

          <ThemeToggle />

          <OperationsCenterMenu />

          <UserAccountMenu />
        </div>
      </div>
    </header>
  );
}
