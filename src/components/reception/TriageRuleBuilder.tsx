import { FormEvent, useState } from 'react';
import {
  addStructuredTriageRule,
  listStructuredTriageRules,
  parseNaturalLanguageTriageRule,
} from '../../services/nativeAiCore';
import { addTriageRuleViaApi } from '../../services/nativeAiApi';
import { parseTriageRuleWithLlm } from '../../services/nativeAiTriageRuleLlm';
import './TriageRuleBuilder.css';

type TriageRuleBuilderProps = {
  onRuleAdded?: () => void;
  className?: string;
};

export default function TriageRuleBuilder({ onRuleAdded, className = '' }: TriageRuleBuilderProps) {
  const [naturalLanguage, setNaturalLanguage] = useState(
    'Patients with severe burns >25% TBS must be triage class 1',
  );
  const [preview, setPreview] = useState(() => parseNaturalLanguageTriageRule(naturalLanguage));
  const [rules, setRules] = useState(() => listStructuredTriageRules());
  const [llmParsing, setLlmParsing] = useState(false);

  const handlePreview = () => {
    setPreview(parseNaturalLanguageTriageRule(naturalLanguage));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await addTriageRuleViaApi(naturalLanguage, 'Clinical staff');
    } catch {
      const rule = parseNaturalLanguageTriageRule(naturalLanguage, { createdBy: 'Clinical staff' });
      addStructuredTriageRule(rule);
    }
    setRules(listStructuredTriageRules());
    onRuleAdded?.();
  };

  const handleLlmSubmit = async () => {
    setLlmParsing(true);
    try {
      const rule = await parseTriageRuleWithLlm(naturalLanguage, { createdBy: 'Clinical staff' });
      setPreview(rule);
      setRules(listStructuredTriageRules());
      onRuleAdded?.();
    } finally {
      setLlmParsing(false);
    }
  };

  return (
    <section className={['triage-rule-builder', className].filter(Boolean).join(' ')} aria-label="Triage rule builder">
      <header>
        <h3>NLP-augmented Triage Rule Builder</h3>
        <p>Write triage rules in plain English. CareDroid converts them into structured expert-system rules.</p>
      </header>

      <form onSubmit={handleSubmit}>
        <label htmlFor="triage-rule-text">Natural language rule</label>
        <textarea
          id="triage-rule-text"
          value={naturalLanguage}
          onChange={(event) => setNaturalLanguage(event.target.value)}
          rows={3}
        />
        <div className="triage-rule-builder__actions">
          <button type="button" onClick={handlePreview}>
            Preview JSON rule
          </button>
          <button type="submit">Add to expert system</button>
          <button type="button" onClick={() => void handleLlmSubmit()} disabled={llmParsing}>
            {llmParsing ? 'Parsing with LLM…' : 'Parse with LLM'}
          </button>
        </div>
      </form>

      <div className="triage-rule-builder__preview">
        <h4>Structured preview</h4>
        <pre>{JSON.stringify(preview, null, 2)}</pre>
      </div>

      <div className="triage-rule-builder__rules">
        <h4>Active rules ({rules.length})</h4>
        <ul>
          {rules.map((rule) => (
            <li key={rule.id}>
              <strong>{rule.label}</strong>
              <span>
                CTAS {rule.priority} · {rule.conditions.length} condition(s)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}