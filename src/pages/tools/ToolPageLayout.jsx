import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversation } from '../../contexts/ConversationContext';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { buildSharedSessionUrl, createSharedSession } from '../../utils/sharedSessions';
import { buildClinicalInsights } from '../../utils/clinicalInsights';
import { computeRiskScore, generateClinicalAlerts } from '../../utils/riskScoring';
import ToolResultShare from '../../components/tools/ToolResultShare';
import RiskScoreGauge from '../../components/clinical/RiskScoreGauge';
import AnomalyBanner from '../../components/clinical/AnomalyBanner';
import RiskFactorsList from '../../components/clinical/RiskFactorsList';
import ClinicalAlertBanner from '../../components/clinical/ClinicalAlertBanner';
import analyticsService from '../../services/analyticsService';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon } from '../../navigation/iconRegistry';
import ClinicalDecisionSupportDisclaimer from '../../components/clinical/ClinicalDecisionSupportDisclaimer';
import './ToolPageLayout.css';

const AI_DOCUMENTATION_TOOL_IDS = new Set([
  'ambient-scribe',
  'calculator-recommender-ai',
  'diagnosis',
  'differential-ai',
  'guideline-rag',
  'ai-explainability',
  'clinical-audit',
  'order-set-ai',
  'patient-summary-ai',
  'timeline-ai',
  'procedures',
  'protocols',
]);
const FLEET_TOOL_IDS = new Set(['route-optimizer', 'predictive-maintenance', 'fleet-command', 'dispatch-ai']);

function disclaimerVariantForTool(toolId) {
  if (toolId === 'drug-check') return 'drug-interaction';
  if (FLEET_TOOL_IDS.has(toolId)) return 'fleet';
  if (AI_DOCUMENTATION_TOOL_IDS.has(toolId)) return 'ai-documentation';
  return 'clinical';
}

const ToolPageLayout = ({
  tool,
  children,
  actions = null,
  results = null,
  embedded = false,
  onCloseEmbedded,
}) => {
  const navigate = useNavigate();
  const { addMessage, selectTool } = useConversation();
  const { recordToolAccess } = useToolPreferences();
  const [showShareModal, setShowShareModal] = useState(false);
  const [clinicalAlerts, setClinicalAlerts] = useState([]);
  const [dismissedAnomalies, setDismissedAnomalies] = useState(new Set());

  const clinicalInsights = results ? buildClinicalInsights(tool, results) : null;
  const riskData = results ? computeRiskScore(tool.id, results) : null;

  // Generate clinical alerts based on risk data
  useEffect(() => {
    if (riskData) {
      const alerts = generateClinicalAlerts(tool.id, results, riskData);
      setClinicalAlerts(alerts);
    }
  }, [riskData, results, tool.id]);

  useEffect(() => {
    if (tool?.id) {
      recordToolAccess(tool.id);
    }
  }, [recordToolAccess, tool]);

  const handleSendToChat = (data) => {
    const summary =
      typeof data === 'object' && data !== null
        ? Object.keys(data)
            .slice(0, 8)
            .map((k) => `${k}: ${JSON.stringify(data[k]).slice(0, 120)}`)
            .join('\n')
        : String(data);
    addMessage({
      role: 'assistant',
      content: `**${tool.name}** — result snapshot (from clinical tool). Use chat for interpretation.\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\n_Key fields:_\n${summary}`,
      visualizations: [
        {
          type: 'calculator',
          data: typeof data === 'object' && data !== null && !Array.isArray(data) ? data : { value: data },
        },
      ],
      timestamp: new Date(),
    });
    const dest = embedded ? undefined : '/assistant';
    if (dest) navigate(dest);
    onCloseEmbedded?.();
  };

  const handleAcknowledgeAlert = (alertId) => {
    setClinicalAlerts(alerts =>
      alerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    );
  };

  const handleDismissAnomaly = () => {
    setDismissedAnomalies(new Set([...dismissedAnomalies, 'anomaly']));
  };

  const handleShareSession = async () => {
    const shareId = createSharedSession({
      toolId: tool.id,
      toolName: tool.name,
      toolDescription: tool.description,
      toolPath: tool.path,
    });

    analyticsService.trackEvent({
      eventName: 'tool_session_shared',
      parameters: { toolId: tool.id, shareId },
    });

    const url = buildSharedSessionUrl(shareId);

    try {
      await navigator.clipboard.writeText(url);
      alert('Local session link copied. It opens on this browser profile for 30 days.');
    } catch (error) {
      window.prompt('Copy this link to share:', url);
    }
  };

  return (
    <div className={`tool-page${embedded ? ' tool-page--embedded' : ''}`}>
      {!embedded && (
        <div className="tool-breadcrumb">
          <button type="button" onClick={() => navigate('/home')} className="breadcrumb-link">
            <span className="breadcrumb-link-inner">
              <NavIcon icon={CHROME_ICONS.message} size={16} decorative />
              <span>Home</span>
            </span>
          </button>
          <span className="breadcrumb-separator">›</span>
          <button type="button" onClick={() => navigate('/tools')} className="breadcrumb-link">
            <span className="breadcrumb-link-inner">
              <NavIcon icon={CHROME_ICONS.tools} size={16} decorative />
              <span>Tools</span>
            </span>
          </button>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">{tool.name}</span>
        </div>
      )}

      {/* Tool Header */}
      <div className="tool-header" style={{ borderColor: tool.color }}>
        <div className="tool-header-left">
          <div className="tool-header-icon" style={{ backgroundColor: `${tool.color}20` }}>
            <span className="tool-header-icon-inner" aria-hidden>
              <NavIcon icon={getToolIcon(tool.id)} size={28} />
            </span>
          </div>
          <div className="tool-header-info">
            <h1>{tool.name}</h1>
            <p>{tool.description}</p>
            <div className="tool-header-meta">
              <span className="tool-category-badge" style={{ backgroundColor: `${tool.color}20`, color: tool.color }}>
                {tool.category}
              </span>
              {tool.shortcut ? <span className="tool-shortcut-badge">Quick access</span> : null}
            </div>
          </div>
        </div>
        <div className="tool-header-actions">
          {actions}
          {results && (
            <button
              className="btn-share-tool btn-share-tool--with-icon"
              onClick={() => setShowShareModal(true)}
              title="Export or share your results"
              type="button"
            >
              <NavIcon icon={CHROME_ICONS.upload} size={16} aria-hidden />
              <span>Share Results</span>
            </button>
          )}
          <button
            className="btn-share-tool"
            onClick={handleShareSession}
          >
            Share Local Session
          </button>
          {embedded ? (
            <button type="button" className="btn-back-to-tools btn-back-to-tools--with-icon" onClick={() => onCloseEmbedded?.()}>
              <NavIcon icon={CHROME_ICONS.close} size={16} aria-hidden />
              <span>Close panel</span>
            </button>
          ) : (
            <button type="button" className="btn-back-to-tools btn-back-to-tools--with-icon" onClick={() => navigate('/tools')}>
              <NavIcon icon={CHROME_ICONS.arrowLeft} size={16} aria-hidden />
              <span>Tools</span>
            </button>
          )}
        </div>
      </div>

      {/* Tool Content */}
      <div className="tool-content">
        <ClinicalDecisionSupportDisclaimer variant={disclaimerVariantForTool(tool.id)} />
        {children}
      </div>

      {(clinicalInsights || riskData) && (
        <div className={`clinical-insights-panel severity-${(riskData?.severity || clinicalInsights?.severity)}`}>
          <div className="clinical-insights-header">
            <h3>Clinical Intelligence</h3>
            <span className={`clinical-insights-badge ${riskData?.severity || clinicalInsights?.severity}`}>
              {String(riskData?.severity || clinicalInsights?.severity || '').toUpperCase()}
            </span>
          </div>

          {/* Risk Score Gauge */}
          {riskData && (
            <div className="clinical-insights-row">
              <RiskScoreGauge
                value={riskData.riskScore}
                category={riskData.severity}
                confidence={riskData.confidence}
                size="medium"
                label="Overall Patient Risk"
              />
            </div>
          )}

          {/* Clinical Insights Summary */}
          {clinicalInsights && (
            <div className="clinical-insights-section">
              <p className="clinical-insights-summary">{clinicalInsights.summary}</p>
            </div>
          )}

          {/* Risk Factors */}
          {riskData && riskData.riskFactors.length > 0 && (
            <RiskFactorsList factors={riskData.riskFactors} />
          )}

          {/* Anomaly Banner */}
          {riskData && riskData.anomalies.length > 0 && !dismissedAnomalies.has('anomaly') && (
            <AnomalyBanner
              score={0.65}
              types={['Statistical Outlier', 'Lab Value']}
              recommendations={[
                'Verify specimen quality and testing methodology',
                'Consider repeat testing if clinically indicated',
                'Review patient context for potential explanations'
              ]}
              onDismiss={handleDismissAnomaly}
            />
          )}

          {/* Clinical Alerts */}
          {clinicalAlerts.length > 0 && (
            <div className="clinical-alerts-container">
              <div className="alerts-title">Clinical Alerts ({clinicalAlerts.length})</div>
              {clinicalAlerts.map((alert) => (
                <ClinicalAlertBanner
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={handleAcknowledgeAlert}
                  onDismiss={() => {
                    setClinicalAlerts(alerts =>
                      alerts.filter(a => a.id !== alert.id)
                    );
                  }}
                />
              ))}
            </div>
          )}

          {/* Alert Items */}
          {clinicalInsights && clinicalInsights.alerts.length > 0 && (
            <div className="clinical-insights-block">
              <div className="clinical-insights-title">Key Findings</div>
              <ul className="clinical-insights-list">
                {clinicalInsights.alerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {clinicalInsights && clinicalInsights.recommendations.length > 0 && (
            <div className="clinical-insights-block">
              <div className="clinical-insights-title">Recommendations</div>
              <ul className="clinical-insights-list">
                {clinicalInsights.recommendations.map((rec) => (
                  <li key={rec}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!embedded && (
        <div className="ai-integration-panel">
          <div className="ai-panel-header">
            <h3 className="ai-panel-title-with-icon">
              <NavIcon icon={CHROME_ICONS.bot} size={22} aria-hidden />
              <span>Open in Assistant</span>
            </h3>
            <p>Bring this action into Assistant to preview, confirm, or ask for guidance.</p>
          </div>
          <div className="ai-panel-actions">
            <button
              type="button"
              className="btn-ai-action"
              onClick={() => {
                selectTool(tool.id);
                navigate('/assistant');
              }}
            >
              <span className="btn-icon" aria-hidden>
                <NavIcon icon={CHROME_ICONS.message} size={18} />
              </span>
              <span>Discuss Results</span>
            </button>
            <button
              type="button"
              className="btn-ai-action"
              onClick={() => {
                selectTool(tool.id);
                navigate('/assistant');
              }}
            >
              <span className="btn-icon" aria-hidden>
                <NavIcon icon={CHROME_ICONS.bolt} size={18} />
              </span>
              <span>Use in Assistant</span>
            </button>
          </div>
          <div className="ai-panel-tip">
            <span className="tip-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.lightbulb} size={16} />
            </span>
            <span>
              Tip: use the buttons above when you want guidance without memorizing command phrases.
            </span>
          </div>
        </div>
      )}

      {showShareModal && (
        <ToolResultShare
          toolName={tool.name}
          toolId={tool.id}
          results={results}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};

export default ToolPageLayout;
