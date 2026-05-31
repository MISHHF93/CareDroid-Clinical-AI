import { useMemo, useState } from 'react';
import {
  AUTOMATION_ACTIONS,
  AUTOMATION_CONDITIONS,
  AUTOMATION_TEMPLATES,
  AUTOMATION_TRIGGERS,
  buildAutomationRule,
  buildAutomationRuleLibrary,
  summarizeAutomationBuilder,
  validateAutomationRule,
} from '../data/workflowAutomationBuilder';
import './WorkflowAutomationBuilder.css';

function StepSelect({ label, value, options, onChange }) {
  return (
    <label className="automation-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function WorkflowAutomationBuilder() {
  const [templateId, setTemplateId] = useState(AUTOMATION_TEMPLATES[0].id);
  const selectedTemplate = AUTOMATION_TEMPLATES.find((template) => template.id === templateId) || AUTOMATION_TEMPLATES[0];
  const [triggerId, setTriggerId] = useState(selectedTemplate.triggerId);
  const [conditionId, setConditionId] = useState(selectedTemplate.conditionId);
  const [actionId, setActionId] = useState(selectedTemplate.actionId);
  const library = useMemo(() => buildAutomationRuleLibrary(), []);
  const summary = useMemo(() => summarizeAutomationBuilder(), []);
  const rule = useMemo(
    () => buildAutomationRule({ templateId, triggerId, conditionId, actionId }),
    [actionId, conditionId, templateId, triggerId]
  );
  const validation = validateAutomationRule(rule);

  const applyTemplate = (nextTemplateId) => {
    const template = AUTOMATION_TEMPLATES.find((item) => item.id === nextTemplateId) || AUTOMATION_TEMPLATES[0];
    setTemplateId(template.id);
    setTriggerId(template.triggerId);
    setConditionId(template.conditionId);
    setActionId(template.actionId);
  };

  return (
    <main className="automation-builder">
      <header className="automation-hero">
        <div>
          <p className="automation-eyebrow">Workflow Automation Builder</p>
          <h1>Automation</h1>
          <p>
            Move from dashboards to automation by turning clinical signals, device telemetry,
            and lab results into {'trigger -> condition -> action'} rules.
          </p>
        </div>
        <div className="automation-summary" aria-label="Automation builder summary">
          <div>
            <span>Triggers</span>
            <strong>{summary.triggers}</strong>
          </div>
          <div>
            <span>Conditions</span>
            <strong>{summary.conditions}</strong>
          </div>
          <div>
            <span>Actions</span>
            <strong>{summary.actions}</strong>
          </div>
        </div>
      </header>

      <section className="automation-layout">
        <aside className="automation-panel" aria-label="Automation templates">
          <h2>Example automations</h2>
          <div className="automation-template-list">
            {library.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === templateId ? 'automation-template automation-template--active' : 'automation-template'}
                onClick={() => applyTemplate(item.id)}
              >
                <strong>{item.name}</strong>
                <span>{item.summary}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="automation-panel automation-panel--builder" aria-label="Rule builder">
          <div className="automation-builder-header">
            <div>
              <h2>{rule.name}</h2>
              <p>{rule.goal}</p>
            </div>
            <span className={validation.valid ? 'automation-status automation-status--valid' : 'automation-status'}>
              {validation.valid ? 'Ready to save' : 'Incomplete'}
            </span>
          </div>

          <div className="automation-controls">
            <StepSelect label="Trigger" value={triggerId} options={AUTOMATION_TRIGGERS} onChange={setTriggerId} />
            <StepSelect label="Condition" value={conditionId} options={AUTOMATION_CONDITIONS} onChange={setConditionId} />
            <StepSelect label="Action" value={actionId} options={AUTOMATION_ACTIONS} onChange={setActionId} />
          </div>

          <ol className="automation-chain" aria-label="Trigger condition action chain">
            {rule.chain.map((step, index) => (
              <li key={`${step.type}-${step.id}`}>
                <span>{index + 1}</span>
                <div>
                  <small>{step.type}</small>
                  <strong>{step.label}</strong>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <section className="automation-preview" aria-label="Automation preview">
            <h3>Automation preview</h3>
            <p>{rule.automationOutcome}</p>
            <code>{rule.summary}</code>
          </section>
        </section>
      </section>
    </main>
  );
}
