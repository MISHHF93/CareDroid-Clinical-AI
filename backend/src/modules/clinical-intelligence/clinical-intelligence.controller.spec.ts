import { ClinicalIntelligenceController } from './clinical-intelligence.controller';

/**
 * queryGuidelineEvidence used to scope the RAG lookup with
 * req.user?.profile?.organizationId instead of req.tenantContext?.organizationId
 * -- the pattern every other tenant-scoped route on this controller (and ~80
 * other call sites app-wide) uses. UserProfile.organizationId is nullable and
 * can lag behind the broader membership/workspace-resolved tenantContext, and
 * rag.service.ts's buildRetrievalFilter fails OPEN (returns every org's
 * privately-ingested guideline documents) whenever organizationId is
 * undefined -- so a user with a null profile.organizationId but a correctly
 * resolved tenantContext got other orgs' guideline documents in their results.
 */
describe('ClinicalIntelligenceController.queryGuidelineEvidence', () => {
  it('scopes the RAG query with req.tenantContext.organizationId, not req.user.profile.organizationId', async () => {
    const queryGuidelineEvidence = jest.fn().mockResolvedValue({ citations: [] });
    const controller = new ClinicalIntelligenceController({
      queryGuidelineEvidence,
    } as any);

    const req = {
      user: { id: 'user-1', profile: { organizationId: null } },
      tenantContext: { organizationId: 'org-a' },
      ip: '127.0.0.1',
      headers: {},
    } as any;
    const dto = { query: 'sepsis management' } as any;

    await controller.queryGuidelineEvidence(dto, req);

    expect(queryGuidelineEvidence).toHaveBeenCalledWith(
      'user-1',
      dto,
      expect.objectContaining({ ipAddress: '127.0.0.1' }),
      'org-a',
    );
  });
});
