# HoloKai Phase 2 Started

This phase introduces production-oriented storage and job orchestration while preserving compatibility.

## Added

## 1) PostgreSQL/pgvector storage path (with fallback)

New modules:

- `postgres_store.py`
- `catalog_backend.py`

Behavior:

- If `DATABASE_URL` (or `POSTGRES_DSN`) is configured and `psycopg` is installed:
  - library catalog APIs run on PostgreSQL
  - source upsert/review/search/facets run in SQL
  - grounded claim/citation persistence writes to `claims` + `claim_citations`
  - job records use `ingest_jobs`
- If unavailable, the app gracefully falls back to JSON catalog mode.

## 2) Tracked background jobs

New module:

- `job_manager.py`

New APIs:

- `POST /api/jobs/grounded-ask` — queue grounded synthesis
- `POST /api/jobs/import-ris` — queue RIS import
- `GET /api/jobs/{job_id}` — check queued/running/succeeded/failed status

Job storage:

- PostgreSQL when configured
- in-memory fallback otherwise

## 3) Storage admin/status APIs

- `GET /api/storage/status`
- `POST /api/storage/init` (administrator role required via `x-holokai-role` header)

## 4) Existing endpoints now persist grounded claims when possible

- `POST /api/rag/ask`
- `POST /api/alive/ask`
- `POST /api/grounded/ask`
- `POST /api/query`

Each now includes `canon_persist` metadata in responses.

## 5) RIS ingestion now routes through storage backend adapter

`ris_pipeline.py` now uses `catalog_backend.upsert_sources`, enabling PostgreSQL-backed candidate-source ingestion when configured.

---

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Set environment:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB
```

3. Initialize schema:

```bash
python run_postgres_schema.py
```

or call:

```http
POST /api/storage/init
x-holokai-role: administrator
```

---

## Hosted model provider configuration (including Kimi K3)

The gateway supports Kimi via OpenAI-compatible API:

```bash
MOONSHOT_API_KEY=...
KIMI_MODEL=kimi-k3
KIMI_BASE_URL=https://api.moonshot.ai/v1
KIMI_REASONING_EFFORT=max
```

Optional provider override:

```bash
HOSTED_PROVIDER=kimi
```

If no Kimi key is present, gateway falls back to generic hosted provider envs (`FRONTIER_*` / `OPENAI_*`) and then to Ollama.

## Notes

- `/api/grounded/ask` remains synchronous for compatibility.
- Production path should prefer `/api/jobs/grounded-ask` and polling `GET /api/jobs/{job_id}`.
- Next slice should migrate passage-level indexing and embeddings into dedicated ingestion workers tied to object storage.
- Never commit API keys to source or chat logs; rotate immediately if exposed.
