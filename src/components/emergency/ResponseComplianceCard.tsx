import './ResponseComplianceCard.css';

export type ComplianceAlert = {
  createdAt: string | Date;
  acknowledgedAt?: string | Date | null;
  severity: string;
};

function calcCompliance(alerts: ComplianceAlert[], targetMs: number): {
  rate: number;
  compliant: number;
  total: number;
  pending: number;
} {
  const critical = alerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'high',
  );
  if (!critical.length) return { rate: 100, compliant: 0, total: 0, pending: 0 };

  const compliant = critical.filter((a) => {
    if (!a.acknowledgedAt) return false;
    return (
      new Date(a.acknowledgedAt).getTime() - new Date(a.createdAt).getTime() <= targetMs
    );
  });
  const pending = critical.filter((a) => !a.acknowledgedAt).length;
  const rate = Math.round((compliant.length / critical.length) * 100);
  return { rate, compliant: compliant.length, total: critical.length, pending };
}

function toneFromRate(rate: number): 'green' | 'amber' | 'red' {
  if (rate >= 80) return 'green';
  if (rate >= 50) return 'amber';
  return 'red';
}

export type ResponseComplianceCardProps = {
  alerts: ComplianceAlert[];
  targetMinutes?: number;
  className?: string;
};

export default function ResponseComplianceCard({
  alerts,
  targetMinutes = 3,
  className = '',
}: ResponseComplianceCardProps) {
  const { rate, compliant, total, pending } = calcCompliance(alerts, targetMinutes * 60 * 1000);
  const tone = toneFromRate(rate);

  return (
    <article
      className={['response-compliance-card', `response-compliance-card--${tone}`, className].filter(Boolean).join(' ')}
      aria-label={`3-minute response compliance: ${total ? `${rate}%` : 'No critical alerts today'}`}
    >
      <div className="response-compliance-card__head">
        <span className="response-compliance-card__label">3-Min Response Compliance</span>
        <span className={`response-compliance-card__rag response-compliance-card__rag--${tone}`}>
          {tone === 'green' ? 'On track' : tone === 'amber' ? 'At risk' : 'Below target'}
        </span>
      </div>
      <strong className="response-compliance-card__rate">
        {total ? `${rate}%` : '—'}
      </strong>
      <p className="response-compliance-card__detail">
        {total
          ? `${compliant}/${total} critical alerts acknowledged within ${targetMinutes} min`
          : 'No critical alerts this shift'}
      </p>
      {pending > 0 && (
        <small className="response-compliance-card__pending">
          {pending} pending — unacknowledged now
        </small>
      )}
    </article>
  );
}
