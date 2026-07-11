# RAG Hybrid Retrieval & Citation Entailment v1 (PR-5)

| Field | Value |
|-------|--------|
| **Version** | `1.0.0` |
| **Date** | `2026-07-11` |
| **Pure libs** | `lib/rag/hybridRetrieval.ts`, `lib/rag/citationEntailment.ts` |
| **Backend** | `RetrievalService`, `CitationService`, `RAGService` |

## Hybrid retrieval

Default path (`hybrid !== false`):

1. Over-fetch dense vector matches (`topK * 3`, softer minScore)
2. Apply knowledge-registry metadata filters (specialty, jurisdiction, evidence grade, expiry, `ragIngestAllowed`)
3. **RRF-style fusion** of vector rank + lexical TF overlap rank
4. Blend scores → return topK

Disable per call: `retrieve(query, { hybrid: false })`.

## Citation entailment

`CitationService.groundAnswer(text, chunks, { stripUnsupported: true })`:

- Splits answer into sentences
- Token-overlap entailment vs retrieved chunk text
- Strips unsupported clinical-looking sentences (safe default)
- Returns `unsupportedRate` for monitoring

Also: `scoreClaims`, `scoreSingleClaim`.

## Registry enrichment at ingest

`RAGService.ingest` loads `data/knowledge-registry/artifacts/*` and merges:

- `artifactId`, `evidenceGrade`, `jurisdiction`, `reviewStatus`, `expiresAt`, `license`, `topic`

into chunk metadata when a match is found (by id/title/path).

Ingest remains gated by PR-2 (`KNOWLEDGE_REGISTRY_GATE`).

## Filters on retrieve

```ts
await ragService.retrieve(query, {
  topK: 5,
  specialty: 'emergency medicine',
  jurisdiction: 'US-oriented_educational',
  evidenceGrade: ['summary', 'A', 'B'],
  excludeExpired: true,
  hybrid: true,
});
```

## Tests

```bash
node node_modules/vitest/vitest.mjs run lib/rag --reporter=dot
# backend (from backend/):
# jest src/modules/rag/citation.service.spec.ts src/modules/rag/retrieval.service.spec.ts
```

## Limits (honest)

- Lexical scorer is TF overlap, not BM25+full corpus inverted index
- Entailment is token overlap, not neural NLI
- Pinecone still dense-first; hybrid re-ranks the candidate set (not full dual index)
