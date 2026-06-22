import React from 'react';
import { resolveOperationalPresentation } from '../../config/emergencyOperationalPresentationModel';
import './OperationalPresentationFrame.css';

export default function OperationalPresentationFrame({
  screenMode,
  children,
  className = '',
  as: Element = 'div',
  title = null,
  subtitle = null,
  eyebrow = null,
  showHeader = false,
  ...props
}) {
  const profile = resolveOperationalPresentation(screenMode);

  return (
    <Element
      className={[
        'operational-presentation-frame',
        `operational-presentation-frame--density-${profile.density}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-screen-mode={profile.screenMode}
      data-operational-emphasis={profile.emphasis}
      {...props}
    >
      {showHeader ? (
        <header className="operational-presentation-frame__header">
          <p className="operational-presentation-frame__eyebrow">
            {eyebrow ?? profile.pageEyebrow}
          </p>
          <h1 className="operational-presentation-frame__title">{title ?? profile.pageTitle}</h1>
          <p className="operational-presentation-frame__subtitle">
            {subtitle ?? profile.pageSubtitle}
          </p>
        </header>
      ) : null}
      {children}
    </Element>
  );
}
