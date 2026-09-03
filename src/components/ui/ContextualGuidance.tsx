import { useCallback, useState } from 'react';
import { InfoNotice } from './CareDroidPrimitives';
import { CONTEXTUAL_GUIDANCE_DISMISS_KEY } from '../../config/careDroidInteractionModel';
import { useHelpHub } from '../../contexts/HelpHubContext';
import './ContextualGuidance.css';

type ContextualGuidanceProps = Readonly<{
  id: string;
  title: string;
  detail?: string;
  tone?: 'info' | 'warning' | 'ai';
  action?: React.ReactNode;
  dismissible?: boolean;
  className?: string;
  /** Opens HelpHub to the linked procedure topic */
  helpTopicId?: string;
}>;

function readDismissedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(CONTEXTUAL_GUIDANCE_DISMISS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistDismissed(id: string): void {
  try {
    const next = readDismissedIds();
    next.add(id);
    sessionStorage.setItem(CONTEXTUAL_GUIDANCE_DISMISS_KEY, JSON.stringify([...next]));
  } catch {
    // sessionStorage unavailable
  }
}

export default function ContextualGuidance({
  id,
  title,
  detail,
  tone = 'info',
  action,
  dismissible = true,
  className = '',
  helpTopicId,
}: ContextualGuidanceProps) {
  const { openHelp } = useHelpHub();
  const [visible, setVisible] = useState(() => !readDismissedIds().has(id));

  const dismiss = useCallback(() => {
    persistDismissed(id);
    setVisible(false);
  }, [id]);

  if (!visible) return null;

  return (
    <InfoNotice
      label={title}
      detail={detail}
      tone={tone === 'ai' ? 'info' : tone}
      className={['cd-contextual-guidance', `cd-contextual-guidance--${tone}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="cd-contextual-guidance__footer">
        {action}
        {helpTopicId ? (
          <button
            type="button"
            className="cd-contextual-guidance__help-link"
            onClick={() => openHelp({ tab: 'page', topicId: helpTopicId })}
          >
            Open guide
          </button>
        ) : null}
        {dismissible ? (
          <button type="button" className="cd-contextual-guidance__dismiss" onClick={dismiss}>
            Dismiss
          </button>
        ) : null}
      </div>
    </InfoNotice>
  );
}
