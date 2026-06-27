import React from 'react';
import './clinical.css';

type CitationCardProps = {
  num?: number;
  title: string;
  source?: string;
  url?: string;
  className?: string;
};

export function CitationCard({ num, title, source, url, className }: CitationCardProps) {
  const titleEl = url
    ? <a href={url} target="_blank" rel="noopener noreferrer" className="cd-citation__title">{title}</a>
    : <span className="cd-citation__title">{title}</span>;

  return (
    <div className={['cd-citation', className ?? ''].filter(Boolean).join(' ')}>
      {num != null && <span className="cd-citation__num">[{num}]</span>}
      <div className="cd-citation__body">
        {titleEl}
        {source && <div className="cd-citation__src">{source}</div>}
      </div>
    </div>
  );
}
