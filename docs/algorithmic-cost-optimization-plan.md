# CareDroid Clinical AI Algorithmic Cost Optimization Plan

Generated: 2026-05-23

Scope: static audit of current frontend tool inventory, catalog search, launch routing, backend NLU/tool execution, RAG/guideline retrieval, patient timeline processing, AI usage, and fleet/vitals-oriented code. This plan intentionally avoids speculative algorithm swaps; it recommends indexes, caches, batching, and signal-processing only where the current data shape supports them.

## 1. Executive Summary

CareDroid can reduce latency, backend load, and paid AI/API usage with practical algorithmic changes, but most wins are not literal "make everything O(n log n)" rewrites. The highest-value changes are:

- Replace repeated linear membership checks and route scans with precomputed `Map`/`Set` indexes.
- Memoize stable frontend projections from the canonical tool inventory.
- Precompute normalized alias/search blobs for catalog and NLU matching.
- Add cache and in-flight request coalescing around stable backend metadata, RAG retrieval, embeddings, guideline answers, and repeated AI/tool requests.
- Add cost-aware execution routing so deterministic tools never call AI and repeated guideline/AI questions prefer cache or lower-cost routes before premium models.
- Add benchmarks that measure the actual paths users hit: catalog search, launch resolution, NLU matching, and backend executor lookup.

The codebase already has useful foundations. `src/data/toolInventory.js` caches the canonical inventory and an ID lookup. `src/routes/clinicalToolRoutes.js` already has `Set`s for known paths and calculator slugs. `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts` already resolves executors through `Set` and object lookups.

The main gaps are repeated projection/search work in the frontend, scan-heavy NLU keyword matching, uncached RAG embedding/retrieval calls, sequential per-category lab AI calls, repeated drug interaction AI calls for the same normalized medication set, and repeated subscription/usage DB reads for every AI request.

## 2. Current Complexity Risks

### Frontend Tool Inventory And Catalog

| Area | Current pattern | Complexity risk | Recommended fix |
|---|---|---:|---|
| `src/data/toolInventory.js` `buildRecordFromRegistry()` | Per registry row it calls `clinicalIntentTools.find()`, `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS.includes()`, alias helpers, and calculator lookup helpers. | Startup/import cost grows toward `O(registryCount * catalogCount)` if registries continue expanding. | Precompute maps and sets once: NLU profile by registry ID, primary NLU by registry ID, calculator by registry ID/slug/orchestrator ID, registered executor set, alias terms by registry ID. |
| `getUserFacingToolRegistryProjection()` | Rebuilds projection from canonical inventory on each call. | Repeated `O(n log n)` sort/projection work when called during renders. | Module-level memo for canonical inventory projections. |
| `getSidebarToolRegistryProjection()` | Rebuilds sidebar projection and order map on each call. | Repeated `O(n)` projection and sort during sidebar renders. | Module-level memo for canonical inventory projection and `ALL_REGISTRY_TOOL_IDS` order map. |
| `src/pages/tools/ToolsOverview.jsx` | Calls projection during render, builds `toolById`, uses array `.includes()` for workspace/pinned checks, runs multiple `tools.filter()` passes for counts and ordering. | User-facing render cost scales with tool count and workspace size. | Wrap derived values in `useMemo`; convert `workspaceToolIds`, `pinned`, `favorites`, and recent tool IDs to `Set`s. |
| `src/components/Sidebar.jsx` | Calls sidebar projection during render, builds `sidebarToolById`, filters by `workspaceToolIds.includes()`, evaluates active route with repeated `matchCalculatorRoute()`. | Sidebar rerenders repeat stable work. | Memoize projections and sets; cache active calculator match once per pathname. |
| `src/pages/tools/ClinicalToolCatalog.jsx` | Calls `getAllDiscoveredTools()` and summary helpers separately, then filters/sorts multiple sections. | Developer catalog can rescan and rebuild the same inventory several times per render. | Compute discovered rows, medical rows, summaries, filtered rows, and sorted rows once per query/filter/sort state. |
| `src/utils/catalogSearch.js` | Rebuilds medical/discovered search blobs per row per query; discovery rows may be enriched and searched, then enriched again for display. | Search typing repeats `O(rowCount * blobSize)` string work. | Precompute `searchBlob` and normalized category on enriched rows; memoize by row identity/version. |
| `src/routes/clinicalToolRoutes.js` and `src/navigation/registryToolLaunch.js` | `matchCalculatorRoute()` and slug-to-route lookup use `.find()` over calculator route definitions. | Small today, but route matching happens often and is easy to index. | Add `calculatorRouteByPath` and `calculatorRouteBySlug` maps. |
| `src/services/clinicalToolsApi.js` | Stable APIs such as `/api/tools`, `/api/tools/:id`, and `/api/tools/statistics` do not coalesce in-flight calls or cache short-lived responses. | Duplicate mounts can trigger duplicate backend requests. | Add TTL cache plus in-flight promise map for stable GETs. Keep payload validation uncached or debounce only. |

### Backend NLU And Tool Execution

| Area | Current pattern | Complexity risk | Recommended fix |
|---|---|---:|---|
| `backend/.../patterns/tool.patterns.ts` `matchToolPatterns()` | Scans every tool pattern and every keyword with `includes()`, then runs many post-filter passes. | `O(toolCount * keywordCount * messageLength)` plus repeated filtering. | Precompute normalized keywords, `Map<toolId, ToolPattern>`, and an inverted token/phrase index. Preserve current disambiguation tests. |
| `getToolPattern()` | Linear `.find()` by tool ID. | Small but called by extraction paths. | Replace with `TOOL_PATTERN_BY_ID.get(toolId)`. |
| Emergency/clinical pattern classifiers | Category-by-category keyword scans. | Same scan shape as NLU tools. | Shared compiled keyword matcher with category metadata. |
| `backend/.../tool-orchestrator.registry.ts` executor lookup | Already uses `Set`s and object maps for registered, alias, and registry ID lookups. | Low risk today. | Keep indexed lookup; add microbenchmark to lock p95 and prevent regressions as executors grow. |
| `backend/.../rag/reranking/cohere-ranker.service.ts` | `chunks.map((chunk) => ({ index: chunks.indexOf(chunk), ... }))`. | Avoidable `O(k^2)` in rerank document preparation. | Use `.map((chunk, index) => ...)`. |
| `backend/.../rag/rag.service.ts` `retrieve()` | Always embeds query, queries Pinecone, and optionally reranks. | Repeated guideline questions spend API dollars and latency every time. | Exact query cache, embedding cache, retrieval cache, and semantic answer cache keyed by normalized query/options/corpus version. |
| `OpenAIEmbeddingsService.healthCheck()` | Calls real embedding API for `"test"`. | Can become repeated paid traffic under frequent health checks. | Cache health status briefly or use a non-billable config check plus periodic active probe. |
| `LabInterpreterService.execute()` | Processes labs, groups by category, then sequentially calls AI per abnormal category. Later filters lab arrays again for summary counts. | Multiple passes over labs plus up to one AI call per category. | One-pass aggregation; batch abnormal categories into one structured AI request or use bounded concurrency with cache. |
| `DrugCheckerService.execute()` | Runs deterministic known-pair check, then calls AI for every valid request. | Repeated medication sets trigger repeated AI calls. | Canonical medication set hash and cache AI result; bypass AI only when deterministic rule coverage is sufficient for the requested mode. |
| `ClinicalIntelligenceService` timeline helpers | Normalizes encounter text in event and trend builders, then rejoins all text per trend direction. | Repeated string normalization/rejoin across encounters and rules. | Precompute normalized encounter text once and carry it through event/trend/progression builders. |
| `AIService.invokeLLM*()` and `generateStructuredJSON()` | Subscription lookup and daily usage count run per AI call. `getUsage()` loads all query rows then reduces in memory. | DB load grows with chat/tool volume. | Request-local or short-TTL subscription/usage counters; DB aggregate queries for count/sum. |

### Fleet, Route, Vitals, And Telemetry

| Area | Current pattern | Complexity risk | Recommended fix |
|---|---|---:|---|
| `src/services/routeOptimizationService.js` | Deterministic sort engine: normalize stops, sort by priority/window/distance, build baseline and optimized sequences. | Current cost is acceptable: `O(n log n)` sort plus linear sequence building. It is not a true graph/TSP solver. | Keep as local deterministic route heuristic. If graph provider ships later, batch distance-matrix calls and cache origin-destination-time-bucket estimates. |
| `src/services/predictiveMaintenanceScoring.js` | Rule-based scoring over telemetry fields and diagnostic codes. | Linear and cheap. | Keep deterministic. Introduce signal processing only if high-frequency telemetry series are ingested. |
| `src/services/fleetTelemetryService.js` | Mock fleet snapshot and summary via repeated filters/maps over six vehicles. | No production scaling issue yet; data is mock/demo. | For real fleet feeds, maintain indexed summaries by vehicle status and rolling windows rather than recomputing all aggregates on every poll. |
| Timeline AI vitals | Current vitals are free-text fields inside encounters. | Not suitable for FFT/wavelet analysis as-is. | Use structured timestamped vitals before applying rolling windows, FFT, or wavelets. |

## 3. O(n log n) Optimization Opportunities

Use the right data structure for each path rather than forcing a named complexity class:

- `Map`/`Set` indexes turn repeated membership and ID lookups from repeated `O(n)` scans into `O(1)` expected lookups. This applies to tool IDs, aliases, route paths, calculator slugs, registered executors, workspace membership, pinned/favorite membership, and backend executor IDs.
- Stable sort work should happen once at module initialization or inventory-version changes. The current route definitions and inventory projections can keep their `O(n log n)` sorting, but should not repeat it on every render.
- Search should avoid rebuilding normalized text blobs per keystroke. Precompute `searchBlob`, category, access flags, and aliases when rows are enriched, then search with a single includes check or a token index.
- NLU alias matching can move from full pattern scans to a compiled phrase/token index. This does not need a trie on day one, but a normalized alias map and token-to-tool candidate map will reduce the candidate set before exact phrase checks.
- RAG/guideline retrieval already depends on semantic indexing in Pinecone. The missing optimization is caching embeddings/retrieval/results and ensuring invalidation on corpus version changes.
- Fleet route optimization currently uses a deterministic sort heuristic. If a real graph route engine is added, use batching, memoized distance matrices, and practical heuristics. Do not add a costly pairwise API loop per render/request.

## 4. Indexing Strategy

### Frontend Indexes

Add or extend module-level indexes in `src/data/toolInventory.js`, `src/routes/clinicalToolRoutes.js`, and `src/navigation/registryToolLaunch.js`:

| Index | Source | Consumers | Expected benefit |
|---|---|---|---|
| `nluProfilesByRegistryId: Map<string, ToolProfile[]>` | `clinicalIntentTools`, `NLU_TO_REGISTRY_ID`, `ORCHESTRATOR_TO_REGISTRY_ID` | inventory builder, alias audit, launch labels | Avoid repeated `find/filter` scans per registry. |
| `primaryNluByRegistryId: Map<string, ToolProfile>` | `registryToPrimaryNluToolId()` plus catalog | inventory builder | Avoid repeated primary NLU lookup. |
| `calculatorByRegistryId`, `calculatorBySlug`, `calculatorByOrchestratorId` | `builtinUiCalculators`, calculator contracts | inventory, route builders, launch resolver | Constant-time calculator lookup. |
| `aliasesByRegistryId: Map<string, Set<string>>` | `NLU_TO_REGISTRY_ID`, `ORCHESTRATOR_TO_REGISTRY_ID`, `toolIdAliases` | search, launch, NLU sync tests | Reuse normalized alias terms. |
| `registeredExecutorIds: Set<string>` | `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS` | inventory, catalog labels | Replace `includes()` checks. |
| `calculatorRouteByPath`, `calculatorRouteBySlug` | `CALCULATOR_ROUTE_DEFS` | `matchCalculatorRoute()`, `getRegistryToolNavigation()` | Remove route `.find()` scans. |
| `workspaceToolIdSet`, `pinnedToolIdSet`, `favoriteToolIdSet` | React contexts | `ToolsOverview`, `Sidebar` | Faster membership checks during render. |

### Backend Indexes

Add backend indexes beside the existing source arrays:

| Index | Source | Consumers | Expected benefit |
|---|---|---|---|
| `TOOL_PATTERN_BY_ID: Map<string, ToolPattern>` | `CLINICAL_TOOL_PATTERNS` | `getToolPattern()`, parameter extraction | Constant-time lookup. |
| `NORMALIZED_TOOL_KEYWORDS` | `CLINICAL_TOOL_PATTERNS` | `matchToolPatterns()` | Avoid repeated `keyword.toLowerCase()`. |
| `TOKEN_TO_TOOL_IDS: Map<string, Set<string>>` | normalized keywords | NLU candidate selection | Reduce full keyword scan to candidate set. |
| `PHRASE_TO_TOOL_IDS: Map<string, Set<string>>` | exact aliases/phrases | NLU exact phrase matching | Fast direct alias matches. |
| `EMERGENCY_KEYWORD_INDEX`, `CLINICAL_KEYWORD_INDEX` | emergency/clinical patterns | classifiers | Shared matcher instead of repeated category scans. |
| `STATIC_LAB_REFERENCE_RANGES`, `LAB_CATEGORY_BY_NAME` | lab interpreter constants | lab processing | Avoid rebuilding range/category data per execution. |
| `KNOWN_DRUG_PAIR_MAP`, `MEDICATION_ALIAS_MAP` | drug checker constants | drug interaction check | Avoid rebuilding static dictionaries per request. |

Maintain all current parity tests during index rollout. The output order and disambiguation behavior of `matchToolPatterns()` is clinically sensitive; indexing should reduce the candidate set but not change tie-breaking without explicit test updates.

## 5. Caching Strategy

### Frontend Caches

- Cache stable inventory projections: `getUserFacingToolRegistryProjection()` and `getSidebarToolRegistryProjection()` should return cached arrays when called with the canonical inventory.
- Cache catalog enrichment: enriched medical/discovered rows should carry `searchBlob`, normalized category, launchability, launch label, and access tier.
- Use React `useMemo` in `ToolsOverview`, `Sidebar`, and `ClinicalToolCatalog` for values derived from tool inventory, workspace IDs, pinned/favorite IDs, active route state, filter query, and sort state.
- Add a short TTL plus in-flight promise cache in `src/services/clinicalToolsApi.js` for:
  - `fetchBackendClinicalTools({ availableOnly, authToken })`
  - `fetchClinicalToolMetadata(toolId, { authToken })`
  - `fetchToolExecutorCatalog({ authToken })`
  - `fetchToolStatistics({ authToken })`
- Do not broadly cache `validateClinicalTool()` or tool execution. Validation payloads change per keystroke; use debounce, cancellation, or form-level dirty-state instead.

### Backend Caches

- Add exact cache keys for deterministic, stable inputs:
  - `tool-schema:{toolId}:{contractVersion}`
  - `drug-ai:{medicationSetHash}:{severityFilter}:{modelVersion}`
  - `lab-ai:{labsHash}:{clinicalContextHash}:{modelVersion}`
  - `rag:embed:{model}:{normalizedQueryHash}`
  - `rag:retrieve:{queryHash}:{topK}:{minScore}:{filtersHash}:{corpusVersion}:{rerankVersion}`
  - `guideline-answer:{queryHash}:{filtersHash}:{corpusVersion}:{modelVersion}`
- Add in-flight request coalescing for expensive identical calls. If five requests ask the same guideline question simultaneously, one embedding/vector/rerank/LLM chain should run.
- Cache subscription tier and daily usage count briefly per user or per request. Preserve authoritative daily limits by incrementing counters when a successful AI call is logged.
- Replace `AIService.getUsage()` in-memory row reduction with DB aggregate queries for `COUNT(*)` and `SUM(cost)`.
- Cache health checks with a short TTL. A health endpoint should not repeatedly spend embedding tokens for the same `"test"` probe.

## 6. Semantic Cache Strategy

Semantic cache applies only to nondeterministic AI/guideline/retrieval paths. It must not be used for deterministic calculators where exact formulas and auditability matter.

### Cache Layers

1. Exact query cache: normalize whitespace/case, hash query and filters, and reuse identical answers within TTL and corpus version.
2. Embedding cache: store query embeddings by model and normalized query hash.
3. Retrieval cache: store Pinecone matches and reranked chunk IDs/scores by query/options/corpus version.
4. Semantic answer cache: store `(queryEmbedding, answer, citations, sourceIds, corpusVersion, filters, model, safety flags)` and reuse only when similarity exceeds a conservative threshold.

### Safety Rules

- Require same document filters, specialty, tenant, user access scope, and corpus version before semantic reuse.
- Require citation/source overlap for guideline answers; do not return an answer if the cached citations are stale or inaccessible.
- Use high thresholds for clinical content. A reasonable starting point is exact cache first, then semantic reuse only above `0.92-0.95` cosine similarity after validating matching filters and source version.
- Mark semantic-cache hits in metadata and metrics. Clinicians should receive the same safety disclaimer, citations, and freshness metadata.
- Never cache PHI-heavy prompts across users or tenants. Patient-context prompts may use per-user/per-patient scoped cache with short TTL only if allowed by policy.
- Do not let semantic cache bypass rate limits, audit logging, or permission checks.

### Suggested Metrics

- `semantic_cache_exact_hit_rate`
- `semantic_cache_vector_hit_rate`
- `rag_embedding_cache_hit_rate`
- `rag_retrieval_cache_hit_rate`
- `semantic_cache_rejected_similarity`
- `semantic_cache_stale_corpus_rejections`
- `ai_cost_usd_saved_estimate`
- `ai_latency_ms_saved_estimate`

## 7. FFT/Wavelet Use Cases for Vitals and Telemetry

FFT and wavelet methods are only appropriate when CareDroid has structured timestamped signal data. They are not appropriate for current free-text timeline fields or static calculator inputs.

### Appropriate Use Cases

| Data | Current state | Efficient method when structured data exists |
|---|---|---|
| Patient vitals streams | Timeline AI currently accepts free-text `vitals` inside encounters. | Use rolling windows first. Add FFT only for periodic patterns such as respiratory or heart-rate variability in regularly sampled data. Use wavelets for transient changes such as abrupt desaturation or intermittent arrhythmia-like events. |
| Lab trends | Current lab interpreter receives point-in-time lab arrays. | Use sorted time-indexed lab series, rolling deltas, slopes, and threshold crossings. FFT rarely helps lab values because sampling is sparse and irregular. |
| Fleet telemetry | Current fleet command uses mock snapshots; predictive maintenance has aggregate telemetry counts. | For high-frequency engine temperature, vibration, battery, brake, or energy data, use rolling aggregates, downsampling, and wavelets for spikes. FFT can detect cyclic vibration/rotation signatures if sampling is uniform. |
| Route/ETA history | Current route optimizer sorts stops and estimates time from distance/traffic level. | Use time-bucketed ETA caches and matrix batching. FFT is not a route optimizer; only use time-series decomposition for periodic traffic demand forecasting. |

### Practical Signal Pipeline

1. Ingest structured events with timestamp, unit, source, patient/vehicle ID, and sampling cadence.
2. Sort by timestamp and deduplicate by source event ID.
3. Store rolling windows and aggregates: min/max/mean, p95, slope, delta, threshold dwell time.
4. Downsample long histories before rendering or AI summarization.
5. Apply FFT only to uniformly sampled, stationary-enough segments where frequency content matters.
6. Apply wavelets or windowed derivatives for transient spikes, sudden deterioration, or intermittent telemetry anomalies.
7. Feed summarized signal features to AI only when narrative explanation is needed; do not send raw high-frequency streams to LLMs.

## 8. Backend Cost Reduction Strategy

### Cost-Aware Execution Routing

Use this routing ladder for every tool/action:

1. Local calculator: run deterministic browser-side calculators for Tier A tools already implemented in JS/React. No AI call.
2. Deterministic backend executor: use `/api/tools/:id/execute` for registered deterministic/server-owned tools such as `sofa-calculator`, with schema validation and audit logging. No AI call.
3. Cached response: return exact or semantic cache hit when allowed by safety, access, and version rules.
4. Rule-based or indexed retrieval: use NLU indexes, local catalog data, backend maps, and RAG retrieval before any generative response.
5. Low-cost AI model: use for summarization, structured extraction, or low-risk narrative around already retrieved deterministic facts.
6. Premium AI model: reserve for complex, high-risk, multi-step clinical reasoning support that requires stronger model quality and passes permission/rate/cost policy.

### Deterministic Tool Rules

- Deterministic calculators must not call AI for score computation, route resolution, field validation, or formula output.
- Calculator explanation may be generated by AI only as an optional, clearly labeled educational layer after deterministic scoring, and only if the user explicitly asks for narrative help.
- Tool launch resolution must stay deterministic through registry/route maps.
- Backend executor lookup must remain indexed through existing `Set`/object maps and future `Map`s.

### Backend Hotspot Reductions

- `RAGService.retrieve()`: add exact query, embedding, retrieval, and rerank caches.
- `CohereRankerService.rerank()`: remove `indexOf()` inside `map`.
- `LabInterpreterService`: batch abnormal categories into one structured JSON call, or use bounded concurrency and cache by normalized labs/context.
- `DrugCheckerService`: cache AI interaction results by sorted normalized medication aliases and severity filter; keep known-pair rules immediate.
- `AIService`: share subscription/rate-limit state within request scope and use DB aggregates for usage reporting.
- Health checks: avoid repeated paid probes on every status request.

## 9. Frontend Performance Strategy

### Search And Catalog

- Precompute `searchBlob` once for each medical catalog and discovered catalog row.
- Debounce search input in developer catalog if row count grows materially.
- Use memoized filtered/sorted rows keyed by `query`, `categoryFilter`, `sortKey`, `sortDir`, and source inventory version.
- Derive `getMedicalCatalogSummary()` and `getSourceCodeDiscoverySummary()` from already materialized rows in the component instead of calling source helpers that rescan.
- Pre-group discovery rows by status for badge counts and sections.

### Launch And Route Resolution

- Add path and slug maps in `clinicalToolRoutes.js`.
- Cache `getRegistryToolNavigation(toolId)` results for stable inventory records, or at least route map lookups inside it.
- Resolve active calculator route once per render in `Sidebar` and pass it to `isToolRouteActive()`.
- Keep route fallback behavior deterministic and covered by existing route tests.

### Render-Time Membership

- Convert `workspaceToolIds`, `pinned`, `favorites`, and `recentTools` to `Set`s when used for membership.
- Avoid repeated `filteredTools.filter()` passes for pinned ordering; do one pass into pinned/unpinned arrays.
- Memoize `toolById` and `sidebarToolById`.
- Preserve the UX behavior of recent, pinned, favorite, workspace, and category group displays through regression tests.

## 10. Benchmarks To Add

Benchmarks should run in CI or as explicit performance scripts with stable fixtures. Track p50, p95, allocations where available, and output parity.

### Frontend Benchmarks

| Benchmark | Target path | Fixture sizes | Success metric |
|---|---|---|---|
| Catalog search | `catalogRowsMatchingQuery()`, `matchesDiscoveredRow()`, enriched row search | current, 5x, 10x catalog rows | Lower p95 per keystroke; identical result IDs/order. |
| Launch resolution | `resolveCatalogLaunch()`, `getRegistryToolNavigation()`, `matchCalculatorRoute()` | current route set, 10x synthetic calculator routes | Constant or near-constant lookup time after map build; identical plans. |
| Inventory projection | `getUserFacingToolRegistryProjection()`, `getSidebarToolRegistryProjection()` | current, 5x, 10x inventory | Cached repeated calls should be materially faster; first call parity preserved. |
| ToolsOverview render derivation | workspace/pinned/favorites/recent filtering helpers | current and large workspace | Fewer scans and stable rendered counts. |
| Sidebar active route | active calculator route matching over all tools | current and 10x routes | One route lookup per render, not per tool. |

### Backend Benchmarks

| Benchmark | Target path | Fixture sizes | Success metric |
|---|---|---|---|
| NLU matching | `matchToolPatterns()`, emergency/clinical classifiers | current patterns, 10x patterns, long clinical messages | Faster p95 with identical top matches and confidence ordering. |
| Backend executor lookup | `resolveExecutorToolId()`, `classifyToolExecutionError()` | current, 10x registered/unsupported aliases | Indexed lookup stays flat; output parity. |
| Reranker prep | `CohereRankerService.rerank()` document mapping | 5, 20, 100 chunks | Remove `O(k^2)` mapping overhead. |
| RAG repeated query | `RAGService.retrieve()` | repeated exact and near-duplicate guideline queries | Cache hit avoids duplicate embedding/Pinecone/Cohere calls. |
| Timeline processing | `buildTimelineEvents()`, `buildTimelineTrends()`, progression | 10, 100, 1,000 encounters | Precomputed normalization reduces runtime; output parity. |
| Lab interpreter | abnormal labs across categories | 1, 5, 20 categories | Fewer AI calls and lower total latency/cost; same schema. |
| Drug checker | repeated normalized medication sets | common medication combinations | Cache hit avoids duplicate AI call; known rule output unchanged. |
| AI usage reporting | `AIService.getUsage()` | 1k, 100k query rows | DB aggregate avoids loading all rows. |

### Regression Tests

- Frontend:
  - `src/utils/catalogSearch.test.js`
  - `src/pages/tools/ClinicalToolCatalog.launch.test.jsx`
  - `src/pages/tools/ToolsOverview.visibility.test.jsx`
  - `src/routes/clinicalToolRoutes.test.js`
  - `src/routes/clinicalToolRoutes.production.test.js`
  - `src/navigation/registryToolLaunch.test.js`
  - `src/services/clinicalToolsApi.test.js`
  - `src/components/Sidebar.*.test.js`
- Backend:
  - `backend/test/tool-patterns-*.spec.ts`
  - `backend/test/intent-classification.e2e-spec.ts`
  - `backend/test/tool-orchestrator.spec.ts`
  - `backend/test/tool-orchestrator-api.e2e-spec.ts`
  - New specs for RAG cache, embedding cache, rerank mapping, lab batching/cache, drug checker cache, and AI usage aggregation.

## 11. Implementation Phases

### Phase 1: Low-Risk Indexes And Memoization

- Add frontend projection caches in `toolInventory.js`.
- Add calculator route maps in `clinicalToolRoutes.js` and use them in `registryToolLaunch.js`.
- Convert render-time membership arrays to `Set`s in `ToolsOverview` and `Sidebar`.
- Precompute or memoize catalog search blobs.
- Replace `chunks.indexOf(chunk)` in `CohereRankerService`.
- Add benchmarks for catalog search, launch resolution, NLU matching, and executor lookup before and after changes.

### Phase 2: NLU And Catalog Candidate Indexes

- Add `TOOL_PATTERN_BY_ID`, normalized keyword arrays, and a token/phrase candidate index.
- Keep current disambiguation logic after candidate selection.
- Add parity tests that compare old and new matcher outputs across existing `tool-patterns-*` coverage.
- Pre-group catalog/discovery rows by status/category in `ClinicalToolCatalog`.

### Phase 3: Backend Request And RAG Caching

- Add TTL/in-flight caches for frontend stable GET APIs.
- Add backend exact query, embedding, retrieval, and rerank caches.
- Add corpus/index version invalidation on RAG ingest/delete.
- Add usage metrics for cache hits, avoided AI calls, and cost estimates.

### Phase 4: Cost-Aware AI Routing

- Introduce a routing policy layer with explicit route types: local deterministic, backend deterministic, cache, low-cost AI, premium AI.
- Update drug checker and lab interpreter to prefer deterministic/rule results and cache before AI.
- Batch lab interpretation AI calls or use bounded concurrency.
- Add per-feature model selection and metrics.

### Phase 5: Structured Time-Series Pipeline

- Define structured vitals/telemetry schemas with timestamps, units, source, and sampling cadence.
- Add sorted indexes and rolling-window summaries.
- Apply FFT/wavelet features only to uniformly sampled vitals or fleet telemetry where frequency/transient behavior is clinically or operationally meaningful.
- Keep AI calls on summarized features, not raw streams.

## 12. Risks and Safety Constraints

- Do not change clinical outputs while optimizing lookup paths. Every indexed matcher or cached projection needs parity tests.
- Deterministic calculators must remain deterministic. Do not call AI to compute scores, route calculator launches, or validate deterministic formulas.
- Semantic cache must respect tenant/user access, PHI boundaries, corpus version, document filters, and audit logging.
- Cache invalidation must be explicit for guideline/RAG content. A fast stale answer is worse than a slower fresh answer.
- NLU indexing must preserve disambiguation behavior for high-risk terms such as emergency, PE/DVT, SOFA/qSOFA, PHQ/GAD, fleet dispatch, and calculator aliases.
- Cost-aware routing must not silently downgrade model quality for high-risk clinical workflows without policy and metrics.
- Frontend request caches must not cache auth failures or permission-sensitive data across users.
- Route optimization must not claim graph/TSP optimality while using the current sort heuristic.
- FFT/wavelet work must wait for real structured time-series data. Applying it to free text or sparse labs would add complexity without valid signal value.
- Benchmarks must report both speed and correctness. The acceptance condition is not lower Big-O language; it is lower measured latency/load/cost with unchanged results.

## Acceptance Criteria Coverage

- No hype-based algorithm changes: this plan keeps FFT/wavelets limited to structured time-series data and keeps route optimization honest about the current sort heuristic.
- Deterministic tools remain deterministic: local calculators and deterministic backend executors stay outside AI paths.
- Search and launch paths become faster: route maps, projection caches, precomputed search blobs, and membership sets target the current scan-heavy frontend paths.
- Repeated AI calls are reduced: exact/semantic caches, drug/lab caches, RAG caches, and in-flight coalescing reduce duplicate paid calls.
- Backend executor lookup is indexed: current `Set`/object lookup remains the baseline, with benchmarks to prevent regression.
- Patient/vitals/fleet time-series analysis uses efficient signal processing only where appropriate: rolling windows first, FFT/wavelets only for structured sampled signals.
- Cost savings are measurable: benchmark and metric sections define latency, cache hit rate, avoided AI calls, and estimated cost saved.
