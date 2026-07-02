import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ToolsOverview from './ToolsOverview';

type ToolsFilteredConsoleProps = {
  source: string;
  filter?: string;
  q?: string;
  open?: string;
};

export default function ToolsFilteredConsole({
  source,
  filter,
  q,
  open,
}: ToolsFilteredConsoleProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    let changed = false;

    if (!next.has('source')) {
      next.set('source', source);
      changed = true;
    }
    if (filter && !next.has('filter')) {
      next.set('filter', filter);
      changed = true;
    }
    if (q && !next.has('q')) {
      next.set('q', q);
      changed = true;
    }
    if (open && !next.has('open')) {
      next.set('open', open);
      changed = true;
    }

    if (changed) {
      setSearchParams(next, { replace: true });
    }
  }, [filter, open, q, searchParams, setSearchParams, source]);

  return <ToolsOverview />;
}