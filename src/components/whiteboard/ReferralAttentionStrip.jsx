import React, { useMemo } from 'react';
import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';
import ChargeNurseOperationalStrip from './ChargeNurseOperationalStrip';
import { buildReferralAttentionStripMetrics } from './referralAwarenessModel';
import './ChargeNurseOperationalStrip.css';

export default function ReferralAttentionStrip({
  referrals = [],
  onMetricSelect,
  readOnly = false,
}) {
  const metrics = useMemo(() => buildReferralAttentionStripMetrics(referrals), [referrals]);
  const clearCopy = EMPTY_STATE_COPY.strips.referralClear;

  return (
    <ChargeNurseOperationalStrip
      metrics={metrics}
      eyebrow="Referrals"
      className="charge-nurse-operational-strip--referral"
      onMetricSelect={onMetricSelect}
      readOnly={readOnly}
      emptyLabel={clearCopy.label}
      emptyHint={clearCopy.hint}
    />
  );
}
