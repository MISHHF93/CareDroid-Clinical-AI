import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getPlatformSystemCapabilityByPath } from '../../data/platformSystems';
import { fetchPlatformGovernanceSurface } from '../../services/platformGovernanceApi';
import {
  PlatformDecisionPanel,
  PlatformEvidencePanel,
  PlatformMetricGrid,
  PlatformPageShell,
} from './components/PlatformWorkflowPrimitives';
import './PlatformSystemPage.css';

const SURFACE_BY_PATH = Object.freeze([
  [/^\/ai-governance/, 'governance'],
  [/^\/security/, 'ai-security'],
  [/^\/regulatory/, 'regulatory'],
  [/^\/equity/, 'equity'],
  [/^\/human-review/, 'review'],
  [/^\/system-health/, 'observability'],
  [/ai-security/, 'ai-security'],
  [/regulatory/, 'regulatory'],
  [/equity/, 'equity'],
  [/validation/, 'validation'],
  [/^\/review/, 'review'],
  [/consent/, 'consent'],
  [/privacy/, 'privacy'],
  [/^\/audit/, 'audit'],
  [/observability|incidents/, 'observability'],
  [/source-provenance|integrations/, 'interoperability'],
  [/governance/, 'governance'],
]);

const SURFACE_COPY = Object.freeze({
  governance: {
    title: 'Clinical Governance',
    summary: 'Production readiness, policy state, release gates, and safety blockers for clinical AI operations.',
  },
  'ai-security': {
    title: 'AI Security',
    summary: 'Prompt firewall, model access, PHI minimization, and security incident controls.',
  },
  regulatory: {
    title: 'Regulatory Classification',
    summary: 'Capability risk classification, intended use, evidence status, and approval gates.',
  },
  equity: {
    title: 'Equity Monitoring',
    summary: 'Cohort coverage, missingness, drift, and bias finding review for clinical AI workflows.',
  },
  validation: {
    title: 'Validation Sandbox',
    summary: 'Synthetic patient scenarios, validation runs, and release evidence before production activation.',
  },
  review: {
    title: 'Human Review Queue',
    summary: 'Clinician, privacy, governance, and safety review workflows for high-risk actions.',
  },
  consent: {
    title: 'Consent Center',
    summary: 'Patient consent scope, revocation state, and PHI access gating for AI and documentation.',
  },
  privacy: {
    title: 'Privacy Center',
    summary: 'Privacy requests, PHI access transparency, export/delete review, and patient data controls.',
  },
  audit: {
    title: 'Audit Trail Spine',
    summary: 'Reconstruct AI, PHI, policy, review, consent, integration, and deployment events.',
  },
  observability: {
    title: 'Deployment Observability',
    summary: 'Deployment health, degraded modes, AI safety metrics, and incident readiness.',
  },
  interoperability: {
    title: 'FHIR + HL7 Integration',
    summary: 'Patient import, observations, medications, labs, encounters, connection states, and source provenance.',
  },
});

const ENTERPRISE_ROUTE_COPY = Object.freeze({
  '/ai-governance': {
    title: 'AI Governance Center',
    summary: 'Model inventory, clinical review, risk classification, and release history for governed AI deployment.',
  },
  '/security': {
    title: 'LLM Security Dashboard',
    summary: 'Blocked prompts, security events, warnings, failed tool calls, PHI protection, and tool permission checks.',
  },
  '/regulatory': {
    title: 'Regulatory Classification',
    summary: 'Classify tools as informational, CDS, potential SaMD, workflow, or operational capabilities.',
  },
  '/equity': {
    title: 'Bias And Equity Monitoring',
    summary: 'Model performance, demographic, language, workflow, specialty, fairness, and drift monitoring.',
  },
  '/human-review': {
    title: 'Human Review Queue',
    summary: 'AI outputs awaiting review with status, reviewer, comments, and accept/reject workflow.',
  },
  '/privacy': {
    title: 'Consent + Privacy Center',
    summary: 'Consent management, retention policy, data export/delete workflows, and audit access.',
  },
  '/system-health': {
    title: 'Deployment Observability',
    summary: 'Frontend/backend versions, git commit, build timestamp, API health, environment, and deployment status.',
  },
});

function inferSurface(pathname) {
  return SURFACE_BY_PATH.find(([pattern]) => pattern.test(pathname))?.[1] || 'governance';
}

function countValue(data, key) {
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.items)) return data.items.length;
  if (Array.isArray(data?.events)) return data.events.length;
  if (data?.counts?.[key] !== undefined) return data.counts[key];
  return data?.readiness?.blocked ? 'Blocked' : data?.status || 'Ready';
}

export default function PlatformGovernanceWorkspace() {
  const location = useLocation();
  const capability = getPlatformSystemCapabilityByPath(location.pathname);
  const surface = inferSurface(location.pathname);
  const copy = ENTERPRISE_ROUTE_COPY[location.pathname] || SURFACE_COPY[surface] || SURFACE_COPY.governance;
  const [state, setState] = useState({ loading: true, error: '', data: null, sourceStatus: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: '', data: null, sourceStatus: 'loading' });
    fetchPlatformGovernanceSurface(surface, location.pathname).then((response) => {
      if (cancelled) return;
      setState({
        loading: false,
        error: response.ok ? '' : response.message,
        data: response.data,
        sourceStatus: response.sourceStatus,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, surface]);

  const metrics = useMemo(
    () => [
      {
        label: 'Source Status',
        value: state.sourceStatus,
        help: 'Live, demo, or local fallback contract state.',
      },
      {
        label: 'Readiness',
        value: state.data?.readiness?.blocked ? 'Blocked' : state.data?.status || 'Loading',
        help: 'P0 controls fail closed until configured.',
      },
      {
        label: 'Records',
        value: countValue(state.data, `${surface}s`),
        help: 'Durable records or synthetic fallback items for this workflow.',
      },
    ],
    [state.data, state.sourceStatus, surface]
  );

  return (
    <PlatformPageShell
      eyebrow={`${capability?.criticality || 'P0'} platform governance`}
      title={copy.title || capability?.name}
      summary={copy.summary || capability?.summary}
      error={state.error}
    >
      <PlatformMetricGrid metrics={metrics} />
      <PlatformDecisionPanel />
      {state.data?.panels ? (
        <PlatformEvidencePanel
          title={`${copy.title} Panels`}
          data={state.data.panels}
        />
      ) : null}
      <PlatformEvidencePanel
        title={`${copy.title} Contract`}
        data={state.loading ? { status: 'loading' } : state.data}
      />
    </PlatformPageShell>
  );
}
