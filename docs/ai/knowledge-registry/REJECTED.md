# Knowledge registry — rejected materials log

| Field | Value |
|-------|--------|
| **Version** | `1.0.0` |
| **Updated** | `2026-07-11` |
| **Policy** | `data/knowledge-registry/policy.json` |

Materials listed here **must not** be ingested into the RAG vector index or cited as clinical evidence grade A–C.

Machine-readable rejection stubs: `data/knowledge-registry/rejected/*.json`.

---

## Rejection criteria (summary)

| Code | Meaning |
|------|---------|
| `missing_license` | No clear license / permitted use |
| `license_not_allowed` | License not in policy allowlist |
| `content_hash_mismatch` | File bytes do not match registered hash |
| `duplicate_content_hash` | Same body already registered under another id |
| `expired_without_revalidation` | Past `expires_at` without re-review |
| `community_forum_as_clinical_evidence` | Forums/social used as clinical authority |
| `promotional_or_unverifiable` | Marketing, affiliate, or unverifiable claims |
| `copyrighted_full_text_without_permission` | Full copyrighted corpus dump without rights |
| `jurisdiction_unlabeled_for_protocol` | Institutional protocol without jurisdiction label |

Community discussions may be used **only** as workflow-discovery labels (not evidence grade A–C).

---

## Rejected entries

### 1. Anonymous forum sepsis advice (illustrative)

| Field | Value |
|-------|--------|
| **Stub id** | `kn-reddit-sepsis-thread-v1` |
| **URL pattern** | `reddit.com` (denylist) |
| **Reason** | `community_forum_as_clinical_evidence`; missing license; unverifiable authorship |
| **Date** | 2026-07-11 |
| **File** | `data/knowledge-registry/rejected/rej-reddit-sepsis-thread-v1.json` |

### 2. Sponsored anticoagulant blog (illustrative)

| Field | Value |
|-------|--------|
| **Stub id** | `kn-promotional-anticoagulant-blog-v1` |
| **URL pattern** | affiliate / shop / coupon |
| **Reason** | `promotional_or_unverifiable` |
| **Date** | 2026-07-11 |
| **File** | `data/knowledge-registry/rejected/rej-promotional-drug-blog-v1.json` |

---

## How to add a rejection

1. Do **not** copy full copyrighted text into the repo.  
2. Add a stub under `data/knowledge-registry/rejected/` with `review_status: rejected` and clear `reject_reason`.  
3. Append a row/section to this file.  
4. Run `npm run verify:knowledge-registry`.  

---

## Accepted seed note

v1 **accepted** artifacts under `data/knowledge-registry/artifacts/` are CareDroid-authored educational digests (`evidence_grade: summary`). They are **not** full AHA/SSC primary publications. Do not present them as universally valid institutional protocols.
