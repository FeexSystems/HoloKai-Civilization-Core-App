# HoloKai Civilization Core

A multi-agent AI system for preserving and explaining African civilizations through an interactive interface. Three services must all be running.

## How to run

| Workflow | Command | Port | Role |
|---|---|---|---|
| **Backend (FastAPI)** | `python main.py` | 8000 | AI agents, RAG, library API |
| **Frontend (Vite)** | `pnpm -C holo-kai run dev` | 5000 | Civilization Core (main UI) |
| **Landing Page (Vite)** | `pnpm --filter fusion-starter run dev` | 8080 | Orbital Lab entry point |

**Preview pane:** switch to port 8080 for the Orbital Lab landing page, or port 5000 for the Civilization Core directly.

## Navigation flow

```
Orbital Lab (port 8080)
  → ENTER ALKEBULAN  →  Civilization Core (port 5000)
  ← RETURN TO ALKEBULAN ←
```

- Landing page header + hero: **ENTER ALKEBULAN** button → port 5000
- Vanguard section: **ENTER ALKEBULAN — CIVILIZATION CORE** strip → port 5000  
- 3D Unit Lab viewer footer: **ENTER ALKEBULAN** button → port 5000
- Civilization Core sidebar footer: **Return to Alkebulan** → port 8080
- Civilization Core top bar: **Return to Alkebulan** → port 8080

## Required secrets

| Key | Purpose |
|---|---|
| `OPENAI_API_KEY` | Powers the AI agents (OpenAI / xAI/Grok compatible) |

## Environment variables (non-secret)

| Key | Default | Purpose |
|---|---|---|
| `VITE_CORE_URL` | `http://localhost:5000` | Landing page → Core navigation URL |
| `VITE_LANDING_URL` | `http://localhost:8080` | Core → Landing page navigation URL |

## Package management

This is a **pnpm workspace** (root `pnpm-workspace.yaml`). Both frontends are managed together:

```bash
pnpm install              # install all packages
pnpm run dev              # start holo-kai (Core)
pnpm run dev:landingpage  # start landing page
pnpm run build            # build holo-kai
pnpm run build:landingpage
```

## Architecture

- **Backend** (`main.py` + `holokai_backend.py`): FastAPI with 5 specialist AI agents — Historian, Archaeologist, Anthropologist, Linguist, Ethicist.
- **Core frontend** (`holo-kai/`): React + Vite + Tailwind. Pages: Research Chat, Library, Timeline, Map, Manuscripts, Knowledge Graph, Compare, Oral Tradition, Vanguard, Studio.
- **Landing page** (`HoloKai - landingpage/`): React + Vite + Express + Three.js. Orbital Lab with 3D unit viewer and Vanguard showcase.
- **Knowledge base** (`knowledge_base_comprehensive.py`): 4,858 curated chunks across 5 eras.
- **Vector store**: Falls back to pure-Python JSON cosine store (no Ollama/Chroma needed).

## Known limitations on Replit

- Ollama (local embeddings) is unavailable → hashing embeddings used as fallback.
- Docker services (Chroma, Qdrant) are unavailable → JSON vector store fallback.
- WebGL/Three.js 3D lab viewer requires a browser with GPU; works in real browsers, not in screenshot tools.

## User preferences

- Keep existing project structure and stack.
- All pages should have easy bidirectional navigation.
