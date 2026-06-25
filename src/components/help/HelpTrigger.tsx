import { dispatchOpenHelpHub } from '../../contexts/HelpHubContext';
import './HelpHub.css';

type HelpTriggerProps = {
  variant?: 'pill' | 'button' | 'icon';
  className?: string;
  tab?: 'page' | 'role' | 'process' | 'topics' | 'shortcuts';
  topicId?: string;
  label?: string;
};

export default function HelpTrigger({
  variant = 'button',
  className = '',
  tab = 'page',
  topicId,
  label = 'Guide',
}: HelpTriggerProps) {
  const handleClick = () => {
    dispatchOpenHelpHub({ tab, topicId });
  };

  if (variant === 'pill') {
    return (
      <button
        type="button"
        className={['session-chrome-bar__pill', 'help-trigger--pill', className].filter(Boolean).join(' ')}
        onClick={handleClick}
        title="Open CareDroid process guide (?)"
      >
        {label}
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        className={['caredroid-header__action', 'help-trigger--icon', className].filter(Boolean).join(' ')}
        onClick={handleClick}
        aria-label="Open CareDroid guide"
        title="Guide — process & procedures (?)"
      >
        ?
      </button>
    );
  }

  return (
    <button
      type="button"
      className={['help-trigger', className].filter(Boolean).join(' ')}
      onClick={handleClick}
    >
      {label}
    </button>
  );
}