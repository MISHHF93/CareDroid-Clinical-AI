import { AssetRegistryService } from './asset-registry.service';

describe('AssetRegistryService', () => {
  const service = new AssetRegistryService();

  it('reports usage and orphan state', () => {
    const assets = service.listAssets();
    expect(assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'svg:hospital-floor', status: 'referenced' }),
        expect.objectContaining({ id: 'document:legacy-onboarding', status: 'orphan' }),
      ]),
    );
  });

  it('filters by asset type and query', () => {
    const assets = service.listAssets({ type: 'protocol', query: 'sepsis' });
    expect(assets).toEqual([expect.objectContaining({ id: 'protocol:sepsis' })]);
  });
});
