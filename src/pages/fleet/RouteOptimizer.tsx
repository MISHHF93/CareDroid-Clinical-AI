import ClinicalDecisionSupportDisclaimer from '../../components/clinical/ClinicalDecisionSupportDisclaimer';

const ROUTE_SAFETY_COPY =
  'Decision support only. This tool does not dispatch vehicles or override human fleet command authority.';

export default function RouteOptimizer() {
  return (
    <main>
      <h1>Route Optimization</h1>
      <p>CareDroid enterprise healthcare platform.</p>
      <ClinicalDecisionSupportDisclaimer />
      <p className="fleet-safety-notice">{ROUTE_SAFETY_COPY}</p>
    </main>
  );
}