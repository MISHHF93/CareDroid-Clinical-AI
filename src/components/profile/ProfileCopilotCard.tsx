import React, { useMemo } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import useProfileShellProps from '../../hooks/useProfileShellProps';
import { GraphicIconBadge } from '../graphics/CdlGraphicKit';
import {
  profileHasCopilotCapture,
  resolveCopilotChromeLabels,
  resolveProfileOverviewCard,
} from '../../config/profileDesignLanguage.config';

export default function ProfileCopilotCard() {
  const { profileCopy } = useProfileShellProps();
  const setCopilotOpen = useEmergencyStore((state) => state.setCopilotOpen);
  const cardCopy = resolveProfileOverviewCard('copilot');
  const copilotLabels = useMemo(() => resolveCopilotChromeLabels(profileCopy), [profileCopy]);

  if (!profileHasCopilotCapture(profileCopy)) {
    return null;
  }

  return (
    <div className="profile-overview-card profile-copilot-card">
      <div className="profile-section-header">
        <div className="profile-section-header__lead">
          <GraphicIconBadge iconKey="ed-copilot" accent="brand" size="md" />
          <div>
            <h3>{cardCopy.title}</h3>
          </div>
        </div>
      </div>
      <p>{profileCopy.copilotIntro}</p>
      <button
        type="button"
        className="profile-copilot-card__cta"
        onClick={() => setCopilotOpen(true)}
        aria-label={copilotLabels.openAriaLabel}
      >
        {cardCopy.ctaLabel || copilotLabels.openAriaLabel}
      </button>
    </div>
  );
}
