import React from 'react';
import { Search } from 'lucide-react';
import { RECEPTION_COPY } from './receptionCopy';
import './ReceptionSearchHint.css';

function focusHeaderSearch() {
  document.dispatchEvent(new Event('focus-reception-search'));
}

export default function ReceptionSearchHint({ query = '' }) {
  const trimmedQuery = String(query || '').trim();
  const copy = RECEPTION_COPY.search;

  return (
    <div className="reception-search-hint">
      <div className="reception-search-hint__copy">
        <Search size={15} aria-hidden />
        <p>
          {trimmedQuery ? (
            <>
              {copy.filtering} <strong>{trimmedQuery}</strong> {copy.filteringSuffix}
            </>
          ) : (
            <>
              {copy.idle} <kbd>/</kbd> {copy.focus.toLowerCase()}.
            </>
          )}
        </p>
      </div>
      <button type="button" className="reception-search-hint__action" onClick={focusHeaderSearch}>
        {trimmedQuery ? copy.refine : copy.focus}
      </button>
    </div>
  );
}
