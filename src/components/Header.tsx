import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { IconSearch } from '@tabler/icons-react';
import { useEmergencyStore } from '../store/emergencyStore';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  EMERGENCY_ACTIONS,
  EMERGENCY_ROLE_IDS,
  getReceptionEmbeddedIntakePath,
  getReceptionQuickCreatePath,
  isRegistrationClerkRole,
  prefersReceptionForPatientCreate,
  prefersReceptionForPatientSearch,
} from '../config/emergencyRolePermissions';
import { RECEPTION_COPY } from './reception/receptionCopy';
import { getCentralControlPolicy } from '../config/centralControl.config';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import useEffectiveUserProfile from '../hooks/useEffectiveUserProfile';
import { navigateProfileAware } from '../navigation/profileRouteLaunch';
import useScreenModeCapabilities from '../hooks/useScreenModeCapabilities';
import { rankPatientsBySearch } from '../utils/patientSearch';
import { searchPatientsFromBackend } from '../services/patientManagementApi';
import PatientSearchResults from './PatientSearchResults';
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
import { UserAccountMenu } from './account';
import OperationalAlarmDock from './chrome/OperationalAlarmDock';
import './Header.css';

const MAX_HEADER_PATIENT_RESULTS = 5;

function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <time className="app-chrome-top__clock" dateTime={now.toISOString()}>
      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </time>
  );
}

/**
 * Minimal clinical top bar (Option C):
 * Identity | Search | Alarms | Create | Account
 * Guide lives in the sidebar only. KPIs live on ShellRouteTab.
 */
export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const emergencyRole = useEmergencyRolePermissions();
  const { saasRole } = useEffectiveUserProfile();
  const screenCapabilities = useScreenModeCapabilities();
  const patientLookupInputRef = useRef<HTMLInputElement>(null);
  const isReceptionRoute = location.pathname === CANONICAL_ROUTES.emergencyReception;

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
  const canSubmitCentralIntake =
    canCreatePatient || (centralControl.enabled && !emergencyRole.readOnly);

  const patientLookupResults = useMemo(
    () =>
      rankPatientsBySearch(patients, patientLookupQuery, MAX_HEADER_PATIENT_RESULTS).map(
        (result) => result,
      ),
    [patientLookupQuery, patients],
  );

  const operationalSearchGroups = useMemo(
    () =>
      groupOperationalSearchHits(
        searchOperationalEntities({
          query: patientLookupQuery,
          patients,
          referrals,
          emsArrivals,
          queues,
        }),
      ),
    [emsArrivals, patientLookupQuery, patients, queues, referrals],
  );

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

  return (
    <header className="app-chrome-top" data-header-layout="minimal">
      <div className="app-chrome-top__identity">
        {/* Brand mark lives in the sidebar only — keep clock alone here. */}
        <Clock />
      </div>

      <div
        className={`app-chrome-top__search${isReceptionRoute ? ' app-chrome-top__search--emphasis' : ''}`}
      >
        <IconSearch size={16} stroke={2} aria-hidden />
        <input
          ref={patientLookupInputRef}
          type="search"
          value={patientLookupQuery}
          placeholder="Search patients, EMS, queues…"
          aria-label={
            screenCapabilities.isRegistrationScreen ? 'Patient search' : 'Operational search'
          }
          onFocus={() => setPatientLookupOpen(true)}
          onChange={(event) => {
            syncPatientLookupQuery(event.target.value);
            setPatientLookupOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (patientLookupResults[0]) selectLookupPatient(patientLookupResults[0].patient.id);
              else if (firstOperationalHit) handleOpenOperationalHit(firstOperationalHit);
              else openPatientLookupRoute();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              setPatientLookupOpen(false);
            }
          }}
        />
        {patientLookupOpen && patientLookupQuery.trim() ? (
          <div className="app-chrome-top__results">
            <PatientSearchResults
              query={patientLookupQuery}
              results={patientLookupResults}
              operationalGroups={operationalSearchGroups}
              backendVerifiedPatientIds={backendVerifiedPatientIds}
              canCreatePatient={canCreatePatient}
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
          </div>
        ) : null}
      </div>

      <div className="app-chrome-top__actions">
        {/* Alarms in header — not a floating corner window; Guide is sidebar-only */}
        <OperationalAlarmDock showEmsInbound={!screenCapabilities.isReceptionScreen} />
        <button
          type="button"
          className="app-chrome-top__create"
          onClick={openCentralIntake}
          disabled={!canSubmitCentralIntake}
          aria-label={
            isReceptionRoute
              ? isRegistrationClerkRole(emergencyRole.role)
                ? RECEPTION_COPY.header.registerTitle
                : RECEPTION_COPY.identityCheck.title
              : 'Create patient'
          }
          title={
            canSubmitCentralIntake
              ? isReceptionRoute
                ? isRegistrationClerkRole(emergencyRole.role)
                  ? RECEPTION_COPY.header.registerTitle
                  : RECEPTION_COPY.identityCheck.description
                : 'Create a patient intake'
              : `${emergencyRole.roleLabel} cannot create patients`
          }
        >
          {isReceptionRoute ? RECEPTION_COPY.header.register : 'Create'}
        </button>
        <UserAccountMenu />
      </div>
    </header>
  );
}
