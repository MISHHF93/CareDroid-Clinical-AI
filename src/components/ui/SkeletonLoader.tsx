import './SkeletonLoader.css';

type SkeletonLoaderProps = {
  variant?: 'whiteboard' | 'panel' | 'card';
  rows?: number;
};

export default function SkeletonLoader({ variant = 'panel', rows = 3 }: SkeletonLoaderProps) {
  const cardCount = variant === 'whiteboard' ? 6 : rows;
  const isTallCard = variant === 'card' || variant === 'whiteboard';

  return (
    <div role="status" aria-busy="true" aria-label="Loading" className="u-pad-16">
      <style>
        {`
          @keyframes caredroid-skeleton-shimmer {
            0% { background-position: 120% 0; }
            100% { background-position: -120% 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-caredroid-skeleton] * {
              animation: none !important;
            }
          }
        `}
      </style>
      <div
        data-caredroid-skeleton
        className={`skeleton-grid${variant === 'whiteboard' ? ' skeleton-grid--whiteboard' : ''}`}
      >
        {Array.from({ length: cardCount }).map((_, index) => (
          <div
            key={index}
            className={`skeleton-card${isTallCard ? ' skeleton-card--tall' : ''}`}
          >
            <div className="skeleton-shimmer skeleton-line--title" />
            <div className="skeleton-shimmer skeleton-line--subtitle" />
            <div className="skeleton-stats-row">
              <div className="skeleton-shimmer skeleton-stat" />
              <div className="skeleton-shimmer skeleton-stat" />
              <div className="skeleton-shimmer skeleton-stat" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
