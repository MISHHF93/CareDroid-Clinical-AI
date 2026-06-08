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
import './AutomationAnalytics.css';

function MetricCard({ label, value, helper }) {
  return (
    <article className="automation-analytics-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

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
    <main className="automation-analytics-page">
      <section className="automation-analytics-hero">
        <div className="automation-analytics-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.bolt} size={30} />
        </div>
        <div>
          <p className="automation-analytics-eyebrow">Solution automation analytics</p>
          <h1>Automation Analytics</h1>
          <p>
            Tracks automation runs, success, failures, adoption, human overrides, and accepted AI
            recommendations across sellable healthcare solutions.
          </p>
        </div>
      </section>

      <section className="automation-analytics-grid" aria-label="Automation metrics">
        <MetricCard label="Automations" value={registrySummary.total} helper={`${registrySummary.active} active`} />
        <MetricCard label="Runs" value={totals.runs} helper={`${totals.successes} successful`} />
        <MetricCard label="Failures" value={totals.failures} helper="Demo analytics seed" />
        <MetricCard label="Human overrides" value={totals.humanOverrides} helper={`${auditSummary.reviewerRequired} audit reviews`} />
        <MetricCard label="AI accepted" value={totals.aiRecommendationsAccepted} helper="Recommendations accepted" />
      </section>

      <section className="automation-analytics-layout">
        <article className="automation-analytics-panel">
          <h2>Sellable solution packages</h2>
          <div className="automation-analytics-list">
            {solutionPackages.map((solution) => (
              <div key={solution.solutionId} className="automation-analytics-row">
                <strong>{solution.title}</strong>
                <span>{solution.description}</span>
                <small>{solution.automationIds.length} automations · {solution.workspace} workspace</small>
              </div>
            ))}
          </div>
        </article>

        <article className="automation-analytics-panel">
          <h2>Automation adoption</h2>
          <div className="automation-analytics-list">
            {analyticsRows.slice(0, 8).map((row) => (
              <div key={row.automationId} className="automation-analytics-row">
                <strong>{row.title}</strong>
                <span>{row.workspace} · {row.runs} runs · {row.adoption}% adoption</span>
                <small>{row.humanOverrides} human overrides · {row.aiRecommendationsAccepted} AI accepted</small>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
