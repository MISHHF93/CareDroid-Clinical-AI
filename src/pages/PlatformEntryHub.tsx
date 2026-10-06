import { Link } from 'react-router-dom';
import {
  Ambulance,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  Compass,
  Layers,
  Monitor,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { PageShell } from '../components/ui/CareDroidPrimitives';
import { getPublicWaitingDisplayPath } from '../config/publicWaitingScreenModel';
import { resolveAdminHomeRoute } from '../config/platformEntryModel';
import { DEMO_PERSONA, getDemoPersonaHeadline } from '../config/demoPersonaModel';
import { listEdWorkflowAzSteps } from '../config/edWorkflowIntegrationModel';
import useEdWorkflowIntegration from '../hooks/useEdWorkflowIntegration';
import useProfileSwitcherVisibility from '../hooks/useProfileSwitcherVisibility';
import ProfileRoleSwitcher from '../components/account/ProfileRoleSwitcher';
import { usePractitionerSurfaceVisibility } from '../contexts/PractitionerVisibilityContext';
import './PlatformEntryHub.css';

export default function PlatformEntryHub() {
  const surfaces = usePractitionerSurfaceVisibility();
  const showProfileSwitcher = useProfileSwitcherVisibility();
  const edContext = useEdWorkflowIntegration();
  const workflowSteps = listEdWorkflowAzSteps();
  const clinicalHome = edContext.landingRoute;
  const adminHome = resolveAdminHomeRoute();
  const waitingRoomPath = getPublicWaitingDisplayPath();

  return (
    <PageShell
      as="div"
      suppressHeader
      className="platform-entry cdl-operational-page"
      contentClassName="platform-entry__content"
    >
      {/* ── Top Hero & Intelligence Status ──────────────────────────── */}
      <header className="platform-entry__hero">
        <div className="platform-entry__hero-badge">
          <span className="platform-entry__hero-pulse" aria-hidden="true" />
          <Sparkles className="platform-entry__hero-icon" size={14} />
          <span>CareDroid Clinical Intelligence OS · v2.5</span>
        </div>

        <h1 className="platform-entry__title">CareDroid Command & Operating Platform</h1>
        <p className="platform-entry__subtitle">
          Unified intelligence for acute care operations, dynamic triage, clinical copilot
          workflows, medical logistics, and enterprise hospital coordination.
        </p>

        <div className="platform-entry__telemetry-bar">
          <div className="platform-entry__telemetry-item">
            <span className="platform-entry__telemetry-indicator is-online" />
            <span className="platform-entry__telemetry-label">Realtime Engine:</span>
            <strong>Active (Live)</strong>
          </div>
          <div className="platform-entry__telemetry-divider" />
          <div className="platform-entry__telemetry-item">
            <CheckCircle2 size={13} className="platform-entry__telemetry-icon" />
            <span className="platform-entry__telemetry-label">Active Persona:</span>
            <strong>{DEMO_PERSONA.displayName}</strong>
            <span className="platform-entry__persona-chip">{edContext.personaLabel}</span>
          </div>
          <div className="platform-entry__telemetry-divider" />
          <div className="platform-entry__telemetry-item">
            <ShieldCheck size={13} className="platform-entry__telemetry-icon" />
            <span className="platform-entry__telemetry-label">Governance:</span>
            <strong>HIPAA / PIPEDA Verified</strong>
          </div>
          {surfaces.chrome.showEntryHubBackendSync ? (
            <>
              <div className="platform-entry__telemetry-divider" />
              <div className="platform-entry__telemetry-item">
                <span className="platform-entry__telemetry-label">API Persistence:</span>
                <strong>{edContext.backendSync.persistenceMode.replace('-', ' ')}</strong>
              </div>
            </>
          ) : null}
        </div>
      </header>

      {/* ── Operational Persona Lane Switcher ────────────────────────── */}
      {showProfileSwitcher ? (
        <section className="platform-entry__profiles-card" aria-label="Switch workflow profile">
          <div className="platform-entry__profiles-header">
            <div className="platform-entry__profiles-copy">
              <h2 className="platform-entry__profiles-heading">
                Select Operational Clinical Persona
              </h2>
              <p>
                {getDemoPersonaHeadline()}. Choose your lane to test role-tailored dashboards,
                clinical permission scopes, and real-time operational feeds.
              </p>
            </div>
            <Link
              to={CANONICAL_ROUTES.appNavigator}
              className="platform-entry__navigator-pill"
              title="Open verified route navigator"
            >
              <Compass size={14} />
              <span>Route Navigator</span>
            </Link>
          </div>
          <div className="platform-entry__switcher-host">
            <ProfileRoleSwitcher variant="chips" />
          </div>
        </section>
      ) : null}

      {/* ── Core Operating Workspaces Bento Grid ─────────────────────── */}
      <section className="platform-entry__workspaces" aria-label="Core clinical workspaces">
        <div className="platform-entry__grid">
          {/* Card 1: Emergency & Acute Care */}
          <div className="platform-entry__card platform-entry__card--primary">
            <div className="platform-entry__card-top">
              <div className="platform-entry__card-icon is-emergency">
                <Ambulance size={22} />
              </div>
              <span className="platform-entry__card-badge is-primary">Acute Care</span>
            </div>
            <h2 className="platform-entry__card-title">Emergency Department & Smart Intake</h2>
            <p className="platform-entry__card-description">
              Walk the complete acute journey: self-arrival check-in, triage acuity scoring
              (CTAS/ESI), dynamic ED whiteboard, bed management, and clinical reassessment.
            </p>
            <div className="platform-entry__card-links">
              <Link
                to={CANONICAL_ROUTES.emergencyReception}
                className="platform-entry__card-sublink"
              >
                Smart Intake
              </Link>
              <Link
                to={CANONICAL_ROUTES.emergencyWhiteboard}
                className="platform-entry__card-sublink"
              >
                Dynamic Whiteboard
              </Link>
              <Link to={CANONICAL_ROUTES.emergencyQueues} className="platform-entry__card-sublink">
                Triage Queue
              </Link>
            </div>
            <Link
              to={CANONICAL_ROUTES.emergencyReception}
              className="platform-entry__card-cta is-primary"
            >
              <span>Enter Emergency Workspace</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Card 2: Clinical AI Copilot & Medical Intelligence */}
          <div className="platform-entry__card">
            <div className="platform-entry__card-top">
              <div className="platform-entry__card-icon is-ai">
                <Bot size={22} />
              </div>
              <span className="platform-entry__card-badge is-ai">Medical Intelligence</span>
            </div>
            <h2 className="platform-entry__card-title">Clinical Copilot & Diagnostic AI</h2>
            <p className="platform-entry__card-description">
              Evidence-based differential diagnosis, clinical calculators (SOFA, qSOFA, HEART),
              validated protocol guidance (ACLS, Sepsis, Stroke), and ambient notes.
            </p>
            <div className="platform-entry__card-links">
              <Link to={clinicalHome} className="platform-entry__card-sublink">
                Clinical Home
              </Link>
              <Link to="/tools/calculators" className="platform-entry__card-sublink">
                Calculators
              </Link>
              <Link to="/tools/protocols" className="platform-entry__card-sublink">
                Protocols
              </Link>
            </div>
            <Link to={clinicalHome} className="platform-entry__card-cta">
              <span>Open Clinical AI Workspace</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Card 3: Hospital Operations Command */}
          <div className="platform-entry__card">
            <div className="platform-entry__card-top">
              <div className="platform-entry__card-icon is-operations">
                <Building2 size={22} />
              </div>
              <span className="platform-entry__card-badge is-ops">Operations Center</span>
            </div>
            <h2 className="platform-entry__card-title">Hospital Operations & Command</h2>
            <p className="platform-entry__card-description">
              Enterprise capacity monitoring, bed flow bottlenecks, ambulance fleet telemetry,
              incident command coordination, and facility digital twin maps.
            </p>
            <div className="platform-entry__card-links">
              <Link to={adminHome} className="platform-entry__card-sublink">
                Admin Console
              </Link>
              <Link
                to={CANONICAL_ROUTES.emergencyCapacity}
                className="platform-entry__card-sublink"
              >
                Capacity Engine
              </Link>
              <Link to={CANONICAL_ROUTES.emergencyPulse} className="platform-entry__card-sublink">
                Department Pulse
              </Link>
            </div>
            <Link to={adminHome} className="platform-entry__card-cta">
              <span>Launch Operations Console</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Card 4: PHI-Safe Waiting Room Display */}
          <div className="platform-entry__card">
            <div className="platform-entry__card-top">
              <div className="platform-entry__card-icon is-display">
                <Monitor size={22} />
              </div>
              <span className="platform-entry__card-badge is-display">PHI-Safe</span>
            </div>
            <h2 className="platform-entry__card-title">Waiting Room Display</h2>
            <p className="platform-entry__card-description">
              Safe public wall board for waiting areas: displays live stage progressions, wait time
              ranges, and crowd volumes without exposing protected health information.
            </p>
            <div className="platform-entry__card-links">
              <Link to={waitingRoomPath} className="platform-entry__card-sublink">
                Wall Display
              </Link>
              <Link
                to={CANONICAL_ROUTES.emergencySelfArrival}
                className="platform-entry__card-sublink"
              >
                Self Arrival
              </Link>
              <Link
                to={CANONICAL_ROUTES.emergencyPatientRoom}
                className="platform-entry__card-sublink"
              >
                Room Display
              </Link>
            </div>
            <Link to={waitingRoomPath} className="platform-entry__card-cta">
              <span>Launch Public Display</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── ED Workflow Architecture (A to Z) ────────────────────────── */}
      <section className="platform-entry__flow-card" aria-label="ED workflow A to Z">
        <div className="platform-entry__flow-header">
          <div className="platform-entry__flow-title-group">
            <Layers size={18} className="platform-entry__flow-icon" />
            <h2 className="platform-entry__flow-title">Emergency Clinical Journey (A–Z)</h2>
          </div>
          <span className="platform-entry__flow-count">{workflowSteps.length} Verified Stages</span>
        </div>

        <p className="platform-entry__flow-intro">
          CareDroid unifies the end-to-end patient encounter from pre-hospital inbound alerts
          through triage, evaluation, bedside treatment, and final disposition.
        </p>

        <div className="platform-entry__flow-grid">
          {workflowSteps.map((step, index) => (
            <div key={step.id} className="platform-entry__flow-step">
              <div className="platform-entry__step-num">{index + 1}</div>
              <div className="platform-entry__step-content">
                <span className="platform-entry__step-title">{step.title}</span>
                {step.route ? (
                  <Link to={step.route} className="platform-entry__step-link">
                    <span>Open stage</span>
                    <ChevronRight size={12} />
                  </Link>
                ) : (
                  <span className="platform-entry__step-static">Standard step</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="platform-entry__flow-footer">
          <div className="platform-entry__meta-cluster">
            <span>Clinical Landing:</span>
            <strong>{edContext.personaLabel}</strong>
            <span className="platform-entry__meta-arrow">→</span>
            <Link to={edContext.landingRoute} className="platform-entry__meta-link">
              {edContext.landingRoute}
            </Link>
          </div>
          <div className="platform-entry__shortcuts">
            <Link to={CANONICAL_ROUTES.profile}>Clinical Profile</Link>
            <span className="platform-entry__dot">·</span>
            <Link to={CANONICAL_ROUTES.organization}>Organization</Link>
            <span className="platform-entry__dot">·</span>
            <Link to={CANONICAL_ROUTES.systemHealth}>System Health</Link>
            <span className="platform-entry__dot">·</span>
            <Link to={CANONICAL_ROUTES.login}>Staff Login</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
