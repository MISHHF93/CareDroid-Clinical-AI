import React from 'react';
import './Grid.css';

type SpaceScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 10 | 12;
type GridCols = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto';

type GridProps = {
  cols?: GridCols;
  gap?: SpaceScale;
  rowGap?: SpaceScale;
  colGap?: SpaceScale;
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export function Grid({ cols = 12, gap, rowGap, colGap, as: Tag = 'div', className, children, style, ...props }: GridProps) {
  const isAuto = cols === 'auto';
  const colsVar = isAuto ? undefined : `${cols}`;
  const gapVar = (n?: SpaceScale) => n === undefined ? undefined : n === 0 ? '0px' : `var(--cd-space-${n})`;

  return (
    <Tag
      className={['cd-grid', isAuto ? 'cd-grid--auto' : '', className ?? ''].filter(Boolean).join(' ')}
      style={{
        '--grid-cols': colsVar,
        '--grid-gap': gapVar(gap),
        '--grid-row-gap': gapVar(rowGap),
        '--grid-col-gap': gapVar(colGap),
        ...style,
      } as React.CSSProperties}
      {...props}
    >
      {children}
    </Tag>
  );
}

type GridItemProps = {
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'full';
  rowSpan?: 1 | 2 | 3 | 4 | 5 | 6;
  colStart?: number;
  rowStart?: number;
  as?: React.ElementType;
  className?: string;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export function GridItem({ colSpan, rowSpan, colStart, rowStart, as: Tag = 'div', className, children, style, ...props }: GridItemProps) {
  return (
    <Tag
      className={['cd-grid-item', className ?? ''].filter(Boolean).join(' ')}
      style={{
        gridColumn: colSpan === 'full' ? '1 / -1' : colSpan ? `span ${colSpan}` : undefined,
        gridRow: rowSpan ? `span ${rowSpan}` : undefined,
        gridColumnStart: colStart,
        gridRowStart: rowStart,
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}
