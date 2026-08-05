# CareDroid App Navigator RAG

A standalone, shareable application navigator for CareDroid. Ask a workflow question and receive grounded matches from the canonical CareDroid route catalog.

## What it does

- Retrieves verified routes, page components, workflow owners, aliases, and descriptions.
- Uses deterministic lexical retrieval with healthcare workflow synonyms.
- Optionally asks Groq to phrase the answer using only retrieved evidence.
- Builds destination cards exclusively from the closed catalog, so an LLM cannot invent clickable routes.
- Runs in catalog-only mode without any API key.
- Contains no patient data and is not a clinical decision-support system.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm start
```

Open [http://127.0.0.1:4178](http://127.0.0.1:4178).

## Enable Groq

Copy `.env.example` to a local `.env` or configure environment variables in your runtime. Node does not automatically load `.env`, so use your platform’s secret manager or shell environment.

```bash
export GROQ_API_KEY="your-rotated-key"
export GROQ_MODEL="llama-3.3-70b-versatile"
npm start
```

PowerShell:

```powershell
$env:GROQ_API_KEY = "your-rotated-key"
$env:GROQ_MODEL = "llama-3.3-70b-versatile"
npm start
```

Never use a browser-prefixed environment variable for the key. The browser calls the local `/api/query` endpoint; only the server talks to Groq.

## Refresh the catalog

The committed snapshot records its source CareDroid commit. `navigator/` lives inside the CareDroid-Clinical-AI repo itself, as a sibling of `src/`, so the default source is just the repo root:

```bash
npm install
npm run sync:catalog
npm test
```

Pass `--source=<path>` to point at a different checkout if you ever need to.

## API

- `GET /api/health` — index and provider status without secrets.
- `GET /api/catalog` — current public application-location catalog.
- `POST /api/query` — `{ "query": "where do I manage ambulances?" }`.

Set `NAVIGATOR_ACCESS_TOKEN` when exposing the server beyond localhost, or place it behind your organization’s authenticated gateway. The server binds to `127.0.0.1` by default.

## Database roadmap

The current route catalog is small and versioned, so it needs no database. For documentation, tools, API controllers, and tenant-specific navigation at larger scale, use the parent project’s PostgreSQL + TypeORM + pgvector stack:

1. Store route/document chunks, metadata, source hashes, and embeddings in a separate navigator namespace.
2. Combine PostgreSQL full-text ranking with pgvector similarity.
3. Apply route validity, role permission, and tenant filters after retrieval.
4. Add idempotent indexing, freshness health checks, migrations, and tenant-isolation tests.

## Test strategy

`npm test` currently covers catalog integrity, workflow synonym retrieval, unknown-query abstention, and grounded prompt construction. Recommended next gates are Recall@1/Recall@3 evaluation, permission-aware retrieval, API integration tests, browser navigation tests, prompt-injection cases, and Groq timeout/rate-limit tests.

## Security

- No PHI belongs in this index.
- No API keys belong in git, catalog metadata, logs, or browser storage.
- Groq failure degrades to deterministic retrieval.
- Dynamic paths containing `:id` are identified as context-dependent.
- Deployments should add organization authentication, TLS, managed secrets, and persistent rate limiting.
