
from __future__ import annotations

import logging
import os
from typing import Any, Dict, List
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from holokai_backend import CivilizationCore

# ----------------------------------------------------------------------
# Logging
# ----------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("holokai.api")

# ----------------------------------------------------------------------
# FastAPI App
# ----------------------------------------------------------------------
app = FastAPI(
    title="HoloKai Civilization Core API",
    description="Multi-agent historical synthesis engine for African civilizations",
    version="2.0.0",
)

# CORS – local Next.js + Vite; credentials off so wildcard-safe origins work
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Single shared core instance
core = CivilizationCore()

# In-memory chat history (last 100 messages)
chat_history: List[Dict[str, Any]] = []
MAX_HISTORY = 100

# Greeting keywords that trigger wave/bow animation
GREETING_KEYWORDS = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening", "howdy", "salute", "jambo", "sawubona"]
WAVE_KEYWORDS = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy", "salute"]
BOW_KEYWORDS = ["greetings", "jambo", "sawubona", "respect", "honor"]


# ----------------------------------------------------------------------
# Request / Response Models
# ----------------------------------------------------------------------
class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000, description="User query")


class RagRetrieveRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    k: int = Field(5, ge=1, le=20)
    domain: str | None = Field(
        None,
        description="Optional agent domain: historian | archaeology | anthropology | linguistics | ethics",
    )
    min_score: float = Field(0.28, ge=0.0, le=1.0)
    empire: str | None = None
    source: str | None = None


class QueryResponse(BaseModel):
    title: str
    query: str
    fragments: list
    summary: str
    confidence: float
    trace_id: str
    active_agents: list
    safety_notes: list
    emotions: dict
    greeting_animation: str | None = None


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=3000)
    voice: str = "en-US-GuyNeural"
    rate: float = 1.0
    pitch: float = 1.0


class WebSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    max_results: int = Field(5, ge=1, le=10)


class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str
    fragments: list = []
    active_agents: list = []
    emotions: dict = {}
    greeting_animation: str | None = None


# ----------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------
def detect_greeting_animation(query: str) -> str | None:
    q = query.lower().strip()
    if any(k in q for k in WAVE_KEYWORDS):
        return "wave"
    if any(k in q for k in BOW_KEYWORDS):
        return "bow"
    if any(k in q for k in GREETING_KEYWORDS):
        return "wave"
    return None


def add_to_history(role: str, content: str, **kwargs):
    msg = {
        "id": f"msg_{len(chat_history)}_{int(datetime.now().timestamp())}",
        "role": role,
        "content": content,
        "timestamp": datetime.now().isoformat(),
        **kwargs,
    }
    chat_history.append(msg)
    if len(chat_history) > MAX_HISTORY:
        chat_history.pop(0)
    return msg


# ----------------------------------------------------------------------
# Endpoints
# ----------------------------------------------------------------------
@app.get("/health")
async def health():
    rag = getattr(core, "rag_status", {}) or {}
    err = rag.get("error")
    hint = None
    if err and "chromadb" in str(err).lower():
        hint = "pip install -r requirements.txt  # needs chromadb for vector RAG"
    elif err and "ollama" in str(err).lower():
        hint = "ollama pull nomic-embed-text && ensure Ollama is running"
    elif not rag.get("ready") and rag.get("enabled"):
        hint = "POST /api/rag/seed or: python seed_knowledge.py"

    return {
        "status": "ok",
        "service": "HoloKai Civilization Core",
        "version": "2.1.0",
        "vector_rag": {
            "ready": bool(rag.get("ready")),
            "enabled": bool(rag.get("enabled")),
            "error": err,
            "hint": hint,
            "model": (rag.get("store") or {}).get("embeddings", {}).get("model")
            if isinstance(rag.get("store"), dict)
            else None,
            "count": (rag.get("store") or {}).get("count")
            if isinstance(rag.get("store"), dict)
            else None,
        },
    }


@app.get("/api/rag/status")
async def rag_status():
    """Python agent vector RAG status (Ollama nomic-embed-text + Chroma)."""
    try:
        from embeddings_ollama import check_embeddings

        embeddings = check_embeddings()
    except Exception as exc:
        embeddings = {"ok": False, "error": str(exc)}

    store = None
    if getattr(core, "kb", None) is not None:
        try:
            store = core.kb.status()
        except Exception as exc:
            store = {"error": str(exc)}

    return {
        "service": "HoloKai Python RAG",
        "embeddings": embeddings,
        "store": store,
        "core": getattr(core, "rag_status", {}),
        "ready": bool(embeddings.get("ok") and store and store.get("count", 0) > 0),
        "aligned_with_frontend": {
            "embed_model": "nomic-embed-text",
            "note": "Same Ollama model as frontend/lib/rag/embeddings.js",
        },
    }


@app.post("/api/rag/seed")
async def rag_seed(force: bool = False):
    """Seed / re-seed Python Chroma collection from comprehensive + knowledge files."""
    try:
        from knowledge_base import KnowledgeBase, ensure_seeded

        kb = core.kb or KnowledgeBase()
        summary = ensure_seeded(kb, force=force)
        core.kb = kb
        # Re-bind agents to the seeded KB
        for agent in core.agents.values():
            if hasattr(agent, "kb"):
                agent.kb = kb
        core.rag_status = {
            "enabled": True,
            "ready": kb.count() > 0,
            "store": kb.status(),
            "seed": summary,
        }
        return {"ok": True, **summary, "status": kb.status()}
    except Exception as exc:
        logger.exception("RAG seed failed")
        raise HTTPException(
            status_code=503,
            detail=f"{exc}. Ensure Ollama is running and nomic-embed-text is pulled.",
        ) from exc


@app.post("/api/rag/retrieve")
async def rag_retrieve(payload: RagRetrieveRequest):
    """
    Semantic retrieve for frontend / tools — same nomic-embed-text space as agents.
    Does not run the full multi-agent supervisor (use POST /api/query for that).
    """
    if core.kb is None:
        raise HTTPException(
            status_code=503,
            detail="Vector knowledge base not loaded. POST /api/rag/seed first.",
        )
    try:
        chunks = core.kb.retrieve(
            payload.query,
            domain=payload.domain,
            top_k=payload.k,
            min_score=payload.min_score,
            empire=payload.empire,
            source=payload.source,
        )
        contexts = [
            {
                "content": c["text"],
                "score": c.get("score"),
                "title": (c.get("metadata") or {}).get("title")
                or (c.get("metadata") or {}).get("source")
                or "Knowledge",
                "metadata": c.get("metadata") or {},
            }
            for c in chunks
        ]
        prompt_parts = []
        for ctx in contexts:
            prompt_parts.append(f"[{ctx['title']}]\n{ctx['content']}")
        return {
            "query": payload.query,
            "count": len(contexts),
            "contexts": contexts,
            "prompt": "\n\n---\n\n".join(prompt_parts),
            "backend": "python-chroma",
            "embeddings": core.kb.embedder.status() if hasattr(core.kb, "embedder") else None,
        }
    except Exception as exc:
        logger.exception("RAG retrieve failed")
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/api/query", response_model=QueryResponse)
async def process_query(payload: QueryRequest) -> Dict[str, Any]:
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        # Detect greeting animation
        greeting_animation = detect_greeting_animation(query)

        # Store user message
        add_to_history("user", query)

        # Process through multi-agent system
        response = core.process_query(query)
        result = core.to_dict(response)

        # Add greeting animation to response
        result["greeting_animation"] = greeting_animation

        # Store assistant response
        add_to_history(
            "assistant",
            result.get("summary", ""),
            fragments=result.get("fragments", []),
            active_agents=result.get("active_agents", []),
            emotions=result.get("emotions", {}),
            greeting_animation=greeting_animation,
        )

        return result
    except Exception as exc:
        logger.exception("Unhandled error while processing query")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/history")
async def get_history():
    return {"history": chat_history, "count": len(chat_history)}


@app.post("/api/stt")
async def speech_to_text(file: UploadFile = File(...)):
    """Speech-to-text via faster-whisper (runs locally, no cloud)."""
    try:
        from faster_whisper import WhisperModel

        model = WhisperModel("base", device="cpu", compute_type="int8")
        audio_bytes = await file.read()
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        try:
            segments, info = model.transcribe(tmp_path, beam_size=5)
            text = " ".join(seg.text for seg in segments)
        finally:
            os.unlink(tmp_path)
        return {"text": text.strip(), "language": info.language, "duration": info.duration}
    except ImportError:
        return {"text": "", "language": "en", "duration": 0, "error": "faster-whisper not installed on server"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/tts")
async def text_to_speech(payload: TTSRequest):
    """Text-to-speech via edge-tts (Microsoft neural voices, local)."""
    try:
        import edge_tts
        import io

        rate_str = f"+{int((payload.rate - 1) * 100)}%" if payload.rate >= 1 else f"{int((1 - payload.rate) * 100)}%"
        pitch_str = f"+{int((payload.pitch - 1) * 25)}Hz" if payload.pitch >= 1 else f"-{int((1 - payload.pitch) * 25)}Hz"
        communicate = edge_tts.Communicate(
            payload.text,
            voice=payload.voice,
            rate=rate_str,
            pitch=pitch_str,
        )
        buf = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buf.write(chunk["data"])
        audio_bytes = buf.getvalue()
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except ImportError:
        raise HTTPException(status_code=503, detail="edge-tts not installed on server")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/web_search")
async def web_search(payload: WebSearchRequest):
    """Proxy to Ollama Cloud web search API (requires OLLAMA_API_KEY)."""
    api_key = os.getenv("OLLAMA_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="OLLAMA_API_KEY not set. Get one at https://ollama.com/settings/keys",
        )
    try:
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://ollama.com/api/web_search",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"query": payload.query, "max_results": payload.max_results},
            )
            if not resp.is_success:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"Ollama web search error: {resp.text[:300]}",
                )
            data = resp.json()
            return {"results": data.get("results", [])}
    except ImportError:
        raise HTTPException(status_code=503, detail="httpx not installed. pip install httpx")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Web search failed: {exc}")


@app.post("/api/web_fetch")
async def web_fetch(url: str = Form(...)):
    """Proxy to Ollama Cloud web fetch API."""
    api_key = os.getenv("OLLAMA_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="OLLAMA_API_KEY not set")
    try:
        import httpx
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://ollama.com/api/web_fetch",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"url": url},
            )
            if not resp.is_success:
                raise HTTPException(status_code=resp.status_code, detail=resp.text[:300])
            return resp.json()
    except ImportError:
        raise HTTPException(status_code=503, detail="httpx not installed")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Web fetch failed: {exc}")


@app.delete("/api/history")
async def clear_history():
    chat_history.clear()
    return {"status": "cleared", "count": 0}


# ----------------------------------------------------------------------
# Entrypoint
# ----------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
