import React, { useMemo, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import ClinicalScoreCalculator, {
  CALCULATOR_BY_SUGGESTION_ID,
  isClinicalCalculatorSuggestion,
} from './ClinicalScoreCalculator';
import './ProtocolSuggestion.css';

export const PROTOCOL_SUGGESTIONS_BY_COMPLAINT = {
  'Chest Pain': [
    {
      id: 'heart-score',
      label: 'HEART Score',
      kind: 'Calculator',
      route: '/tools/calculators/heart-score',
      summary: 'Risk-stratify chest pain context for clinician review.',
    },
    {
      id: 'acs-protocol',
      label: 'ACS Protocol',
      kind: 'Protocol',
      summary: 'Surface ACS workflow prompts, ECG readiness, and escalation reminders.',
    },
  ],
  'Shortness of Breath': [
    {
      id: 'news2',
      label: 'NEWS2',
      kind: 'Calculator',
      route: '/tools/calculators/news2',
      summary: 'Review acute physiology and respiratory escalation context.',
    },
    {
      id: 'dyspnoea-protocol',
      label: 'Dyspnoea Protocol',
      kind: 'Protocol',
      summary: 'Guide structured dyspnoea assessment and respiratory handoff context.',
    },
  ],
  'Stroke/Neurological': [
    {
      id: 'nihss',
      label: 'NIHSS',
      kind: 'Calculator',
      route: '/tools/calculators/nihss',
      summary: 'Capture stroke deficit severity context for clinician review.',
    },
    {
      id: 'stroke-protocol',
      label: 'Stroke Protocol',
      kind: 'Protocol',
      summary: 'Surface last-known-well, imaging readiness, and neurology workflow reminders.',
    },
  ],
  'Sepsis/Infection': [
    {
      id: 'qsofa',
      label: 'qSOFA',
      kind: 'Calculator',
      route: '/tools/calculators/qsofa',
      summary: 'Screen suspected infection for high-risk bedside features.',
    },
    {
      id: 'news2',
      label: 'NEWS2',
      kind: 'Calculator',
      route: '/tools/calculators/news2',
      summary: 'Review acute physiology and deterioration risk context.',
    },
    {
      id: 'sepsis-protocol',
      label: 'Sepsis Protocol',
      kind: 'Protocol',
      summary:
        'Surface sepsis pathway prompts, lactate/culture readiness, and reassessment reminders.',
    },
  ],
  'Abdominal Pain': [
    {
      id: 'pain-assessment',
      label: 'Pain Assessment',
      kind: 'Assessment',
      summary: 'Document pain severity, trend, location, and reassessment cadence.',
    },
    {
      id: 'abd-protocol',
      label: 'Abd Protocol',
      kind: 'Protocol',
      summary: 'Guide abdominal pain workflow context and escalation cues.',
    },
  ],
  'Trauma/Injury': [
    {
      id: 'trauma-protocol',
      label: 'Trauma Protocol',
      kind: 'Protocol',
      summary: 'Surface trauma mechanism, primary survey, and escalation reminders.',
    },
    {
      id: 'fast',
      label: 'FAST',
      kind: 'Protocol',
      summary: 'Open FAST context panel for trauma-focused bedside review.',
    },
  ],
  Psychiatric: [
    {
      id: 'mental-health-protocol',
      label: 'Mental Health Protocol',
      kind: 'Protocol',
      summary: 'Surface safety, observation, and crisis workflow context for human review.',
    },
  ],
};

const COMPLAINT_ALIAS = {
  Respiratory: 'Shortness of Breath',
  'Infectious Respiratory': 'Sepsis/Infection',
  Infectious: 'Sepsis/Infection',
  Neurologic: 'Stroke/Neurological',
  Neuro: 'Stroke/Neurological',
  Orthopedic: 'Trauma/Injury',
  Musculoskeletal: 'Trauma/Injury',
  Trauma: 'Trauma/Injury',
  Headache: 'Stroke/Neurological',
};

export function normalizeComplaintCategory(complaintCategory) {
  return COMPLAINT_ALIAS[complaintCategory] || complaintCategory;
}

export function getProtocolSuggestions(complaintCategory) {
  return PROTOCOL_SUGGESTIONS_BY_COMPLAINT[normalizeComplaintCategory(complaintCategory)] || [];
}

export function createProtocolLaunchEvent(patientId, complaintCategory, suggestion, timestamp) {
  return {
    id: `protocol-${patientId}-${suggestion.id}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    patientId,
    type: 'ProtocolLaunched',
    timestamp,
    summary: `Launched ${suggestion.label} for ${complaintCategory}.`,
    metadata: {
      protocolId: suggestion.id,
      protocolLabel: suggestion.label,
      protocolKind: suggestion.kind,
      complaintCategory,
      route: suggestion.route || null,
    },
  };
}

function ProtocolSidePanel({ suggestion, complaintCategory, onClose }) {
  if (!suggestion) return null;

  return (
    <aside className="protocol-side-panel" aria-label={`${suggestion.label} side panel`}>
      <header>
        <div>
          <span>{suggestion.kind}</span>
          <h3>{suggestion.label}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Close protocol side panel">
          <X size={17} aria-hidden />
        </button>
      </header>
      <div className="protocol-side-panel__body">
        <p>{suggestion.summary}</p>
        <dl>
          <div>
            <dt>Complaint</dt>
            <dd>{complaintCategory}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>Contextual side panel</dd>
          </div>
          {suggestion.route ? (
            <div>
              <dt>Tool route</dt>
              <dd>{suggestion.route}</dd>
            </div>
          ) : null}
        </dl>
        <div className="protocol-side-panel__safety">
          Decision support only. Keep outputs human-reviewed and follow local ED protocol.
        </div>
        {suggestion.route ? (
          <a href={suggestion.route} target="_blank" rel="noreferrer">
            Open full tool
            <ExternalLink size={13} aria-hidden />
          </a>
        ) : null}
      </div>
    </aside>
  );
}

export default function ProtocolSuggestion({
  complaintCategory,
  onLaunch,
  onSaveScore,
  patient,
  compact = false,
}) {
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const [activeCalculatorId, setActiveCalculatorId] = useState(null);
  const normalizedComplaint = normalizeComplaintCategory(complaintCategory);
  const suggestions = useMemo(() => getProtocolSuggestions(complaintCategory), [complaintCategory]);

  if (!complaintCategory || suggestions.length === 0) return null;

  return (
    <>
      <section
        className={`protocol-suggestion${compact ? ' protocol-suggestion--compact' : ''}`}
        aria-label="Protocol suggestions"
      >
        <div>
          <strong>Suggested for {normalizedComplaint}:</strong>
          <span aria-hidden>Launch?</span>
        </div>
        <div className="protocol-suggestion__chips">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => {
                onLaunch?.(suggestion);
                if (isClinicalCalculatorSuggestion(suggestion)) {
                  setActiveCalculatorId(CALCULATOR_BY_SUGGESTION_ID[suggestion.id]);
                  return;
                }
                setActiveSuggestion(suggestion);
              }}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      </section>
      <ProtocolSidePanel
        suggestion={activeSuggestion}
        complaintCategory={normalizedComplaint}
        onClose={() => setActiveSuggestion(null)}
      />
      {activeCalculatorId ? (
        <ClinicalScoreCalculator
          key={activeCalculatorId}
          calculatorId={activeCalculatorId}
          patient={patient}
          onClose={() => setActiveCalculatorId(null)}
          onSaveScore={onSaveScore}
        />
      ) : null}
    </>
  );
}
