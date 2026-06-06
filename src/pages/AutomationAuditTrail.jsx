import { useMemo, useState } from 'react';
import {
  AUTOMATION_AUDIT_STATUS_LABELS,
  getAutomationAuditEntries,
  getAutomationAuditTenants,
  summarizeAutomationAuditTrail,
} from '../data/automationAuditTrail';
import './AutomationAuditTrail.css';

function formatTimestamp(timestamp) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  } catch {
    return timestamp;
  }
}

function ConditionList({ conditions }) {
  return (
    <ul className="automation-audit-conditions" aria-label="Conditions evaluated">
      {conditions.map((condition) => (
        <li key={condition.label}>
          <span className={condition.result ? 'condition-dot condition-dot--pass' : 'condition-dot condition-dot--fail'} />
          {condition.label}: {condition.result ? 'passed' : 'failed'}
        </li>
      ))}
    </ul>
  );
}

function AuditEntryCard({ entry }) {
  const statusLabel = AUTOMATION_AUDIT_STATUS_LABELS[entry.status] || entry.status;

  return (
    <article className={`automation-audit-entry automation-audit-entry--${entry.status}`}>
      <header>
        <div>
          <span className="automation-audit-status">{statusLabel}</span>
          <h2>{entry.triggerFired}</h2>
          <p>{entry.actionSelected}</p>
        </div>
        <time dateTime={entry.timestamp}>{formatTimestamp(entry.timestamp)}</time>
      </header>

      <section className="automation-audit-grid" aria-label={`${entry.triggerFired} audit details`}>
        <div>
          <span>User</span>
          <strong>{entry.user.name}</strong>
        </div>
        <div>
          <span>Tenant</span>
          <strong>{entry.tenant.name}</strong>
        </div>
        <div>
          <span>Workspace</span>
          <strong>{entry.workspace.name}</strong>
        </div>
        <div>
          <span>AI involvement</span>
          <strong>{entry.aiInvolvement.involved ? 'AI-assisted' : 'Rules-only'}</strong>
        </div>
        <div>
          <span>Tool called</span>
          <strong>{entry.toolCalled}</strong>
        </div>
        <div>
          <span>Backend endpoint</span>
          <strong>{entry.backendEndpoint}</strong>
        </div>
        <div>
          <span>Reviewer</span>
          <strong>{entry.reviewer.required ? entry.reviewer.name || 'Required' : 'Not required'}</strong>
        </div>
      </section>

      <ConditionList conditions={entry.conditionsEvaluated} />

      {entry.reason ? <p className="automation-audit-note">Blocked reason: {entry.reason}</p> : null}
      {entry.error ? <p className="automation-audit-note automation-audit-note--error">Error: {entry.error}</p> : null}
      <p className="automation-audit-ai">{entry.aiInvolvement.summary}</p>
    </article>
  );
}

export default function AutomationAuditTrail() {
  const tenants = useMemo(() => getAutomationAuditTenants(), []);
  const [tenantId, setTenantId] = useState(tenants[0]?.id || '');
  const entries = useMemo(() => getAutomationAuditEntries({ tenantId }), [tenantId]);
  const summary = useMemo(() => summarizeAutomationAuditTrail(entries), [entries]);

  return (
    <main className="automation-audit-page">
      <header className="automation-audit-hero">
        <div>
          <p className="automation-audit-eyebrow">Automation Audit Trail</p>
          <h1>Automation Audit</h1>
          <p>
            Tenant-scoped record of every automation trigger, condition decision, selected action,
            AI/tool involvement, endpoint, outcome, timestamp, and reviewer requirement.
          </p>
        </div>
        <label className="automation-audit-tenant-filter">
          <span>Tenant scope</span>
          <select value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="automation-audit-policy" role="note">
        <strong>No invisible automation</strong>
        <span>Failed automations log errors, blocked automations log reasons, and entries are tenant-scoped.</span>
      </section>

      <section className="automation-audit-summary" aria-label="Automation audit summary">
        <div>
          <span>Total events</span>
          <strong>{summary.total}</strong>
        </div>
        <div>
          <span>Succeeded</span>
          <strong>{summary.success}</strong>
        </div>
        <div>
          <span>Blocked</span>
          <strong>{summary.blocked}</strong>
        </div>
        <div>
          <span>Failed</span>
          <strong>{summary.failed}</strong>
        </div>
        <div>
          <span>Reviewer required</span>
          <strong>{summary.reviewerRequired}</strong>
        </div>
        <div>
          <span>AI involved</span>
          <strong>{summary.aiInvolved}</strong>
        </div>
      </section>

      <section className="automation-audit-list" aria-label="Automation audit entries">
        {entries.length ? (
          entries.map((entry) => <AuditEntryCard key={entry.id} entry={entry} />)
        ) : (
          <p className="automation-audit-empty">No automation audit entries exist for this tenant.</p>
        )}
      </section>
    </main>
  );
}
