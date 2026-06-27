import { AlertTriangle } from 'lucide-react';
import './AIComponents.css';

type MissingDataAlertProps = {
  items: string[];
  title?: string;
};

export function MissingDataAlert({ items, title = 'Missing data' }: MissingDataAlertProps) {
  const visibleItems = items.filter(Boolean);
  if (!visibleItems.length) return null;

  return (
    <div className="cd-ai-missing" role="status">
      <AlertTriangle aria-hidden="true" size={16} />
      <div>
        <strong>{title}</strong>
        <ul>
          {visibleItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
