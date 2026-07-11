# CareDroid Knowledge Registry

Governed, versioned evidence catalog for RAG and clinical AI citations.

| Field | Value |
|-------|--------|
| **Registry version** | `1.0.0` |
| **Baseline companion** | [`../AI_BASELINE_REPORT_v1.md`](../AI_BASELINE_REPORT_v1.md) |
| **Index** | `data/knowledge-registry/index.json` |
| **Policy** | `data/knowledge-registry/policy.json` |
| **Schema** | `data/knowledge-registry/schema/knowledge-artifact.schema.json` |

## Principles

1. **No indiscriminate web scrape** — only authoritative, licensed, traceable sources.  
2. **Every accepted body has** title, publisher, license, hash, jurisdiction, evidence grade, review status, expiry, provenance.  
3. **Reject** promotional, forum-as-evidence, unlicensed full-text dumps, hash mismatches, unlabeled jurisdiction protocols.  
4. **LLMs cite registry ids** — they do not invent PMIDs.  
5. **Institutional protocols stay jurisdiction-scoped** — never presented as universal.

## Directory layout

```
data/knowledge-registry/
  index.json
  policy.json
  schema/knowledge-artifact.schema.json
  artifacts/          # accepted / pending (metadata)
  rejected/           # rejection stubs (no full bad content)
data/medical-knowledge/
  *.md                # allowed text bodies referenced by content_path
docs/ai/knowledge-registry/
  README.md
  REJECTED.md
```

## Accept a new source

1. Confirm license is in `policy.json` → `allowedLicenses` (or obtain legal approval to add a license).  
2. Place allowed text at a stable `content_path` (prefer `data/medical-knowledge/<topic>/`).  
3. Compute SHA-256 of file bytes.  
4. Author `data/knowledge-registry/artifacts/kn-<slug>-vN.json` per schema.  
5. Set `review_status` to `pending_review` until clinical/informatics sign-off, then `accepted` or `accepted_with_limitations`.  
6. Add id to `index.json` → `artifactIds`.  
7. Run `npm run verify:knowledge-registry`.  
8. Only then run RAG ingest (gate must pass).

## Validate / gate

```bash
# Full registry validation (hashes, licenses, duplicates, expiry)
npm run verify:knowledge-registry

# Gate a specific content file before ingest
node scripts/knowledge-registry-gate.mjs --file data/medical-knowledge/acls-cardiac-arrest.md
```

Exit code `0` = pass; non-zero = do not ingest.

## Seed set (v1)

| Artifact id | Topic | Grade | Status | RAG ingest |
|-------------|-------|-------|--------|------------|
| `kn-acls-cardiac-arrest-v1` | ACLS adult arrest | summary | accepted_with_limitations | yes |
| `kn-sepsis-hour-1-v1` | Sepsis Hour-1 | summary | accepted_with_limitations | yes |
| `kn-sofa-overview-v1` | SOFA overview | summary | accepted_with_limitations | yes |
| `kn-warfarin-aspirin-v1` | Drug interaction | summary | accepted_with_limitations | yes |
| `kn-stroke-fast-v1` | Stroke FAST | summary | accepted_with_limitations | yes |
| `kn-pediatric-fever-caution-v1` | Pediatric fever | summary | accepted_with_limitations | yes |
| `kn-pregnancy-ed-caution-v1` | Pregnancy ED | summary | accepted_with_limitations | yes |
| `kn-fhir-r4-citation-v1` | FHIR R4 standard | N/A | accepted_with_limitations | **no** (citation_only) |
| `kn-nemsis-citation-v1` | NEMSIS EMS standard | N/A | accepted_with_limitations | **no** (citation_only) |

Educational digests are **CareDroid internal summaries**, not full society guideline texts.  
**Citation-only** standards point at official publishers; full specs are not redistributed and are not RAG-ingested.

## Rejected materials

See [REJECTED.md](./REJECTED.md).
