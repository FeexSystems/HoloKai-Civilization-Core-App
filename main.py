
from __future__ import annotations

import logging
import os
from typing import Any, Dict, List
from datetime import datetime

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel, Field

from holokai_backend import CivilizationCore
from grounding import build_grounded_answer, grounded_refusal_message
from catalog_backend import (
    ensure_storage_ready,
    facets as library_facets,
    get_source as library_get_source,
    persist_grounded,
    review_source as library_review_source,
    search_sources as library_search_sources,
    storage_status,
)
from job_manager import get_job as job_get, list_jobs as jobs_list, submit_job
from model_gateway import synthesize_with_gateway
from ris_pipeline import import_ris_file

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
    description=(
        "Multi-agent historical synthesis engine for African civilizations — "
        "full knowledge graph, live memories, and Grok-class Alive replies"
    ),
    version="3.0.0",
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


@app.on_event("startup")
async def startup_storage_init():
    try:
        info = ensure_storage_ready()
        logger.info("Storage init: %s", info)
    except Exception as exc:
        logger.warning("Storage init skipped: %s", exc)


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


class RagAskRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    k: int = Field(8, ge=1, le=20)
    min_score: float = Field(0.22, ge=0.0, le=1.0)
    domain: str | None = None
    model: str | None = Field(
        None, description="Chat model for synthesis (default HOLAKAI_CHAT_MODEL / gemma4)"
    )
    synthesize: bool = Field(True, description="If false, return contexts only")
    seed_if_empty: bool = Field(
        True, description="Auto-seed knowledge base when empty (Full RAG)"
    )
    use_alive: bool = Field(
        True, description="Use Alive Engine (graph + live memory + reply store)"
    )
    session_id: str | None = Field(None, description="Optional session id for live memory")


class AliveAskRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    k: int = Field(8, ge=1, le=20)
    min_score: float = Field(0.2, ge=0.0, le=1.0)
    domain: str | None = None
    model: str | None = None
    synthesize: bool = True
    use_web: bool = True
    use_core: bool = True
    session_id: str | None = None
    learn: bool = True
    fast: bool = Field(False, description="Skip web + core agents, reduce graph hops for faster response")


class GroundedAskRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    k: int = Field(10, ge=1, le=30)
    min_score: float = Field(0.2, ge=0.0, le=1.0)
    domain: str | None = None
    use_web: bool = True
    use_core: bool = True
    require_citations: bool = True
    prefer_hosted: bool = True
    hosted_model: str | None = None
    ollama_model: str | None = None


class StudioReviewRequest(BaseModel):
    slug: str = Field(..., min_length=1)
    decision: str = Field(..., min_length=1)
    notes: str = ""


class StudioImportRisRequest(BaseModel):
    path: str = Field(..., min_length=1, description="Absolute or project-relative path to RIS file")
    verify_doi: bool = False


class GatewaySynthesisRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    contexts: list = Field(default_factory=list)
    prefer_hosted: bool = True
    hosted_model: str | None = None
    ollama_model: str | None = None


class JobRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)


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
    grounded: dict = Field(default_factory=dict)
    citation_validation: dict = Field(default_factory=dict)
    canon_persist: dict = Field(default_factory=dict)


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=3000)


class OllamaChatRequest(BaseModel):
    messages: List[Dict[str, Any]] = Field(..., min_length=1)
    model: str | None = Field(
        None, description="Chat model (default HOLAKAI_CHAT_MODEL / gemma4)"
    )
    stream: bool = Field(True)
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    top_p: float = Field(0.9, ge=0.0, le=1.0)
    format: str | None = Field(None, description="e.g. json")
    think: bool | None = None
    tools: list | None = None
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


def attach_grounding(payload: Dict[str, Any], *, query: str, answer_key: str = "answer", contexts_key: str = "contexts") -> Dict[str, Any]:
    answer = str(payload.get(answer_key) or "")
    contexts = payload.get(contexts_key) or []
    grounded = build_grounded_answer(query=query, answer=answer, contexts=contexts)
    payload["grounded"] = grounded
    payload["citation_validation"] = {
        "claims": len(grounded.get("claims") or []),
        "supported_claims": grounded.get("supported_claim_count", 0),
        "citation_count": len(grounded.get("citation_index") or []),
        "insufficient_evidence": grounded.get("insufficient_evidence", False),
    }
    return payload


def execute_grounded_ask(payload: GroundedAskRequest) -> Dict[str, Any]:
    from holokai_alive import alive_ask

    retrieval = alive_ask(
        payload.query,
        k=payload.k,
        min_score=payload.min_score,
        domain=payload.domain,
        synthesize=False,
        kb=core.kb,
        core=core if payload.use_core else None,
        use_core=payload.use_core,
        use_web=payload.use_web,
        learn=False,
    )

    contexts = retrieval.get("contexts") or []
    gateway_answer = None
    gateway_meta: Dict[str, Any] = {}

    if contexts:
        try:
            gw = synthesize_with_gateway(
                query=payload.query,
                contexts=contexts,
                prefer_hosted=payload.prefer_hosted,
                hosted_model=payload.hosted_model,
                ollama_model=payload.ollama_model,
            )
            gateway_answer = gw.get("answer")
            gateway_meta = {
                "provider": gw.get("provider"),
                "model": gw.get("model"),
                "host": gw.get("host"),
            }
        except Exception as gateway_exc:
            logger.warning("Gateway synthesis fallback: %s", gateway_exc)

    if not gateway_answer:
        fallback = alive_ask(
            payload.query,
            k=payload.k,
            min_score=payload.min_score,
            domain=payload.domain,
            synthesize=True,
            kb=core.kb,
            core=core if payload.use_core else None,
            use_core=payload.use_core,
            use_web=payload.use_web,
            learn=True,
        )
        gateway_answer = fallback.get("answer") or ""
        if not contexts:
            contexts = fallback.get("contexts") or []
        gateway_meta = {
            "provider": "alive_fallback",
            "model": fallback.get("model"),
            "host": fallback.get("chat_host"),
        }

    response: Dict[str, Any] = {
        "ok": True,
        "query": payload.query,
        "answer": gateway_answer,
        "contexts": contexts,
        "retrieval_mode": retrieval.get("retrieval_mode") or "alive",
        "gateway": gateway_meta,
        "context_count": len(contexts),
    }

    attach_grounding(response, query=payload.query, answer_key="answer", contexts_key="contexts")

    if payload.require_citations and response["grounded"].get("insufficient_evidence"):
        response["ok"] = False
        response["answer"] = grounded_refusal_message(payload.query)
        response["refusal_reason"] = "insufficient_evidence"

    response["canon_persist"] = persist_grounded(payload.query, response.get("grounded") or {})

    if response.get("answer"):
        add_to_history("user", payload.query)
        add_to_history(
            "assistant",
            response.get("answer") or "",
            active_agents=["HoloKai Grounded"],
            fragments=response.get("contexts") or [],
            grounded=response.get("grounded") or {},
        )

    return response


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

    ollama_status = {}
    try:
        from ollama_client import status as ollama_status_fn

        ollama_status = ollama_status_fn()
    except Exception as exc:
        ollama_status = {"ok": False, "error": str(exc)}

    alive_snap: Dict[str, Any] = {}
    try:
        from holokai_alive import alive_status

        alive_snap = alive_status()
    except Exception as exc:
        alive_snap = {"error": str(exc)}

    return {
        "status": "ok",
        "service": "HoloKai Civilization Core",
        "version": "3.0.0",
        "mode": "alive",
        "ollama": ollama_status,
        "supervisor": getattr(getattr(core, "supervisor", None), "active_backend", None),
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
        "alive": {
            "graph_nodes": (alive_snap.get("graph") or {}).get("nodes"),
            "graph_edges": (alive_snap.get("graph") or {}).get("edges"),
            "memory_total": ((alive_snap.get("memory") or {}).get("counts") or {}).get("total"),
            "reply_store": (alive_snap.get("replies") or {}).get("count"),
            "detail": alive_snap,
        },
        "storage": storage_status(),
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


@app.post("/api/rag/ask")
async def rag_ask(payload: RagAskRequest):
    """
    Full RAG: retrieve + grounded answer via ollama.Client (local → cloud fallback).

    Embeddings: Ollama host chain, then minilm/hashing when HOLAKAI_FULL_RAG=1.
    Chat synthesis: local Ollama → https://ollama.com when OLLAMA_API_KEY is set.
    """
    try:
        from rag_full import ensure_full_rag_ready, full_rag_ask
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    kb = core.kb
    if payload.seed_if_empty and (kb is None or kb.count() == 0):
        try:
            ready = ensure_full_rag_ready(force_seed=False)
            if ready.get("ok"):
                from knowledge_base import KnowledgeBase

                kb = KnowledgeBase()
                core.kb = kb
                for agent in core.agents.values():
                    if hasattr(agent, "kb"):
                        agent.kb = kb
                core.rag_status = {
                    "enabled": True,
                    "ready": kb.count() > 0,
                    "store": kb.status(),
                    "seed": ready.get("seed"),
                }
        except Exception as exc:
            logger.warning("Full RAG auto-seed skipped: %s", exc)

    try:
        result = full_rag_ask(
            payload.query,
            k=payload.k,
            min_score=payload.min_score,
            domain=payload.domain,
            model=payload.model,
            synthesize=payload.synthesize,
            kb=kb,
            core=core if payload.use_alive else None,
            use_alive=payload.use_alive,
        )
        # Persist to short chat history for continuity
        if result.get("answer"):
            add_to_history("user", payload.query)
            add_to_history(
                "assistant",
                result.get("answer") or "",
                active_agents=["HoloKai Alive"] if result.get("alive") else ["HoloKai RAG"],
                fragments=result.get("contexts") or [],
            )
        grounded = attach_grounding(result, query=payload.query, answer_key="answer", contexts_key="contexts")
        grounded["canon_persist"] = persist_grounded(payload.query, grounded.get("grounded") or {})
        return grounded
    except Exception as exc:
        logger.exception("Full RAG ask failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/alive/ask")
async def alive_ask_endpoint(payload: AliveAskRequest):
    """Grok-class Alive ask: graph + live memory + vector + multi-agent + optional web."""
    try:
        from holokai_alive import alive_ask, ensure_alive_seeded
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if core.kb is None or core.kb.count() == 0:
        try:
            ensure_alive_seeded(force=False)
            from knowledge_base import KnowledgeBase

            core.kb = KnowledgeBase()
            for agent in core.agents.values():
                if hasattr(agent, "kb"):
                    agent.kb = core.kb
        except Exception as exc:
            logger.warning("Alive auto-seed: %s", exc)

    try:
        result = alive_ask(
            payload.query,
            k=payload.k,
            min_score=payload.min_score,
            domain=payload.domain,
            model=payload.model,
            synthesize=payload.synthesize,
            kb=core.kb,
            core=core if payload.use_core else None,
            use_core=payload.use_core,
            use_web=payload.use_web,
            session_id=payload.session_id,
            learn=payload.learn,
            fast=payload.fast,
        )
        if result.get("answer"):
            add_to_history("user", payload.query)
            add_to_history(
                "assistant",
                result.get("answer") or "",
                active_agents=["HoloKai Alive"],
                fragments=result.get("contexts") or [],
            )
        grounded = attach_grounding(result, query=payload.query, answer_key="answer", contexts_key="contexts")
        grounded["canon_persist"] = persist_grounded(payload.query, grounded.get("grounded") or {})
        return grounded
    except Exception as exc:
        logger.exception("Alive ask failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/api/alive/status")
async def alive_status_endpoint():
    try:
        from holokai_alive import alive_status

        return alive_status()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/alive/seed")
async def alive_seed_endpoint(force: bool = False):
    """Seed full graph + live memories + vector active store."""
    try:
        from holokai_alive import ensure_alive_seeded

        summary = ensure_alive_seeded(force=force)
        try:
            from knowledge_base import KnowledgeBase

            kb = KnowledgeBase()
            core.kb = kb
            for agent in core.agents.values():
                if hasattr(agent, "kb"):
                    agent.kb = kb
            core.rag_status = {
                "enabled": True,
                "ready": kb.count() > 0,
                "store": kb.status(),
                "seed": summary.get("vector"),
            }
        except Exception as exc:
            logger.warning("Rebind KB after alive seed: %s", exc)
        return {"ok": True, **summary}
    except Exception as exc:
        logger.exception("Alive seed failed")
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/api/graph/status")
async def graph_status():
    try:
        from knowledge_graph import get_graph

        return get_graph().status()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/graph/search")
async def graph_search(payload: RagRetrieveRequest):
    try:
        from knowledge_graph import get_graph
        from graph_seed import seed_knowledge_graph

        g = get_graph()
        if not g.nodes:
            seed_knowledge_graph(force=False)
            g = get_graph()
        hits = g.search(
            payload.query,
            top_k=payload.k,
            domain=payload.domain,
            empire=payload.empire,
        )
        return {"query": payload.query, "count": len(hits), "nodes": hits}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/memory/status")
async def memory_status():
    try:
        from memory_store import get_memory

        return get_memory().status()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/memory/retrieve")
async def memory_retrieve(payload: RagRetrieveRequest):
    try:
        from memory_store import get_memory

        mem = get_memory()
        packs = mem.retrieve(payload.query, k_episodic=payload.k, k_semantic=payload.k)
        return {
            "query": payload.query,
            "packs": packs,
            "context": mem.to_context_block(payload.query),
            "counts": mem.counts(),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/memory/consolidate")
async def memory_consolidate(
    promote_to_graph: bool = True,
    reindex_vector: bool = False,
):
    """
    Full consolidation pass over the memory store.
    Clusters episodic memories, promotes durable facts into knowledge graph, optionally re-indexes vector store.
    """
    try:
        from memory_consolidator import consolidate_memories

        result = consolidate_memories(
            promote_to_graph=promote_to_graph,
            reindex_vector=reindex_vector,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


class FusionRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    k: int = Field(12, ge=1, le=30)
    min_score: float = Field(0.22, ge=0.0, le=1.0)
    domain: str | None = None
    graph_hops: int = Field(1, ge=0, le=3)
    use_sparse: bool = True
    use_memory: bool = True
    use_reply: bool = True


@app.post("/api/rag/fusion")
async def rag_fusion(payload: FusionRequest):
    """
    Fusion retrieve: vector + graph hops + live memory + reply store, RRF-fused.
    Returns per-channel stats and fused context list.
    """
    try:
        from retrieve_fusion import fused_retrieve
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if core.kb is None:
        try:
            from knowledge_base import KnowledgeBase
            core.kb = KnowledgeBase()
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Vector knowledge base not loaded ({exc}). POST /api/rag/seed first.",
            ) from exc

    try:
        result = fused_retrieve(
            payload.query,
            kb=core.kb,
            k=payload.k,
            domain=payload.domain,
            min_score=payload.min_score,
            graph_hops=payload.graph_hops,
            use_sparse=payload.use_sparse,
            use_memory=payload.use_memory,
            use_reply=payload.use_reply,
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/rag/retrieve")
async def rag_retrieve(payload: RagRetrieveRequest):
    """
    Semantic retrieve for frontend / tools — same nomic-embed-text space as agents.
    Does not run the full multi-agent supervisor (use POST /api/query for that).
    """
    if core.kb is None:
        # Full RAG: try lazy init with hashing/minilm if Ollama embeds down
        try:
            from knowledge_base import KnowledgeBase

            core.kb = KnowledgeBase()
        except Exception as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Vector knowledge base not loaded ({exc}). POST /api/rag/seed or /api/rag/ask.",
            ) from exc
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


@app.post("/api/model/synthesize")
async def model_synthesize_endpoint(payload: GatewaySynthesisRequest):
    try:
        return synthesize_with_gateway(
            query=payload.query,
            contexts=payload.contexts,
            prefer_hosted=payload.prefer_hosted,
            hosted_model=payload.hosted_model,
            ollama_model=payload.ollama_model,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/grounded/ask")
async def grounded_ask_endpoint(payload: GroundedAskRequest):
    """
    Synchronous grounded ask (kept for compatibility).
    For production long-running synthesis, use POST /api/jobs/grounded-ask.
    """
    try:
        return execute_grounded_ask(payload)
    except Exception as exc:
        logger.exception("Grounded ask failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/api/jobs/grounded-ask")
async def grounded_ask_job_endpoint(payload: GroundedAskRequest):
    def _runner(raw: Dict[str, Any]) -> Dict[str, Any]:
        model = GroundedAskRequest(**raw)
        return execute_grounded_ask(model)

    return submit_job(job_type="grounded_synthesis", payload=payload.model_dump(), runner=_runner)


@app.get("/api/jobs")
async def jobs_list_endpoint(
    job_type: str | None = None,
    status: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    return jobs_list(job_type=job_type, status=status, limit=limit, offset=offset)


@app.get("/api/jobs/{job_id}")
async def job_status_endpoint(job_id: str):
    row = job_get(job_id)
    if not row:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    return row


@app.get("/api/storage/status")
async def storage_status_endpoint():
    return storage_status()


@app.post("/api/storage/init")
async def storage_init_endpoint(request: Request):
    role = (request.headers.get("x-holokai-role") or "public-reader").strip().lower()
    if role not in {"administrator"}:
        raise HTTPException(status_code=403, detail="Administrator role required")
    return ensure_storage_ready()


@app.get("/api/library/facets")
async def library_facets_endpoint():
    return library_facets()


@app.get("/api/library/search")
async def library_search_endpoint(
    q: str = Query("", description="Free text search"),
    region: str | None = None,
    era: str | None = None,
    language: str | None = None,
    evidence_type: str | None = None,
    editorial_status: str | None = "reviewed",
    peer_reviewed: bool | None = None,
    civilization: str | None = None,
    type: str | None = Query(None, description="Source type / item_type filter"),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    return library_search_sources(
        q=q,
        region=region,
        era=era,
        language=language,
        evidence_type=evidence_type,
        editorial_status=editorial_status,
        peer_reviewed=peer_reviewed,
        civilization=civilization,
        item_type=type,
        limit=limit,
        offset=offset,
    )


@app.get("/api/library/{slug}")
async def library_source_endpoint(slug: str):
    row = library_get_source(slug)
    if not row:
        raise HTTPException(status_code=404, detail=f"Source not found: {slug}")
    return row


@app.get("/api/studio/queue")
async def studio_queue_endpoint(limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    return library_search_sources(editorial_status=None, limit=limit, offset=offset)


@app.post("/api/studio/review")
async def studio_review_endpoint(payload: StudioReviewRequest, request: Request):
    role = (request.headers.get("x-holokai-role") or "public-reader").strip().lower()
    if role not in {"editor", "reviewer", "administrator"}:
        raise HTTPException(status_code=403, detail="Editor, reviewer, or administrator role required")
    try:
        return library_review_source(payload.slug, payload.decision, reviewer_role=role, notes=payload.notes)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/studio/import-ris")
async def studio_import_ris_endpoint(
    payload: StudioImportRisRequest,
    request: Request,
    enqueue: bool = Query(True, description="Queue import in background job"),
):
    role = (request.headers.get("x-holokai-role") or "public-reader").strip().lower()
    if role not in {"administrator", "editor"}:
        raise HTTPException(status_code=403, detail="Administrator/editor role required")

    def _runner(raw: Dict[str, Any]) -> Dict[str, Any]:
        return import_ris_file(raw["path"], verify_doi=bool(raw.get("verify_doi")))

    if enqueue:
        return submit_job(
            job_type="ris_import",
            payload=payload.model_dump(),
            runner=_runner,
        )

    try:
        return import_ris_file(payload.path, verify_doi=payload.verify_doi)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/jobs/import-ris")
async def import_ris_job_endpoint(payload: StudioImportRisRequest, request: Request):
    role = (request.headers.get("x-holokai-role") or "public-reader").strip().lower()
    if role not in {"administrator", "editor"}:
        raise HTTPException(status_code=403, detail="Administrator/editor role required")

    def _runner(raw: Dict[str, Any]) -> Dict[str, Any]:
        return import_ris_file(raw["path"], verify_doi=bool(raw.get("verify_doi")))

    return submit_job(
        job_type="ris_import",
        payload=payload.model_dump(),
        runner=_runner,
    )


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

        # Enrich with graph + live memory fragments (non-destructive)
        try:
            from knowledge_graph import get_graph
            from memory_store import get_memory

            g_hits = get_graph().to_rag_contexts(query, top_k=3)
            m_hits = get_memory().to_rag_contexts(query, top_k=2)
            for h in g_hits + m_hits:
                result.setdefault("fragments", []).append(
                    {
                        "content": h.get("content"),
                        "confidence": float(h.get("score") or 0.7),
                        "agent_origin": "Ancestral Graph"
                        if h.get("retrieval", "").startswith("graph")
                        else "Live Memory",
                        "source_type": h.get("retrieval") or "memory",
                        "citation": h.get("title"),
                        "metadata": h.get("metadata") or {},
                    }
                )
            # Learn from multi-agent summary
            if result.get("summary"):
                get_memory().learn_from_exchange(
                    query,
                    result["summary"],
                    confidence=float(result.get("confidence") or 0.7),
                    agents=result.get("active_agents") or [],
                    mode="multi_agent",
                )
        except Exception as enrich_exc:
            logger.warning("Query enrich/learn skipped: %s", enrich_exc)

        # Build claim-level grounding for /api/query response using fragments as evidence contexts
        frag_contexts = []
        for f in result.get("fragments", []):
            frag_contexts.append(
                {
                    "content": f.get("content") if isinstance(f, dict) else "",
                    "title": (f.get("citation") if isinstance(f, dict) else None)
                    or (f.get("metadata", {}).get("title") if isinstance(f, dict) else None)
                    or "Knowledge Fragment",
                    "score": (f.get("confidence") if isinstance(f, dict) else None),
                    "retrieval": (f.get("source_type") if isinstance(f, dict) else None),
                    "metadata": (f.get("metadata") if isinstance(f, dict) else {}) or {},
                }
            )
        # attach_grounding reads contexts from a payload key; use a temporary key
        result["__tmp__"] = frag_contexts
        attach_grounding(result, query=query, answer_key="summary", contexts_key="__tmp__")
        result.pop("__tmp__", None)
        result["canon_persist"] = persist_grounded(query, result.get("grounded") or {})

        # Store assistant response
        add_to_history(
            "assistant",
            result.get("summary", ""),
            fragments=result.get("fragments", []),
            active_agents=result.get("active_agents", []),
            emotions=result.get("emotions", {}),
            greeting_animation=greeting_animation,
            grounded=result.get("grounded") or {},
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


@app.get("/api/ollama/status")
async def ollama_status():
    """Ollama client status (local + cloud, via ollama-python)."""
    try:
        from ollama_client import status as ollama_status_fn

        return ollama_status_fn()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/ollama/tags")
async def ollama_tags():
    """List models — same shape as Ollama /api/tags for the frontend proxy."""
    try:
        from ollama_client import list_models, resolve_chat_host

        host = resolve_chat_host()
        names = list_models(host, purpose="chat")
        return {
            "models": [{"name": n, "model": n} for n in names],
            "host": host,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama unreachable: {exc}",
        ) from exc


@app.post("/api/ollama/chat")
async def ollama_chat(payload: OllamaChatRequest):
    """
    Chat via official ollama-python client (local or cloud).
    Keeps OLLAMA_API_KEY server-side — browser should call this, not ollama.com directly.
    """
    import json as _json

    model = payload.model or os.getenv("HOLAKAI_CHAT_MODEL") or os.getenv(
        "NEXT_PUBLIC_OLLAMA_MODEL", "gemma4"
    )
    options = {"temperature": payload.temperature, "top_p": payload.top_p}

    try:
        from ollama_client import OllamaClientError, chat, stream_chat_ndjson
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="ollama package missing — pip install ollama",
        ) from exc

    if not payload.stream:
        try:
            resp = chat(
                payload.messages,
                model=model,
                stream=False,
                options=options,
                format=payload.format,
                tools=payload.tools,
                think=payload.think,
            )
        except OllamaClientError as exc:
            raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        # Normalize to Ollama native response shape
        message = getattr(resp, "message", None)
        if message is not None:
            content = getattr(message, "content", "") or ""
            tool_calls = getattr(message, "tool_calls", None)
            body: Dict[str, Any] = {
                "model": model,
                "message": {"role": "assistant", "content": content},
                "done": True,
            }
            if tool_calls:
                body["message"]["tool_calls"] = tool_calls
            return body
        if isinstance(resp, dict):
            return resp
        return {"model": model, "message": {"role": "assistant", "content": str(resp)}, "done": True}

    def generate():
        try:
            for chunk in stream_chat_ndjson(
                payload.messages,
                model=model,
                options=options,
                format=payload.format,
                tools=payload.tools,
                think=payload.think,
            ):
                yield _json.dumps(chunk) + "\n"
        except Exception as exc:
            yield _json.dumps({"error": str(exc), "done": True}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")


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
