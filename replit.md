# HoloKai Civilization Core

A multi-agent AI system for preserving and explaining African civilizations, cultures, sciences, and philosophies through an interactive interface.

## How to run

Two workflows must both be running:

| Workflow | Command | Port |
|---|---|---|
| **Backend (FastAPI)** | `python main.py` | 8000 |
| **Frontend (Vite)** | `npm --prefix holo-kai run dev` | 5000 |

The preview pane connects to the frontend on **port 5000**. The frontend proxies `/api/*` requests to the backend on port 8000.

## Required secrets

| Key | Purpose |
|---|---|
| `OPENAI_API_KEY` | Powers the AI agents (also accepts xAI/Grok-compatible endpoints) |

## Architecture

- **Backend** (`main.py` + `holokai_backend.py`): FastAPI app with 5 specialist agents — Historian, Archaeologist, Anthropologist, Linguist, Ethicist — orchestrated by a rule-based + LLM supervisor.
- **Frontend** (`holo-kai/`): React + Vite app with Spline 3D, Tailwind CSS, shadcn/ui components.
- **Knowledge base** (`knowledge_base_comprehensive.py`): 4,858 curated chunks covering African civilizations across 5 eras.
- **Vector store**: Falls back to pure-Python JSON cosine store (no Ollama/Chroma/Qdrant needed on Replit).

## Optional services (not available on Replit)

- **Ollama** local embeddings (`nomic-embed-text`) — falls back to hashing embeddings automatically.
- **Chroma / Qdrant** vector DBs — falls back to JSON store automatically.
- **PostgreSQL** — the catalog backend gracefully degrades without it.

## User preferences

- Keep existing project structure and stack.
