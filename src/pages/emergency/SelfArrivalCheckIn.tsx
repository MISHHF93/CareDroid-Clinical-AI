import { useState } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import SelfCheckin from '../../components/reception/SelfCheckin';
import type { IntakeHandoffResult } from '../../services/receptionHandoff';
import { completeSelfCheckinWhiteboardHandoff } from '../../services/selfCheckinWhiteboardHandoff';
import type { SelfCheckinBuildResult } from '../../services/selfCheckinService';

export default function SelfArrivalCheckIn() {
  const [handoff, setHandoff] = useState<IntakeHandoffResult | null>(null);

  const handleComplete = async (result: SelfCheckinBuildResult) => {
    const outcome = await completeSelfCheckinWhiteboardHandoff(useEmergencyStore.getState(), result, {
      actorName: 'self-arrival',
    });
    setHandoff(outcome.handoff);
    return { ok: outcome.backendSynced };
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