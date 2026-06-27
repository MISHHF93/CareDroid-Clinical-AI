import React from 'react';
import './SplitLayout.css';

type SpaceScale = 0 | 2 | 4 | 6 | 8;

type SplitLayoutProps = {
  sidebar: React.ReactNode;
  main: React.ReactNode;
  sidebarWidth?: string;
  sidebarSide?: 'left' | 'right';
  gap?: SpaceScale;
  collapsed?: boolean;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function SplitLayout({ sidebar, main, sidebarWidth, sidebarSide = 'left', gap = 0, collapsed, className, style, ...props }: SplitLayoutProps) {
  const gapVar = gap === 0 ? '0px' : `var(--cd-space-${gap})`;
  return (
    <div
      className={[
        'cd-split',
        sidebarSide === 'right' ? 'cd-split--right' : '',
        collapsed ? 'cd-split--collapsed' : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
      style={{ '--split-sidebar-width': sidebarWidth, '--split-gap': gapVar, ...style } as React.CSSProperties}
      {...props}
    >
      {sidebarSide === 'left' ? (
        <>
          <aside className="cd-split__sidebar">{sidebar}</aside>
          <main className="cd-split__main">{main}</main>
        </>
      ) : (
        <>
          <main className="cd-split__main">{main}</main>
          <aside className="cd-split__sidebar">{sidebar}</aside>
        </>
      )}
    </div>
  );
}
