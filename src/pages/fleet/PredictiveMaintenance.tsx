import ClinicalDecisionSupportDisclaimer from '../../components/clinical/ClinicalDecisionSupportDisclaimer';

const MAINTENANCE_SAFETY_COPY =
  'Decision support only. Maintenance recommendations require human review before work orders or downtime actions.';

export default function PredictiveMaintenance() {
  return (
    <main>
      <h1>Predictive Maintenance</h1>
      <p>CareDroid enterprise healthcare platform.</p>
      <ClinicalDecisionSupportDisclaimer />
      <p className="fleet-safety-notice">{MAINTENANCE_SAFETY_COPY}</p>
    </main>
  );
}