# HoloKai Vector RAG — African Civilizations Knowledge Base

Local, sovereign retrieval for Vanguard archetypes (Kemet, Mali, Dogon, Adinkra, Axum, Songhai, Swahili, Carthage, …).

## Architecture

```
Main chat (page.js)
    │
    └─ POST /backend/api/query  →  Python multi-agent core (nomic + Chroma)
           (Next.js rewrite → http://127.0.0.1:8000)

VanguardModal
    │
    ├─ POST /backend/api/query          multi-agent fragments (truth)
    ├─ useRAG.retrieve
    │     1) POST /backend/api/rag/retrieve   Python Chroma (same embeddings)
    │     2) POST /api/rag/retrieve           Next pure-TS / Chroma / Qdrant
    │     3) keyword /public/knowledge
    └─ Ollama persona voice (optional; falls back to core summary)
```

### Frontend ↔ backend contract

| Frontend | Backend |
|----------|---------|
| `GET /backend/health` | Core online + vector_rag status |
| `POST /backend/api/query` | Multi-agent synthesis |
| `POST /backend/api/rag/retrieve` | Semantic chunks (nomic) |
| `POST /backend/api/rag/seed` | Seed Python Chroma |
| `GET /backend/api/rag/status` | Embed + store detail |

Client: `frontend/lib/holokaiApi.js` · Proxy: `next.config.mjs` rewrites `/backend/*`.

### Why not cloud vector DBs?

HoloKai keeps ancestral knowledge on-device. Embeddings run through **Ollama**; vectors persist in a **single JSON file** by default (pure-TS cosine store — no Docker). Chroma/Qdrant are optional upgrades.

### Operational notes (Windows)

| Layer | Dependency | If missing |
|-------|------------|------------|
| Frontend Next | **No `chromadb` npm package** (breaks webpack via unpkg URL) | Pure-TS JSON or Qdrant/Chroma **REST** |
| Python core | `chromadb` optional (often needs MSVC for `chroma-hnswlib`) | Auto **JSON cosine store** `./holokai_chroma/*.json` |
| Both | **Ollama + `nomic-embed-text`** | Multi-agent keyword/comprehensive still works; vector seed/retrieve wait for Ollama |

## Repo layout (full working RAG)

```
frontend/
  lib/rag/
    index.js              # retrieve / ingest / seed (backend switch)
    embeddings.js         # Ollama nomic-embed-text
    vectorStore.js        # pure-TS local cosine + JSON  ← Vanguard default
    chromaStore.js        # optional Chroma HTTP
    qdrantStore.js        # optional Qdrant REST (no SDK)
    textSplit.js          # chunker
    knowledgeCatalog.js   # African history metadata + archetype boosts
  app/
    useRAG.js             # multi-tier hook used by VanguardModal
    VanguardModal.js      # persona chat + ancestral memory
    api/rag/{status,retrieve,seed,ingest}/route.js
  scripts/seed-knowledge.mjs
  public/knowledge/*.txt  # curated African civilizations corpus
  .env.example
docker-compose.yml        # chroma | qdrant | ollama | stack | qdrant-ollama
docs/RAG.md
seed_knowledge.py         # Python agent memory (Chroma + nomic)
```

## Quick start (minimal local — pure-TS vector DB)

```bash
# 1. Embeddings model
ollama pull nomic-embed-text

# 2. Frontend deps
cd frontend
npm install

# 3. Seed curated African history knowledge
npm run rag:seed
# optional: npm run rag:list | npm run rag:status

# 4. Dev server — open a Vanguard archetype modal and ask about Kemet / Axum / Ubuntu
npm run dev
```

Optional env (`frontend/.env.local` — see `.env.example`):

```env
OLLAMA_URL=http://localhost:11434
HOLAKAI_EMBED_MODEL=nomic-embed-text
HOLAKAI_VECTOR_BACKEND=local
```

This writes vectors to `frontend/.data/holokai-vectors.json` and is what **VanguardModal** uses via `useRAG` when the Python backend is offline.

## API (Next.js)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/rag/status` | Embeddings + store readiness |
| `POST` | `/api/rag/retrieve` | `{ query, k?, archetypeId?, empire?, source? }` |
| `POST` | `/api/rag/seed` | `{ clear?: boolean }` — ingest all knowledge files |
| `POST` | `/api/rag/ingest` | `{ text, metadata }` — add a document |

### Retrieve example

```bash
curl -s http://localhost:3000/api/rag/retrieve -H "Content-Type: application/json" -d "{\"query\":\"What is Ma'at?\",\"archetypeId\":\"kemet-alpha\",\"k\":4}"
```

### Seed example

```bash
curl -s -X POST http://localhost:3000/api/rag/seed -H "Content-Type: application/json" -d "{\"clear\":true}"
```

## Seeding scripts (African history KB)

| Script | Role |
|--------|------|
| `frontend/scripts/seed-knowledge.mjs` | Embeds `public/knowledge/*.txt` into local/Qdrant/Chroma |
| `seed_knowledge.py` | Seeds Python multi-agent Chroma from the same files + comprehensive KB |

```bash
# Frontend pure-TS / optional remote store
cd frontend
npm run rag:seed
npm run rag:seed:clear
npm run rag:seed:api     # when Next is already running
npm run rag:list

# Python agents
cd ..
python seed_knowledge.py
python seed_knowledge.py --force
python seed_knowledge.py --status
```

## Vanguard modal integration (pure-TS vector store)

1. **Default store:** `vectorStore.js` — cosine similarity, JSON persistence, zero extra services.
2. **Hook:** `useRAG.js` tries backend → local `/api/rag/retrieve` → keyword fallback.
3. **UI:** `VanguardModal.js` injects retrieved context into the archetype system prompt and shows source chips on replies.

```js
// VanguardModal (simplified)
const ragResult = await retrieve(input, {
  archetypeId: archetypeData?.id,
  k: 5,
  preferBackend: true,
})
// system prompt gets buildContextPrompt(ragResult.contexts)
```

Set `HOLAKAI_VECTOR_BACKEND=local` to force the pure-TS path even if Docker Chroma/Qdrant are up.

## Archetype-aware memory

| Archetype | Preferred themes | Example sources |
|-----------|------------------|-----------------|
| **Kemet-Alpha** (Archivist) | history, records, science | Kemet, Mali, Nubia, Axum, Songhai, Carthage |
| **Asante-V** (Oracle) | vision, divination, cosmology | Ifá, Dogon, Adinkra, Ubuntu |
| **Sika-Gold** (Artisan) | craft, art, metallurgy | Benin Bronzes, Adinkra, Great Zimbabwe |
| **Zamani** (Scholar) | philosophy, ethics, science | Ubuntu, Dogon, Ifá, Kemet |
| **Naja-7** (Sentinel) | ethics, sovereignty | Ubuntu, Benin, Ifá, Carthage |
| **Bantu-Node** | diaspora, linguistics, trade | Swahili Coast, Nsibidi, Nubia, Axum |

Boosting is soft re-rank on top of cosine similarity — hard filters (`empire`, `source`) are also supported.

## Optional: Chroma

```bash
docker compose --profile chroma up -d

# frontend/.env.local
HOLAKAI_VECTOR_BACKEND=chroma
CHROMA_URL=http://localhost:8001

cd frontend
npm run rag:seed:clear
```

## Optional: Qdrant + Ollama (Docker)

```bash
# From repo root — Qdrant :6333 + Ollama :11434 + pull nomic-embed-text
docker compose --profile qdrant-ollama up -d

# frontend/.env.local
HOLAKAI_VECTOR_BACKEND=qdrant
QDRANT_URL=http://localhost:6333
OLLAMA_URL=http://localhost:11434

cd frontend
npm run rag:seed:clear
npm run rag:status
```

Other profiles:

| Command | Services |
|---------|----------|
| `docker compose --profile qdrant up -d` | Qdrant only |
| `docker compose --profile ollama up -d` | Ollama only |
| `docker compose --profile stack up -d` | Chroma + Ollama + model pull |
| `docker compose --profile qdrant-ollama up -d` | **Qdrant + Ollama + model pull** |

Qdrant UI/API: http://localhost:6333/dashboard  

Client: `frontend/lib/rag/qdrantStore.js` (REST, no npm SDK required). Same `retrieveContext` / seed contract as local JSON.

> Prefer **native Ollama** on Windows/macOS GPU hosts; Docker Ollama is best for Linux servers or CPU demos.

## Python backend (multi-agent) — aligned with Vanguard

| Layer | Embeddings | Store | Consumers |
|-------|------------|-------|-----------|
| Python `KnowledgeBase` | **Ollama `nomic-embed-text`** | Chroma `./holokai_chroma` · collection `holokai_knowledge_nomic` | Historian / Archaeologist / Anthropologist / Linguist / Ethicist |
| Frontend `/api/rag` | **Ollama `nomic-embed-text`** | `.data/holokai-vectors.json` · Chroma · **Qdrant** | Vanguard modals |

Shared embedding module: `embeddings_ollama.py`.

### Seed Python agent memory

```bash
ollama pull nomic-embed-text
pip install -r requirements.txt
python seed_knowledge.py          # first seed
python seed_knowledge.py --force  # wipe + re-seed
python seed_knowledge.py --status
```

Or via API once `python main.py` is running:

```bash
curl -X POST "http://localhost:8000/api/rag/seed?force=true"
curl http://localhost:8000/api/rag/status
```

On startup, `CivilizationCore` auto-seeds if the nomic collection is empty (`HOLAKAI_VECTOR_RAG=1` by default). Set `HOLAKAI_VECTOR_RAG=0` to disable.

### Agent retrieval flow

```
Query → Supervisor plans agents
     → each agent.retrieve(domain=…) via nomic embeddings
     → soft domain backfill if sparse
     → keyword comprehensive KB only if vector hits < 2
     → contradiction + ethic synthesis
```

### Env (Python)

```env
OLLAMA_URL=http://localhost:11434
HOLAKAI_EMBED_MODEL=nomic-embed-text
HOLAKAI_CHROMA_PATH=./holokai_chroma
HOLAKAI_VECTOR_RAG=1
# Optional emergency offline path (different vector space — re-seed required):
# HOLAKAI_EMBED_FALLBACK=minilm
```

> **Migration note:** Old MiniLM collections remain as `holokai_knowledge`. Nomic vectors live in `holokai_knowledge_nomic` so dimensions never clash.

## Knowledge sources

Curated files in `frontend/public/knowledge/`:

| File | Topic |
|------|--------|
| `kemet.txt` | Ancient Egypt / Kemet |
| `mali-empire.txt` | Mali Empire |
| `songhai-empire.txt` | Songhai Empire |
| `great-zimbabwe.txt` | Great Zimbabwe |
| `nubia-kush.txt` | Nubia & Kush |
| `axum-empire.txt` | Axum / Aksum |
| `swahili-coast.txt` | Swahili city-states |
| `carthage.txt` | Carthage / North Africa |
| `dogon-cosmology.txt` | Dogon cosmology |
| `ifa-divination.txt` | Ifá |
| `adinkra-symbols.txt` | Adinkra |
| `nsibidi-writing.txt` | Nsibidi |
| `ubuntu-philosophy.txt` | Ubuntu |
| `benin-bronzes.txt` | Benin Bronzes |

Catalog + metadata: `frontend/lib/rag/knowledgeCatalog.js`.
