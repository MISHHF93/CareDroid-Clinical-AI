import React from 'react';
import { Search } from 'lucide-react';
import './ReceptionSearchHint.css';

function focusHeaderSearch() {
  document.dispatchEvent(new Event('focus-reception-search'));
}

export default function ReceptionSearchHint({ query = '' }) {
  const trimmedQuery = String(query || '').trim();

  return (
    <div className="reception-search-hint">
      <div className="reception-search-hint__copy">
        <Search size={15} aria-hidden />
        <p>
          {trimmedQuery ? (
            <>
              Filtering for <strong>{trimmedQuery}</strong> — use header search for patient actions.
            </>
          ) : (
            <>
              Patient search in the header — press <kbd>/</kbd> to focus.
            </>
          )}
        </p>
      </div>
      <button type="button" className="reception-search-hint__action" onClick={focusHeaderSearch}>
        {trimmedQuery ? 'Refine' : 'Focus search'}
      </button>
    </div>
  );
}
