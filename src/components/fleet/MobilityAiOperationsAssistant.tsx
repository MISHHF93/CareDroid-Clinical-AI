import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { fetchMobilityAiRecommendations } from '../../services/medicalMobilityService';
import './MobilityAiOperationsAssistant.css';

export interface MobilityAiOperationsAssistantProps {
  className?: string;
  onApplyRecommendation?: (recId: string) => void;
}

interface AiRecommendation {
  id: string;
  title: string;
  type:
    | 'DISPATCH_OPTIMIZATION'
    | 'COLD_CHAIN_ALERT'
    | 'BATTERY_CONSERVATION'
    | 'CORRIDOR_CONGESTION';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  rationale: string;
  suggestedAction: string;
  confidenceScore: number;
}

const DEFAULT_RECOMMENDATIONS: AiRecommendation[] = [
  {
    id: 'rec-01',
    title: 'Pre-position eVTOL Falcon at Helipad 3 for Incoming Trauma STAT Demand',
    type: 'DISPATCH_OPTIMIZATION',
    severity: 'INFO',
    rationale:
      'Predictive analytics indicates 88% probability of regional cross-facility blood transfer request within the next 45 minutes.',
    suggestedAction: 'Stage eVTOL Falcon on Rapid-Standby Mode',
    confidenceScore: 0.92,
  },
  {
    id: 'rec-02',
    title: 'Cold-Chain Ambient Warning: Tower B High Ambient Corridor',
    type: 'COLD_CHAIN_ALERT',
    severity: 'WARNING',
    rationale:
      'HVAC zone 4-East is reporting 26.5°C ambient temperature. AMR MediRover active chamber insulation will increase compressor duty cycle to 92%.',
    suggestedAction: 'Reroute via Tower A Service Elevator (Average Ambient 20.8°C)',
    confidenceScore: 0.89,
  },
  {
    id: 'rec-03',
    title: 'Corridor Congestion & Gurney Traffic at Radiology Concourse',
    type: 'CORRIDOR_CONGESTION',
    severity: 'WARNING',
    rationale:
      'Computer vision and IoT sensor nexus reports 3 bed transfers queued outside CT Scanner 2, narrowing transit corridor to 1.1 meters.',
    suggestedAction: 'Enforce 0.5 m/s speed governor and activate pedestrian audible advisory',
    confidenceScore: 0.95,
  },
];

export const MobilityAiOperationsAssistant: React.FC<MobilityAiOperationsAssistantProps> = ({
  className = '',
  onApplyRecommendation,
}) => {
  const [recommendations, setRecommendations] =
    useState<AiRecommendation[]>(DEFAULT_RECOMMENDATIONS);
  const [loading, setLoading] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const data = await fetchMobilityAiRecommendations();
      if (data && data.length > 0) {
        setRecommendations(data as unknown as AiRecommendation[]);
      }
    } catch {
      // Fallback to defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecommendations();
  }, []);

  const handleApply = (id: string) => {
    setAppliedIds((prev) => new Set([...prev, id]));
    onApplyRecommendation?.(id);
  };

  return (
    <div
      className={`mobility-ai-assistant ${className}`}
      data-testid="mobility-ai-operations-assistant"
    >
      <header className="mobility-ai-assistant__header">
        <div className="mobility-ai-assistant__title-group">
          <div className="mobility-ai-assistant__icon-badge">
            <Bot size={16} />
          </div>
          <div>
            <h3 className="mobility-ai-assistant__title">
              Mobility AI Operations Assistant & Decision Support
            </h3>
            <p className="mobility-ai-assistant__subtitle">
              Edge perception reasoning, route prediction, and proactive cold chain safeguards
            </p>
          </div>
        </div>

        <button
          type="button"
          className="mobility-ai-assistant__refresh-btn"
          onClick={loadRecommendations}
          disabled={loading}
          title="Recompute AI fleet recommendations"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Analysis</span>
        </button>
      </header>

      {/* Recommendations Cards */}
      <div className="mobility-ai-assistant__list">
        {recommendations.map((rec) => {
          const isApplied = appliedIds.has(rec.id);
          return (
            <div
              key={rec.id}
              className={`rec-card rec-card--${rec.severity.toLowerCase()} ${isApplied ? 'rec-card--applied' : ''}`}
            >
              <div className="rec-card__top">
                <div className="rec-card__icon-badge">
                  {rec.severity === 'CRITICAL' ? (
                    <ShieldAlert size={14} />
                  ) : rec.severity === 'WARNING' ? (
                    <AlertTriangle size={14} />
                  ) : (
                    <Sparkles size={14} />
                  )}
                </div>
                <div className="rec-card__title-col">
                  <strong>{rec.title}</strong>
                  <span className="font-mono text-xs text-subtle">
                    Model Confidence: {Math.round(rec.confidenceScore * 100)}%
                  </span>
                </div>
              </div>

              <p className="rec-card__rationale">{rec.rationale}</p>

              <div className="rec-card__action-row">
                <div className="rec-card__suggested">
                  <Lightbulb size={13} className="text-accent" />
                  <span>{rec.suggestedAction}</span>
                </div>

                <button
                  type="button"
                  className={`rec-apply-btn ${isApplied ? 'rec-apply-btn--applied' : ''}`}
                  onClick={() => handleApply(rec.id)}
                  disabled={isApplied}
                >
                  {isApplied ? (
                    <>
                      <CheckCircle2 size={12} />
                      <span>Applied</span>
                    </>
                  ) : (
                    <>
                      <span>Apply Advice</span>
                      <ChevronRight size={12} />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MobilityAiOperationsAssistant;
