import './Badge.css';

const TONES = new Set(['neutral', 'accent', 'success', 'warning', 'danger', 'info']);

export default function Badge({ tone = 'neutral', size = 'md', className = '', children, ...props }) {
  const resolvedTone = TONES.has(tone) ? tone : 'neutral';
  return (
    <span className={['cd-badge', `cd-badge--${resolvedTone}`, `cd-badge--${size}`, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </span>
  );
}
