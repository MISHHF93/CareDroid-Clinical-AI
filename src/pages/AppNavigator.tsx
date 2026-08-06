import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/card';
import { queryNavigator, type NavigatorDestination } from '../services/navigatorApi';
import './AppNavigator.css';

const EXAMPLE_QUERIES = [
  'where do I manage ambulances?',
  'where do I see patient queues?',
  'where do I check capacity?',
];

export default function AppNavigator() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [destinations, setDestinations] = useState<NavigatorDestination[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function runQuery(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 2) return;
    setStatus('loading');
    setErrorMessage('');
    const result = await queryNavigator(trimmed);
    if (!result.ok || !result.data) {
      setStatus('error');
      setErrorMessage(result.message || 'App navigator is unavailable right now.');
      return;
    }
    setAnswer(result.data.answer);
    setDestinations(result.data.destinations);
    setStatus('idle');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runQuery(query);
  }

  return (
    <div className="app-navigator-page">
      <header className="app-navigator-page__header">
        <p className="app-navigator-page__eyebrow">App navigator</p>
        <h1>Where do I find that?</h1>
        <p className="app-navigator-page__subtitle">
          Ask a workflow question in plain language and get grounded matches from the verified CareDroid route
          catalog. This never invents a route — every answer is drawn from real, live pages.
        </p>
      </header>

      <Card className="app-navigator-page__search-card">
        <form onSubmit={handleSubmit} className="app-navigator-page__form">
          <label htmlFor="app-navigator-query" className="app-navigator-page__label">
            Ask a question
          </label>
          <div className="app-navigator-page__input-row">
            <input
              id="app-navigator-query"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. where do I manage ambulances?"
              minLength={2}
              maxLength={500}
              autoComplete="off"
            />
            <button type="submit" disabled={status === 'loading' || query.trim().length < 2}>
              {status === 'loading' ? 'Searching…' : 'Search'}
            </button>
          </div>
          <div className="app-navigator-page__examples">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                type="button"
                className="app-navigator-page__example-chip"
                onClick={() => {
                  setQuery(example);
                  void runQuery(example);
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </form>
      </Card>

      {status === 'error' ? (
        <p className="app-navigator-page__error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {answer ? (
        <Card className="app-navigator-page__answer-card">
          <p>{answer}</p>
        </Card>
      ) : null}

      {destinations.length > 0 ? (
        <ul className="app-navigator-page__results">
          {destinations.map((destination) => (
            <li key={destination.id}>
              <Card className="app-navigator-page__result-card">
                {destination.navigable ? (
                  <Link to={destination.path} className="app-navigator-page__result-title">
                    {destination.label}
                  </Link>
                ) : (
                  <span className="app-navigator-page__result-title">{destination.label}</span>
                )}
                <p className="app-navigator-page__result-path">{destination.path}</p>
                <p className="app-navigator-page__result-description">{destination.description}</p>
                {destination.workflowOwner ? (
                  <p className="app-navigator-page__result-owner">Owner: {destination.workflowOwner}</p>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
