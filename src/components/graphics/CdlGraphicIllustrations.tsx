import type { EmptyStateGraphicVariant } from '../../config/cdlGraphicModel';

type IllustrationProps = {
  variant?: EmptyStateGraphicVariant;
  className?: string;
};

export function CdlEmptyIllustration({ variant = 'generic', className = '' }: IllustrationProps) {
  return (
    <svg
      className={['cdl-graphic-illustration', `cdl-graphic-illustration--${variant}`, className]
        .filter(Boolean)
        .join(' ')}
      viewBox="0 0 120 96"
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id="cdl-illus-accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--cdl-graphic-accent-start, #0ea5e9)" />
          <stop offset="100%" stopColor="var(--cdl-graphic-accent-end, #6366f1)" />
        </linearGradient>
        <linearGradient id="cdl-illus-soft" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--cdl-graphic-soft-start, #e0f2fe)" />
          <stop offset="100%" stopColor="var(--cdl-graphic-soft-end, #ede9fe)" />
        </linearGradient>
      </defs>
      <rect x="8" y="12" width="104" height="72" rx="14" fill="url(#cdl-illus-soft)" />
      {variant === 'queue' ? (
        <>
          <circle cx="36" cy="44" r="10" fill="url(#cdl-illus-accent)" opacity="0.85" />
          <rect x="54" y="36" width="42" height="6" rx="3" fill="currentColor" opacity="0.18" />
          <rect x="54" y="48" width="30" height="6" rx="3" fill="currentColor" opacity="0.12" />
          <path
            d="M24 68h72"
            stroke="url(#cdl-illus-accent)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.5"
          />
        </>
      ) : null}
      {variant === 'patients' ? (
        <>
          <circle cx="44" cy="40" r="12" fill="url(#cdl-illus-accent)" opacity="0.9" />
          <path
            d="M28 68c4-10 12-14 16-14s12 4 16 14"
            fill="none"
            stroke="url(#cdl-illus-accent)"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.7"
          />
          <circle cx="78" cy="42" r="8" fill="currentColor" opacity="0.14" />
        </>
      ) : null}
      {variant === 'alerts' ? (
        <>
          <path d="M60 24 L78 64 H42 Z" fill="url(#cdl-illus-accent)" opacity="0.82" />
          <circle cx="60" cy="58" r="3" fill="#fff" />
          <rect x="30" y="70" width="60" height="6" rx="3" fill="currentColor" opacity="0.14" />
        </>
      ) : null}
      {variant === 'tools' ? (
        <>
          <rect
            x="34"
            y="30"
            width="52"
            height="36"
            rx="8"
            fill="url(#cdl-illus-accent)"
            opacity="0.78"
          />
          <rect x="42" y="38" width="18" height="6" rx="2" fill="#fff" opacity="0.9" />
          <rect x="42" y="48" width="28" height="4" rx="2" fill="#fff" opacity="0.55" />
        </>
      ) : null}
      {variant === 'copilot' ? (
        <>
          <circle cx="60" cy="42" r="18" fill="url(#cdl-illus-accent)" opacity="0.82" />
          <path
            d="M48 58c6 8 18 8 24 0"
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.85"
          />
          <circle cx="52" cy="38" r="2.5" fill="#fff" />
          <circle cx="68" cy="38" r="2.5" fill="#fff" />
        </>
      ) : null}
      {variant === 'generic' ? (
        <>
          <rect
            x="30"
            y="30"
            width="60"
            height="40"
            rx="10"
            fill="url(#cdl-illus-accent)"
            opacity="0.72"
          />
          <circle cx="46" cy="46" r="6" fill="#fff" opacity="0.9" />
          <rect x="56" y="42" width="24" height="4" rx="2" fill="#fff" opacity="0.7" />
          <rect x="56" y="50" width="16" height="4" rx="2" fill="#fff" opacity="0.45" />
        </>
      ) : null}
    </svg>
  );
}

export function CdlGraphicMotif({
  motif = 'pulse',
  className = '',
}: {
  motif?: string;
  className?: string;
}) {
  return (
    <svg
      className={['cdl-graphic-motif', `cdl-graphic-motif--${motif}`, className]
        .filter(Boolean)
        .join(' ')}
      viewBox="0 0 48 48"
      aria-hidden
    >
      <circle cx="24" cy="24" r="22" fill="currentColor" opacity="0.08" />
      <circle cx="24" cy="24" r="14" fill="currentColor" opacity="0.12" />
      {motif === 'pulse' ? (
        <path
          d="M10 24h8l4-10 6 20 6-14 4 4h10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
      ) : null}
      {motif === 'alert' ? (
        <path d="M24 10 L36 34 H12 Z" fill="currentColor" opacity="0.45" />
      ) : null}
      {motif === 'route' ? (
        <path
          d="M14 30c8-14 12-14 20 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.5"
        />
      ) : null}
    </svg>
  );
}
