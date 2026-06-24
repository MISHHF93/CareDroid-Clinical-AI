import { useState } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import SelfCheckin from '../../components/reception/SelfCheckin';
import type { IntakeHandoffResult } from '../../services/receptionHandoff';
import { completeSelfCheckinWhiteboardHandoff } from '../../services/selfCheckinWhiteboardHandoff';
import type { SelfCheckinBuildResult } from '../../services/selfCheckinService';

export default function SelfArrivalCheckIn() {
  const [handoff, setHandoff] = useState<IntakeHandoffResult | null>(null);

  const handleComplete = (result: SelfCheckinBuildResult) => {
    const nextHandoff = completeSelfCheckinWhiteboardHandoff(useEmergencyStore.getState(), result, {
      syncToBackend: false,
      actorName: 'self-arrival',
    });
    setHandoff(nextHandoff);
  };

  return (
    <SelfCheckin
      kioskMode
      onComplete={handleComplete}
      handoff={handoff}
      showStaffHandoffLink
    />
  );
}