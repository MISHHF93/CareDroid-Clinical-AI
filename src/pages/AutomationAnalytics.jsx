import {
  buildAutomationAnalyticsSeed,
  getAutomationSolutionPackages,
  summarizeAutomationRegistry,
} from '../data/automationRegistry';
import {
  getAutomationAuditEntries,
  summarizeAutomationAuditTrail,
} from '../data/automationAuditTrail';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import { NavIcon } from '../navigation/NavIcon';
import {
  DashboardGrid,
  DashboardSection,
  MetricCard,
  PageShell,
} from '../components/ui/CareDroidPrimitives';
import './AutomationAnalytics.css';

export default function AutomationAnalytics() {
  const registrySummary = summarizeAutomationRegistry();
  const auditSummary = summarizeAutomationAuditTrail(getAutomationAuditEntries());
  const analyticsRows = buildAutomationAnalyticsSeed();
  const solutionPackages = getAutomationSolutionPackages();
  const totals = analyticsRows.reduce(
    (acc, row) => ({
      runs: acc.runs + row.runs,
      successes: acc.successes + row.successes,
      failures: acc.failures + row.failures,
      humanOverrides: acc.humanOverrides + row.humanOverrides,
      aiRecommendationsAccepted: acc.aiRecommendationsAccepted + row.aiRecommendationsAccepted,
    }),
    { runs: 0, successes: 0, failures: 0, humanOverrides: 0, aiRecommendationsAccepted: 0 }
  );

  return (
    <PageShell
      className="automation-analytics-page"
      contentClassName="cd-page-stack cd-page-stack--compact automation-analytics-page__content"
      eyebrow="Solution automation analytics"
      title="Automation Analytics"
      description="Tracks automation runs, success, failures, adoption, human overrides, and accepted AI recommendations across sellable healthcare solutions."
      leadingIcon={<NavIcon icon={CHROME_ICONS.bolt} size={28} />}
    >

      <DashboardGrid variant="metrics" className="automation-analytics-grid" aria-label="Automation metrics">
        <MetricCard label="Automations" value={registrySummary.total} helper={`${registrySummary.active} active`} />
        <MetricCard label="Runs" value={totals.runs} helper={`${totals.successes} successful`} />
        <MetricCard label="Failures" value={totals.failures} helper="Demo analytics seed" />
        <MetricCard label="Human overrides" value={totals.humanOverrides} helper={`${auditSummary.reviewerRequired} audit reviews`} />
        <MetricCard label="AI accepted" value={totals.aiRecommendationsAccepted} helper="Recommendations accepted" />
      </DashboardGrid>

      <DashboardGrid variant="split" className="automation-analytics-layout">
        <DashboardSection className="automation-analytics-panel" title="Sellable solution packages">
          <div className="automation-analytics-list">
            {solutionPackages.map((solution) => (
              <div key={solution.solutionId} className="automation-analytics-row">
                <strong>{solution.title}</strong>
                <span>{solution.description}</span>
                <small>{solution.automationIds.length} automations · {solution.workspace} workspace</small>
              </div>
            ))}
          </div>
        </DashboardSection>

        <DashboardSection className="automation-analytics-panel" title="Automation adoption">
          <div className="automation-analytics-list">
            {analyticsRows.slice(0, 8).map((row) => (
              <div key={row.automationId} className="automation-analytics-row">
                <strong>{row.title}</strong>
                <span>{row.workspace} · {row.runs} runs · {row.adoption}% adoption</span>
                <small>{row.humanOverrides} human overrides · {row.aiRecommendationsAccepted} AI accepted</small>
              </div>
            ))}
          </div>
        </DashboardSection>
      </DashboardGrid>
    </PageShell>
  );
}
