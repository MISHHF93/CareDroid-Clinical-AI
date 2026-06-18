import React, { useMemo } from 'react';
import ChargeNurseOperationalStrip from './ChargeNurseOperationalStrip';
import { buildReferralAttentionStripMetrics } from './referralAwarenessModel';
import './ChargeNurseOperationalStrip.css';

export default function ReferralAttentionStrip({
  referrals = [],
  onMetricSelect,
  readOnly = false,
}) {
  const metrics = useMemo(() => buildReferralAttentionStripMetrics(referrals), [referrals]);

  return (
    <ChargeNurseOperationalStrip
      metrics={metrics}
      eyebrow="Referrals"
      className="charge-nurse-operational-strip--referral"
      onMetricSelect={onMetricSelect}
      readOnly={readOnly}
    />
  );
}
