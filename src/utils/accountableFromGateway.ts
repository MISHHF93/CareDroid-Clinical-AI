/**
 * Normalize gateway / copilot API payloads into AccountableRecommendation.
 * Prefers canonical CareDroidUnifiedAIResponse when present (Cycle 72).
 */
import {
  createAccountableRecommendation,
  createAiUnavailableAbstention,
  type AccountableRecommendation,
} from '../contracts/accountableAi';
import {
  accountableFromUnifiedResponse,
  extractUnifiedEnvelope,
} from '../services/unifiedAiEnvelope';

export function accountableFromGatewayPayload(
  payload: unknown,
  fallbackContent = '',
): AccountableRecommendation {
  const unified = extractUnifiedEnvelope(payload);
  if (unified) {
    const fromUnified = accountableFromUnifiedResponse(unified);
    if (!fromUnified.content.trim() && fallbackContent.trim()) {
      return createAccountableRecommendation({
        content: fallbackContent,
        evidence: fromUnified.evidence,
        confidence: fromUnified.confidence,
        uncertainty: fromUnified.uncertainty,
        model: fromUnified.model,
        promptVersion: fromUnified.promptVersion,
        safetyStatus: fromUnified.safety.status,
        safetyReasons: [...fromUnified.safety.reasons],
        humanReviewRequired: fromUnified.humanReviewRequired,
        requestId: fromUnified.provenance.requestId,
        tenantId: fromUnified.provenance.tenantId,
        corpusVersion: fromUnified.provenance.corpusVersion,
      });
    }
    return fromUnified;
  }

  const root = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const nested =
    root.accountableRecommendation && typeof root.accountableRecommendation === 'object'
      ? (root.accountableRecommendation as Record<string, unknown>)
      : root.metadata &&
          typeof root.metadata === 'object' &&
          (root.metadata as Record<string, unknown>).accountableRecommendation &&
          typeof (root.metadata as Record<string, unknown>).accountableRecommendation === 'object'
        ? ((root.metadata as Record<string, unknown>).accountableRecommendation as Record<
            string,
            unknown
          >)
        : null;

  if (nested) {
    const model = (
      nested.model && typeof nested.model === 'object'
        ? nested.model
        : { provider: 'caredroid', name: 'unknown' }
    ) as {
      provider?: string;
      name?: string;
      version?: string;
    };
    const safety = (
      nested.safety && typeof nested.safety === 'object'
        ? nested.safety
        : { status: 'ok', reasons: [] }
    ) as {
      status?: 'ok' | 'abstain' | 'escalate' | 'degraded';
      reasons?: string[];
    };
    const evidence = Array.isArray(nested.evidence) ? nested.evidence : [];

    return createAccountableRecommendation({
      content: String(nested.content ?? fallbackContent ?? ''),
      evidence: evidence.map((item: any, index: number) => ({
        sourceId: String(item?.sourceId || item?.id || `ev-${index}`),
        title: item?.title,
        citation: String(item?.citation || item?.text || item?.title || 'Source'),
        score: typeof item?.score === 'number' ? item.score : undefined,
        outdated: Boolean(item?.outdated),
      })),
      confidence:
        nested.confidence === null || nested.confidence === undefined
          ? null
          : Number(nested.confidence),
      uncertainty: typeof nested.uncertainty === 'string' ? nested.uncertainty : undefined,
      model: {
        provider: String(model.provider || 'caredroid'),
        name: String(model.name || 'unknown'),
        version: model.version ? String(model.version) : undefined,
      },
      promptVersion: String(nested.promptVersion || 'unknown'),
      safetyStatus: safety.status || 'ok',
      safetyReasons: Array.isArray(safety.reasons) ? safety.reasons.map(String) : [],
      humanReviewRequired: Boolean(nested.humanReviewRequired ?? true),
      corpusVersion:
        nested.provenance && typeof nested.provenance === 'object'
          ? (nested.provenance as { corpusVersion?: number | string }).corpusVersion
          : undefined,
      requestId:
        nested.provenance && typeof nested.provenance === 'object'
          ? (nested.provenance as { requestId?: string }).requestId
          : undefined,
      tenantId:
        nested.provenance && typeof nested.provenance === 'object'
          ? (nested.provenance as { tenantId?: string }).tenantId
          : undefined,
    });
  }

  // No accountable envelope — degrade to labeled assist with forced human review
  const content = String(
    root.content || root.answer || root.message || root.response || fallbackContent || '',
  );
  if (!content.trim()) {
    return createAiUnavailableAbstention({
      reason: 'empty_or_unstructured_ai_payload',
      provider: 'caredroid',
    });
  }

  return createAccountableRecommendation({
    content,
    evidence: [],
    confidence: typeof root.confidence === 'number' ? root.confidence : 0.4,
    model: { provider: 'caredroid', name: 'legacy-unstructured' },
    promptVersion: 'legacy@unstructured',
    safetyStatus: 'degraded',
    safetyReasons: ['missing_accountable_envelope'],
    humanReviewRequired: true,
  });
}
