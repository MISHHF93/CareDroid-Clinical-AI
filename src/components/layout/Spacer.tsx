import React from 'react';

type SpaceScale = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 10 | 12 | 16 | 20 | 24;
type Axis = 'horizontal' | 'vertical' | 'both';

type SpacerProps = {
  size?: SpaceScale;
  axis?: Axis;
} & React.HTMLAttributes<HTMLSpanElement>;

export function Spacer({ size = 4, axis = 'vertical', style, ...props }: SpacerProps) {
  const val = `var(--cd-space-${size})`;
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        width: axis === 'vertical' ? undefined : val,
        height: axis === 'horizontal' ? undefined : val,
        flexShrink: 0,
        ...style,
      }}
      {...props}
    />
  );
}
