import ClinicalDecisionSupportDisclaimer from '../../components/clinical/ClinicalDecisionSupportDisclaimer';

const FLEET_SAFETY_COPY =
  'Decision support only. Human operators retain authority over dispatch, routing, and maintenance actions.';

export default function FleetDashboard() {
  return (
    <main>
      <h1>Fleet Summary</h1>
      <p>CareDroid enterprise healthcare platform.</p>
      <ClinicalDecisionSupportDisclaimer />
      <p className="fleet-safety-notice">{FLEET_SAFETY_COPY}</p>
    </main>
  );
}