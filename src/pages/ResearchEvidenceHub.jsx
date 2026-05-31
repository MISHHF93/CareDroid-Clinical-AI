import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiStateBanner from '../components/ApiStateBanner';
import { sendClinicalChatMessage } from '../services/clinicalChatService';
import {
  buildEvidenceBriefPrompt,
  buildEvidenceSummaryPrompt,
  buildGuidelineComparisonPrompt,
  EVIDENCE_SUMMARIES,
  getResearchHubSnapshot,
  GUIDELINE_LIBRARY,
  resolveResearchWorkflowLinks,
  searchResearchHub,
} from '../data/researchEvidenceHub';
import './ResearchEvidenceHub.css';

function getAssistantText(response) {
  return response?.data?.response || response?.data?.message || response?.message?.content || response?.message || '';
}

function WorkflowLinks({ item }) {
  const links = resolveResearchWorkflowLinks(item);
  const allLinks = [
    ...links.protocols.map((link) => ({ ...link, kind: 'Protocol' })),
    ...links.simulations.map((link) => ({ ...link, kind: 'Simulation' })),
  ];

  if (!allLinks.length) return null;

  return (
    <div className="research-hub-workflow-links" aria-label={`Workflow links for ${item.title || item.topic}`}>
      {allLinks.map((link) => (
        <Link key={`${link.kind}-${link.id}`} to={link.path}>
          {link.kind}: {link.label}
        </Link>
      ))}
    </div>
  );
}

export default function ResearchEvidenceHub() {
  const [query, setQuery] = useState('');
  const [assistantOutput, setAssistantOutput] = useState('');
  const [loadingAction, setLoadingAction] = useState('');
  const [error, setError] = useState('');

  const snapshot = useMemo(() => getResearchHubSnapshot(), []);
  const results = useMemo(() => searchResearchHub(query), [query]);

  const runAssistant = async (action, prompt) => {
    setLoadingAction(action);
    setAssistantOutput('');
    setError('');

    try {
      const response = await sendClinicalChatMessage({
        tool: 'research-evidence-hub',
        message: prompt,
      });
      if (!response?.ok) {
        throw new Error(response?.data?.message || response?.message || 'Unable to generate evidence response.');
      }
      setAssistantOutput(getAssistantText(response) || 'No evidence response returned.');
    } catch (err) {
      setError(err.message || 'Unable to generate evidence response.');
    } finally {
      setLoadingAction('');
    }
  };

  return (
    <main className="research-hub-page">
      <section className="research-hub-hero" aria-labelledby="research-hub-title">
        <div>
          <p className="research-hub-eyebrow">{snapshot.safetyLabel}</p>
          <h1 id="research-hub-title">Research and Evidence Hub</h1>
          <p>
            Literature library, guideline library, evidence summaries, study tracker, and citation
            explorer integrated with CareDroid protocols and simulation training scenarios.
          </p>
        </div>
        <div className="research-hub-hero__actions">
          <Link to="/protocols">Open protocols</Link>
          <Link to="/simulation">Open simulations</Link>
          <Link to="/tools/guideline-rag">Guideline RAG</Link>
        </div>
      </section>

      <section className="research-hub-panel" aria-label="Research search">
        <div className="research-hub-search">
          <input
            type="search"
            aria-label="Search research evidence"
            placeholder="Search sepsis, ACS, stroke, respiratory, citations..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="button"
            className="research-hub-button"
            onClick={() => runAssistant('brief', buildEvidenceBriefPrompt(query || 'sepsis escalation'))}
            disabled={Boolean(loadingAction)}
          >
            {loadingAction === 'brief' ? 'Generating...' : 'Generate evidence brief'}
          </button>
        </div>
      </section>

      <section className="research-hub-stats" aria-label="Research hub summary">
        <article className="research-hub-stat">
          <p>Literature</p>
          <strong>{snapshot.literatureCount}</strong>
        </article>
        <article className="research-hub-stat">
          <p>Guidelines</p>
          <strong>{snapshot.guidelineCount}</strong>
        </article>
        <article className="research-hub-stat">
          <p>Evidence summaries</p>
          <strong>{snapshot.evidenceSummaryCount}</strong>
        </article>
        <article className="research-hub-stat">
          <p>Tracked studies</p>
          <strong>{snapshot.trackedStudyCount}</strong>
        </article>
        <article className="research-hub-stat">
          <p>Citations</p>
          <strong>{snapshot.citationCount}</strong>
        </article>
      </section>

      <section className="research-hub-panel" aria-labelledby="evidence-summaries-heading">
        <div className="research-hub-card__header">
          <div>
            <p className="research-hub-eyebrow">Summarize evidence</p>
            <h2 id="evidence-summaries-heading">Evidence summaries</h2>
          </div>
          <button
            type="button"
            className="research-hub-button"
            onClick={() => runAssistant('summary', buildEvidenceSummaryPrompt(results.summaries[0] || EVIDENCE_SUMMARIES[0]))}
            disabled={Boolean(loadingAction)}
          >
            {loadingAction === 'summary' ? 'Summarizing...' : 'Summarize evidence'}
          </button>
        </div>
        <div className="research-hub-grid">
          {results.summaries.map((summary) => (
            <article key={summary.id} className="research-hub-card">
              <div>
                <span className="research-hub-badge">{summary.certainty} certainty</span>
                <h3>{summary.topic}</h3>
                <p>{summary.bottomLine}</p>
              </div>
              <ul>
                {summary.findings.map((finding) => <li key={finding}>{finding}</li>)}
              </ul>
              <WorkflowLinks item={summary} />
            </article>
          ))}
        </div>
      </section>

      <section className="research-hub-panel" aria-labelledby="guideline-library-heading">
        <div className="research-hub-card__header">
          <div>
            <p className="research-hub-eyebrow">Compare guidelines</p>
            <h2 id="guideline-library-heading">Guideline library</h2>
          </div>
          <button
            type="button"
            className="research-hub-button"
            onClick={() => runAssistant('compare', buildGuidelineComparisonPrompt(results.guidelines.slice(0, 2).length ? results.guidelines.slice(0, 2) : GUIDELINE_LIBRARY.slice(0, 2)))}
            disabled={Boolean(loadingAction)}
          >
            {loadingAction === 'compare' ? 'Comparing...' : 'Compare guidelines'}
          </button>
        </div>
        <div className="research-hub-grid">
          {results.guidelines.map((guideline) => (
            <article key={guideline.id} className="research-hub-card">
              <div>
                <span className="research-hub-badge">{guideline.status}</span>
                <h3>{guideline.title}</h3>
                <p className="research-hub-muted">
                  {guideline.publisher} · {guideline.version} · {guideline.domain}
                </p>
              </div>
              <ul>
                {guideline.keyRecommendations.map((recommendation) => (
                  <li key={recommendation}>{recommendation}</li>
                ))}
              </ul>
              <WorkflowLinks item={guideline} />
            </article>
          ))}
        </div>
      </section>

      <section className="research-hub-panel" aria-labelledby="literature-library-heading">
        <p className="research-hub-eyebrow">Literature library</p>
        <h2 id="literature-library-heading">Literature library</h2>
        <div className="research-hub-grid">
          {results.literature.map((article) => (
            <article key={article.id} className="research-hub-card">
              <div>
                <span className="research-hub-badge">{article.evidenceLevel}</span>
                <h3>{article.title}</h3>
                <p className="research-hub-muted">
                  {article.source} · {article.year} · {article.studyType}
                </p>
              </div>
              <p>{article.summary}</p>
              <WorkflowLinks item={article} />
            </article>
          ))}
        </div>
      </section>

      <section className="research-hub-panel" aria-labelledby="study-tracker-heading">
        <p className="research-hub-eyebrow">Study tracker</p>
        <h2 id="study-tracker-heading">Study tracker</h2>
        <div className="research-hub-grid research-hub-grid--three">
          {results.studies.map((study) => (
            <article key={study.id} className="research-hub-card">
              <span className="research-hub-badge">{study.status}</span>
              <h3>{study.title}</h3>
              <p className="research-hub-muted">Owner: {study.owner}</p>
              <p>{study.nextMilestone}</p>
              <WorkflowLinks item={study} />
            </article>
          ))}
        </div>
      </section>

      <section className="research-hub-panel" aria-labelledby="citation-explorer-heading">
        <p className="research-hub-eyebrow">Citation explorer</p>
        <h2 id="citation-explorer-heading">Citation explorer</h2>
        <div className="research-hub-grid research-hub-grid--three">
          {results.citations.map((citation) => (
            <article key={citation.id} className="research-hub-card">
              <span className="research-hub-badge">{citation.citationType}</span>
              <h3>{citation.title}</h3>
              <p className="research-hub-muted">
                {citation.source} · {citation.year}
              </p>
              <small>{citation.id}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="research-hub-panel" aria-labelledby="research-ai-heading">
        <h2 id="research-ai-heading">AI evidence workbench</h2>
        <div className="research-hub-ai-actions">
          <button
            type="button"
            className="research-hub-button"
            onClick={() => runAssistant('summary', buildEvidenceSummaryPrompt(results.summaries[0] || EVIDENCE_SUMMARIES[0]))}
            disabled={Boolean(loadingAction)}
          >
            Summarize evidence
          </button>
          <button
            type="button"
            className="research-hub-button"
            onClick={() => runAssistant('compare', buildGuidelineComparisonPrompt(results.guidelines.slice(0, 2).length ? results.guidelines.slice(0, 2) : GUIDELINE_LIBRARY.slice(0, 2)))}
            disabled={Boolean(loadingAction)}
          >
            Compare guidelines
          </button>
          <button
            type="button"
            className="research-hub-button"
            onClick={() => runAssistant('brief', buildEvidenceBriefPrompt(query || 'sepsis escalation'))}
            disabled={Boolean(loadingAction)}
          >
            Generate evidence brief
          </button>
        </div>
        <ApiStateBanner error={error} onRetry={() => runAssistant('brief', buildEvidenceBriefPrompt(query || 'sepsis escalation'))} />
        {loadingAction && <p className="research-hub-explanation">Generating research evidence response...</p>}
        {assistantOutput ? (
          <p className="research-hub-explanation">{assistantOutput}</p>
        ) : (
          <p className="research-hub-explanation">
            Ask AI to summarize evidence, compare guideline recommendations, or generate an evidence
            brief with protocol and simulation links. Verify source documents before use.
          </p>
        )}
      </section>
    </main>
  );
}
