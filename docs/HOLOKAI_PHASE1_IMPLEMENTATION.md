# HoloKai Phase 1 Implementation (Experience + Grounded Knowledge)

This document captures the implemented first slice of the Pan-African Living Civilization Library plan.

## Implemented

### 1) Temple-first route architecture (Next.js)

- `/` Temple immersive shell with Spline companion and journey navigation
- `/library` faceted source discovery
- `/library/[slug]` source record detail
- `/timeline` chronology journey shell
- `/map` regional/diaspora map shell
- `/studio` editorial review queue
- `/core` legacy interface retained

### 2) Grounded answer contract

Added claim-level grounding on backend responses:

- `grounded.claims[]`
- `grounded.citation_index[]`
- `citation_validation`
- `insufficient_evidence` behavior and refusal mode

Endpoints:

- `POST /api/grounded/ask` (new)
- `POST /api/alive/ask` (augmented grounding)
- `POST /api/rag/ask` (augmented grounding)
- `POST /api/query` (augmented grounding)

### 3) Provider-neutral model gateway

- `POST /api/model/synthesize`
- Hosted-first synthesis via `FRONTIER_API_KEY` / `OPENAI_API_KEY`
- Fallback to local Ollama when hosted is unavailable

### 4) Candidate source catalog + editorial controls

Implemented JSON-backed staging catalog (intermediate until Postgres migration):

- `GET /api/library/facets`
- `GET /api/library/search`
- `GET /api/library/{slug}`
- `GET /api/studio/queue`
- `POST /api/studio/review` (role header required)
- `POST /api/studio/import-ris` (role header required)

Role header currently used for scaffolding:

- `x-holokai-role: editor | reviewer | administrator`

### 5) RIS candidate-source import pipeline

- `import_ris_candidates.py`
- `ris_pipeline.py`

Capabilities:

- encoding normalization
- RIS parse + type normalization
- DOI normalization and optional DOI verification
- canonical link preference (`doi.org` over aggregator links)
- dedupe before upsert
- staged editorial status (not public canon text)

### 6) Postgres + pgvector reference schema

- `docs/postgres_pgvector_schema.sql`

Includes source records, passages, entities, relationships, claims, claim citations, review decisions, and ingest jobs.

## Not yet implemented in this slice

- Managed Postgres runtime wiring and live pgvector writes
- Object storage integration for originals
- Async tracked worker jobs for ingest/embedding/synthesis
- Full evaluation suite automation
- Full accessibility audit and multilingual UI rollout

## Environment variables (new)

- `FRONTIER_API_KEY` or `OPENAI_API_KEY`
- `FRONTIER_BASE_URL` or `OPENAI_BASE_URL` (optional)
- `FRONTIER_MODEL` or `OPENAI_MODEL` (optional)
