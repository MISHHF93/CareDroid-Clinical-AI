type SkeletonLoaderProps = {
  variant?: 'whiteboard' | 'panel' | 'card';
  rows?: number;
};

const shimmerStyle = {
  background: 'linear-gradient(90deg, #111827 0%, #1F2937 45%, #111827 90%)',
  backgroundSize: '220% 100%',
  animation: 'caredroid-skeleton-shimmer 1.15s ease-in-out infinite',
};

export default function SkeletonLoader({ variant = 'panel', rows = 3 }: SkeletonLoaderProps) {
  const cardCount = variant === 'whiteboard' ? 6 : rows;

  return (
    <div role="status" aria-busy="true" aria-label="Loading" style={{ padding: 16 }}>
      <style>
        {`
          @keyframes caredroid-skeleton-shimmer {
            0% { background-position: 120% 0; }
            100% { background-position: -120% 0; }
          }
        `}
      </style>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: variant === 'whiteboard' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr',
          gap: 12,
        }}
      >
        {Array.from({ length: cardCount }).map((_, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #1F2937',
              borderRadius: 12,
              background: '#0B1120',
              padding: 14,
              minHeight: variant === 'card' || variant === 'whiteboard' ? 120 : 72,
            }}
          >
            <div style={{ ...shimmerStyle, width: '46%', height: 16, borderRadius: 999 }} />
            <div style={{ ...shimmerStyle, width: '72%', height: 12, borderRadius: 999, marginTop: 14 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 18 }}>
              <div style={{ ...shimmerStyle, height: 18, borderRadius: 8 }} />
              <div style={{ ...shimmerStyle, height: 18, borderRadius: 8 }} />
              <div style={{ ...shimmerStyle, height: 18, borderRadius: 8 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
