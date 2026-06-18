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
        <Search size={16} aria-hidden />
        <div>
          <strong>Patient search</strong>
          <p>
            {trimmedQuery
              ? (
                <>
                  Filtering queues for <strong>{trimmedQuery}</strong>. Use the header lookup to refine
                  or clear.
                </>
              )
              : 'Search by name, MRN, DOB, phone, or health card in the header lookup. Press / to focus instantly.'}
          </p>
        </div>
      </div>
      <button type="button" className="reception-search-hint__action" onClick={focusHeaderSearch}>
        {trimmedQuery ? 'Refine search' : 'Focus search'}
        <kbd aria-hidden>/</kbd>
      </button>
    </div>
  );
}
