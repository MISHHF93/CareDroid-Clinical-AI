import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CUSTOMER_KNOWLEDGE_BASE_ARTICLES,
  KNOWLEDGE_BASE_CATEGORIES,
  getKnowledgeBaseCategoryLabel,
  searchCustomerKnowledgeBase,
} from '../data/customerKnowledgeBase';
import './KnowledgeBasePage.css';

export default function KnowledgeBasePage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const results = useMemo(
    () =>
      query.trim()
        ? searchCustomerKnowledgeBase(query, { category, limit: 20 })
        : CUSTOMER_KNOWLEDGE_BASE_ARTICLES.filter(
            (article) => category === 'all' || article.category === category,
          ),
    [category, query],
  );
  const featured = CUSTOMER_KNOWLEDGE_BASE_ARTICLES.slice(0, 3);

  return (
    <div className="knowledge-base-page">
      <header className="knowledge-base-hero">
        <div>
          <p className="knowledge-base-eyebrow">Customer training</p>
          <h1>Knowledge Base</h1>
          <p>
            Self-service training for onboarding, workflows, calculators, simulations,
            integrations, AI agents, and troubleshooting. The assistant searches these articles
            first when answering customer training questions.
          </p>
        </div>
        <div className="knowledge-base-hero-card">
          <span>Articles</span>
          <strong>{CUSTOMER_KNOWLEDGE_BASE_ARTICLES.length}</strong>
          <small>{KNOWLEDGE_BASE_CATEGORIES.length} training categories</small>
        </div>
      </header>

      <section className="knowledge-base-search" aria-label="Knowledge base search">
        <label>
          Search training content
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search onboarding, integrations, AI agents, troubleshooting..."
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {KNOWLEDGE_BASE_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {getKnowledgeBaseCategoryLabel(item)}
              </option>
            ))}
          </select>
        </label>
      </section>

      {!query.trim() && category === 'all' && (
        <section className="knowledge-base-featured" aria-label="Featured training">
          {featured.map((article) => (
            <article key={article.id}>
              <span>{getKnowledgeBaseCategoryLabel(article.category)}</span>
              <h2>{article.title}</h2>
              <p>{article.summary}</p>
              <Link to={article.route}>Open related area</Link>
            </article>
          ))}
        </section>
      )}

      <section className="knowledge-base-results" aria-label="Knowledge base articles">
        <header>
          <h2>{query.trim() ? 'Search Results' : 'All Training Articles'}</h2>
          <span>{results.length} articles</span>
        </header>
        <div className="knowledge-base-grid">
          {results.map((article) => (
            <article key={article.id} className="knowledge-base-article">
              <div>
                <span className="knowledge-base-category">
                  {getKnowledgeBaseCategoryLabel(article.category)}
                </span>
                <h3>{article.title}</h3>
                <p>{article.summary}</p>
              </div>
              <ol>
                {(article.steps || []).slice(0, 4).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className="knowledge-base-tags">
                {(article.tags || []).slice(0, 5).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <Link to={article.route}>Go to related feature</Link>
            </article>
          ))}
          {!results.length && (
            <div className="knowledge-base-empty" role="status">
              No training articles matched your search. Try a broader term like onboarding,
              integrations, workflow, or AI agents.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
