import type { ReactNode } from 'react';
import type { EmergencyRoleActionPresentation } from '../../config/emergencyRoleActionMatrix';

type RoleActionGateProps = {
  presentation: EmergencyRoleActionPresentation;
  children: (props: {
    visible: boolean;
    enabled: boolean;
    readOnly: boolean;
    state: EmergencyRoleActionPresentation['state'];
  }) => ReactNode;
};

/**
 * Renders action UI only when role-action presentation allows visibility.
 * Prefer hidden over disabled for unauthorized destructive/clinical controls.
 */
export default function RoleActionGate({ presentation, children }: RoleActionGateProps) {
  if (!presentation.visible) return null;
  return (
    <>
      {children({
        visible: presentation.visible,
        enabled: presentation.enabled,
        readOnly: presentation.readOnly,
        state: presentation.state,
      })}
    </>
  );
}
