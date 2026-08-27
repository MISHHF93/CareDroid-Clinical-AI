import { IntegrationHubService, WorkflowActionLogService } from './emergency-os.services';

/**
 * HEAL: IntegrationHubService.getIntegrationHub()'s 'fhir-demo' source used
 * to stamp `lastEventAt: new Date().toISOString()` -- the CURRENT request
 * time -- on every single call, so the "Last event" column in
 * IntegrationHubPage always read "just now" no matter whether any real FHIR
 * event had ever occurred. This is a demo/catalog row, not backed by any
 * persisted event, so it must honestly report no event instead of
 * fabricating a fresh timestamp on each call.
 */
describe('IntegrationHubService.getIntegrationHub (HEAL)', () => {
  it('reports lastEventAt: null for the fhir-demo source instead of a fabricated current timestamp', () => {
    const service = new IntegrationHubService(new WorkflowActionLogService());

    const envelope = service.getIntegrationHub();
    const fhirDemoSource = (envelope.data.sources as Array<Record<string, unknown>>).find(
      (source) => source.id === 'fhir-demo',
    );

    expect(fhirDemoSource).toBeDefined();
    expect(fhirDemoSource?.lastEventAt).toBeNull();
  });

  it('never returns a freshly-generated timestamp across repeated calls', () => {
    const service = new IntegrationHubService(new WorkflowActionLogService());

    const first = service.getIntegrationHub();
    const second = service.getIntegrationHub();

    const firstSource = (first.data.sources as Array<Record<string, unknown>>).find(
      (source) => source.id === 'fhir-demo',
    );
    const secondSource = (second.data.sources as Array<Record<string, unknown>>).find(
      (source) => source.id === 'fhir-demo',
    );

    expect(firstSource?.lastEventAt).toBeNull();
    expect(secondSource?.lastEventAt).toBeNull();
  });
});
