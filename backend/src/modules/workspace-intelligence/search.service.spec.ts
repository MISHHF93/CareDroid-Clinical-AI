import { SearchService } from './search.service';

describe('SearchService', () => {
  const service = new SearchService();

  it('searches across workspace operating-system surfaces', () => {
    const results = service.search({ query: 'digital twin' });
    expect(results.map((result) => result.path)).toContain('/digital-twin');
  });

  it('filters by workspace and category', () => {
    const results = service.search({ workspaceId: 'emergency', category: 'workflow' });
    expect(results).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'workflow:chest-pain' })]),
    );
    expect(results.every((result) => result.workspaceIds.includes('emergency'))).toBe(true);
  });
});
