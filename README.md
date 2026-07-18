# HoloKai-Civilization-Core-App
Where Civilizations Remembers

## What this is

**HoloKai** is a multi-agent AI system and interface that preserves and explains African civilizations, cultures, sciences, and philosophies through an interactive 3D experience. It combines a Python backend orchestration engine with a sophisticated knowledge base about African history—from ancient Egypt to modern Afrofuturism—and presents findings through a real-time React frontend with an animated 3D humanoid robot powered by Spline.

### Stack

- **Languages:** Python (61.7%) + JavaScript/React (37.4%) + CSS (0.9%)
- **Backend:** FastAPI + Python 3.10+ with concurrent agent orchestration
- **Frontend:** Next.js 14+ (App Router) + React 18 + TypeScript + Tailwind CSS + Spline
- **Notable libraries:** Pydantic (validation), OpenAI client (xAI/Grok support), Lucide React (icons), @splinetool/react-spline

## How it's organized

```
repo root/
├── main.py                           FastAPI entry point, health checks, query endpoint
├── holokai_backend.py                Multi-agent orchestration core (2000+ lines)
│                                    - Supervisor (rule-based + LLM) route queries
│                                    - 5 specialist agents (Historian, Archaeologist, 
│                                      Anthropologist, Linguist, Ethicist)
│                                    - Contradiction detection & ethics engine
│
├── knowledge_base_comprehensive.py   Hierarchical knowledge store (400+ lines)
│                                    - 5 eras from pre-3000 BCE to modern
│                                    - 50+ curated entries on civilizations, tech, 
│                                      philosophy, cultural symbols
│                                    - Domain tagging (historian, archaeology, etc.)
│
├── App.jsx                           React frontend (430+ lines)
│                                    - 3D Spline robot core with agent-responsive 
│                                      color animations
│                                    - Real-time emotion engine display
│                                    - Active agent visualization
│                                    - Synthesis report panel
│
├── frontend/                         Placeholder for Next.js structure (empty in repo)
├── LICENSE                           MIT
└── README docs                       Readme.md.txt + Integrate into CivilizationCore.md
```

**How it fits together:**  
A user submits a query via the Next.js frontend. The FastAPI endpoint (`/api/query`) passes it to `CivilizationCore`, which uses a rule-based (or LLM) Supervisor to select agents. All selected agents run in parallel, each querying the knowledge base and generating fragments. A contradiction detector flags conflicts, an ethics engine filters for safety, and all fragments are synthesized into a response with confidence scores and emotional profiling. The frontend renders the results in a synthesis panel while the 3D robot core animates based on active agents and system state (idle/listening/thinking/speaking).

## How to run it

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
# Server runs at http://localhost:8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Frontend at http://localhost:3000
```

**Environment variables:**
- `OLLAMA_API_KEY` – Ollama Cloud chat (supervisor + persona proxy); create at https://ollama.com/settings/keys
- `OLLAMA_URL` – embed/local host (default `http://localhost:11434`)
- `HOLAKAI_CHAT_BACKEND` – `auto` (local → cloud), `local`, or `cloud`
- `HOLAKAI_CHAT_MODEL` – chat model (default `gemma4`)
- `HOLAKAI_SUPERVISOR_PROVIDER` – `auto` | `ollama` | `xai`
- `XAI_API_KEY` – (optional) xAI Grok supervisor fallback
- `NEXT_PUBLIC_API_URL` / `/backend` – frontend → FastAPI
- `NEXT_PUBLIC_OLLAMA_PROXY=1` – persona chat via `/backend/api/ollama` (keeps API key server-side)

Chat/embeddings use the official [ollama-python](https://github.com/ollama/ollama-python) client (`ollama_client.py`).

## Vector RAG (Vanguard ancestral memory)

Local embeddings + vector retrieval for African civilizations knowledge (Kemet, Mali, Axum, Songhai, Swahili, Dogon, Adinkra, …). Defaults to a **pure-TS JSON vector store** used by **VanguardModal** — no Docker required.

```bash
ollama pull nomic-embed-text
cd frontend
npm install
npm run rag:seed          # builds frontend/.data/holokai-vectors.json
npm run rag:list          # catalog of African history sources
npm run dev
```

### Docker: Qdrant + Ollama

```bash
# From repo root
docker compose --profile qdrant-ollama up -d
# Qdrant http://localhost:6333 · Ollama http://localhost:11434
# (auto-pulls nomic-embed-text)

# frontend/.env.local
# HOLAKAI_VECTOR_BACKEND=qdrant
# QDRANT_URL=http://localhost:6333
# OLLAMA_URL=http://localhost:11434

cd frontend && npm run rag:seed:clear
```

Optional Chroma on port **8001** (keeps FastAPI free on 8000):

```bash
docker compose --profile chroma up -d
# set HOLAKAI_VECTOR_BACKEND=chroma and CHROMA_URL=http://localhost:8001
```

Full guide: [docs/RAG.md](docs/RAG.md) · env template: `frontend/.env.example`

### Python agents (same embeddings as Vanguard)

Multi-agent core (`holokai_backend.py`) retrieves via **Ollama `nomic-embed-text` + Chroma**, aligned with the frontend.

```bash
ollama pull nomic-embed-text
pip install -r requirements.txt
python seed_knowledge.py --force
python main.py
# GET  http://localhost:8000/api/rag/status
# POST http://localhost:8000/api/rag/seed?force=true
```

## Try asking

1. **"Tell me about Sungbo's Eredo"** — Triggers all four domain agents (Historian, Archaeologist, Anthropologist, Linguist) for multi-perspective synthesis of a West African monument.

2. **"What knowledge systems did Africa pioneer?"** — Tests knowledge base range (mathematics, astronomy, metallurgy, medicine) and agent collaboration.

3. **"How do I fix the Spline scene URL or add custom agent colors?"** — Clarifies the HoloKai robot customization workflow and AGENT_COLORS mapping in App.jsx.
