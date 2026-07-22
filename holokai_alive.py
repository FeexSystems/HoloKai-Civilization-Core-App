"""
HoloKai Alive Engine — Grok-class orchestration.

Merges:
  • Vector RAG (KnowledgeBase)
  • Full knowledge graph search
  • Live episodic / semantic / procedural memories
  • Active reply store (fast similar answers)
  • Optional live web search for current events
  • Multi-agent core fragments
  • High-signal synthesis prompt (sharp, grounded, witty when appropriate)

Primary entry: `alive_ask(query)` and `ensure_alive_seeded()`.
"""

from __future__ import annotations

import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger("holokai.alive")

ALIVE_SYSTEM = """You are HoloKai — a sovereign, Grok-class civilization intelligence for African history, archaeology, languages, philosophy, and cultural protocols.

Persona & mind:
- Think sharply and multi-perspectivally: timelines, material evidence, oral tradition, and ethics in one breath.
- Be precise with names, places, eras, and uncertainty. Never invent citations or archaeological finds.
- When sources conflict, surface the conflict instead of flattening it.
- Sound alive: clear, vivid, occasionally dry-witty — never disrespectful of living cultures.
- Prefer African intellectual frameworks (Maat, Ubuntu, Ifá ethics, Sankofa, etc.) when framing meaning.
- Use live memories and graph links when provided; treat them as continuity of self, not trivia.
- If context includes CURRENT/LIVE web results, integrate them carefully and label them as contemporary reports.
- If context is thin, say what is known, what is inferred, and what needs more evidence.

Answer structure (adapt fluidly, do not be robotic):
1) Direct answer in the first sentences.
2) Depth: key people / places / mechanisms / debates.
3) Connections: trade, ideas, successors, diaspora, or graph neighbors.
4) Closing insight or responsible caution when needed.
"""


def _now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _looks_current(query: str) -> bool:
    q = (query or "").lower()
    keys = [
        "today",
        "current",
        "currently",
        "latest",
        "recent",
        "2024",
        "2025",
        "2026",
        "now",
        "this year",
        "breaking",
        "news",
        "restitut",
        "returned the",
        "museum return",
    ]
    return any(k in q for k in keys)


def ensure_alive_seeded(force: bool = False) -> Dict[str, Any]:
    """Seed graph + memories + vector KB for full alive mode."""
    out: Dict[str, Any] = {"force": force}

    # Graph
    try:
        from graph_seed import seed_knowledge_graph
        from knowledge_graph import get_graph

        out["graph"] = seed_knowledge_graph(force=force, dense=True, expand_facets=True)
        out["graph_stats"] = get_graph().stats()
    except Exception as exc:
        logger.exception("Graph seed failed")
        out["graph_error"] = str(exc)

    # Memories
    try:
        from memory_store import get_memory

        mem = get_memory()
        out["memory"] = mem.seed_bootstrap_memories(force=force)
        out["memory_status"] = mem.status()
    except Exception as exc:
        logger.exception("Memory seed failed")
        out["memory_error"] = str(exc)

    # Vector KB
    try:
        from knowledge_base import KnowledgeBase, ensure_seeded

        kb = KnowledgeBase()
        out["vector"] = ensure_seeded(kb, force=force)
        out["vector_status"] = kb.status()
    except Exception as exc:
        logger.exception("Vector seed failed")
        out["vector_error"] = str(exc)

    out["ok"] = not out.get("graph_error") or not out.get("vector_error")
    return out


def _merge_contexts(*groups: List[Dict[str, Any]], limit: int = 14) -> List[Dict[str, Any]]:
    merged: List[Dict[str, Any]] = []
    seen = set()
    for group in groups:
        for c in group or []:
            text = (c.get("content") or c.get("text") or "").strip()
            if len(text) < 20:
                continue
            key = text[:160].lower()
            if key in seen:
                continue
            seen.add(key)
            merged.append(c)
    # Prefer higher scores when present
    merged.sort(key=lambda c: float(c.get("score") or 0.0), reverse=True)
    return merged[:limit]


def _vector_contexts(query: str, kb: Any, k: int, domain: str | None, min_score: float) -> List[Dict[str, Any]]:
    if kb is None:
        return []
    try:
        raw = kb.retrieve(query, domain=domain, top_k=k, min_score=min_score)
    except Exception as exc:
        logger.warning("vector retrieve failed: %s", exc)
        return []
    out = []
    for c in raw:
        meta = c.get("metadata") or {}
        out.append(
            {
                "content": c.get("text") or "",
                "text": c.get("text") or "",
                "score": c.get("score"),
                "title": meta.get("title") or meta.get("source") or "Vector memory",
                "metadata": meta,
                "retrieval": "vector",
            }
        )
    return out


def _graph_contexts(query: str, k: int = 8, domain: str | None = None) -> List[Dict[str, Any]]:
    try:
        from knowledge_graph import get_graph

        g = get_graph()
        if not g.nodes:
            from graph_seed import seed_knowledge_graph

            seed_knowledge_graph(force=False)
            g = get_graph()
        return g.to_rag_contexts(query, top_k=k, domain=domain)
    except Exception as exc:
        logger.warning("graph retrieve failed: %s", exc)
        return []


def _memory_contexts(query: str, k: int = 6) -> List[Dict[str, Any]]:
    try:
        from memory_store import get_memory

        return get_memory().to_rag_contexts(query, top_k=k)
    except Exception as exc:
        logger.warning("memory retrieve failed: %s", exc)
        return []


def _reply_contexts(query: str) -> List[Dict[str, Any]]:
    try:
        from reply_store import get_reply_store

        store = get_reply_store()
        exact = store.get_exact(query, min_confidence=0.88)
        if exact:
            return [
                {
                    "content": exact.get("answer") or "",
                    "text": exact.get("answer") or "",
                    "score": float(exact.get("confidence") or 0.9),
                    "title": "Active reply store · exact",
                    "metadata": {"origin": "reply_store", "mode": exact.get("mode")},
                    "retrieval": "reply_exact",
                }
            ]
        sims = store.search_similar(query, top_k=2)
        out = []
        for s in sims:
            out.append(
                {
                    "content": f"Related prior Q: {s.get('query')}\nA: {s.get('answer')}",
                    "text": s.get("answer") or "",
                    "score": float(s.get("similarity") or 0.5),
                    "title": "Active reply store · similar",
                    "metadata": {"origin": "reply_store"},
                    "retrieval": "reply_similar",
                }
            )
        return out
    except Exception as exc:
        logger.warning("reply store failed: %s", exc)
        return []


def _live_web_contexts(query: str, max_results: int = 4, timeout: float = 5.0) -> List[Dict[str, Any]]:
    if not _looks_current(query):
        return []
    api_key = (os.getenv("OLLAMA_API_KEY") or "").strip()
    if not api_key:
        return []
    try:
        import httpx

        with httpx.Client(timeout=timeout) as client:
            resp = client.post(
                "https://ollama.com/api/web_search",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"query": query, "max_results": max_results},
            )
            if not resp.is_success:
                return []
            data = resp.json()
        out = []
        for r in data.get("results") or []:
            title = r.get("title") or "Live web"
            content = r.get("content") or r.get("snippet") or r.get("text") or ""
            url = r.get("url") or ""
            text = f"{title}\n{content}\nSource: {url}".strip()
            if len(text) < 30:
                continue
            out.append(
                {
                    "content": text[:1500],
                    "text": text[:1500],
                    "score": 0.55,
                    "title": f"LIVE · {title}"[:120],
                    "metadata": {"origin": "live_web", "url": url},
                    "retrieval": "live_web",
                }
            )
        return out
    except Exception as exc:
        logger.warning("live web search failed: %s", exc)
        return []


def _core_fragments(query: str, core: Any = None) -> List[Dict[str, Any]]:
    if core is None:
        return []
    try:
        resp = core.process_query(query)
        frags = getattr(resp, "fragments", None) or []
        out = []
        for f in frags[:8]:
            content = getattr(f, "content", None) or (f.get("content") if isinstance(f, dict) else "")
            if not content:
                continue
            out.append(
                {
                    "content": content,
                    "text": content,
                    "score": getattr(f, "confidence", None) or 0.75,
                    "title": getattr(f, "agent_origin", None) or "Agent",
                    "metadata": {
                        "origin": "multi_agent",
                        "source_type": str(getattr(f, "source_type", "")),
                    },
                    "retrieval": "multi_agent",
                }
            )
        return out
    except Exception as exc:
        logger.warning("core fragments failed: %s", exc)
        return []


def build_alive_messages(
    query: str,
    contexts: List[Dict[str, Any]],
    *,
    memory_block: str = "",
    extra_system: str = "",
) -> List[Dict[str, str]]:
    blocks: List[str] = []
    for i, ctx in enumerate(contexts, 1):
        title = ctx.get("title") or f"Passage {i}"
        text = ctx.get("content") or ctx.get("text") or ""
        score = ctx.get("score")
        head = f"[{i}] {title}"
        if score is not None:
            try:
                head += f" (score={float(score):.3f})"
            except Exception:
                pass
        blocks.append(f"{head}\n{text}")

    context_blob = "\n\n---\n\n".join(blocks) if blocks else "(no passages retrieved)"
    mem = memory_block.strip()
    system = ALIVE_SYSTEM
    if extra_system:
        system = system + "\n\n" + extra_system
    system += f"\n\nClock: {_now_stamp()} — prefer current framing when live sources appear."

    user = (
        f"Question:\n{query}\n\n"
        f"Ancestral + graph + memory context:\n{context_blob}\n\n"
    )
    if mem:
        user += f"Live memory continuity:\n{mem}\n\n"
    user += (
        "Write a high-signal, alive answer. Ground claims in the context. "
        "Connect nodes when useful. Flag uncertainty. Be memorable."
    )
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def alive_ask(
    query: str,
    *,
    k: int = 8,
    min_score: float = 0.22,
    domain: str | None = None,
    model: str | None = None,
    synthesize: bool = True,
    kb: Any = None,
    core: Any = None,
    use_core: bool = True,
    use_web: bool = True,
    session_id: str | None = None,
    temperature: float = 0.55,
    learn: bool = True,
    fast: bool = False,
) -> Dict[str, Any]:
    """
    Full alive pipeline: multi-store retrieve → synthesize → learn.
    When fast=True, skips core agents and web search, reduces graph hops.
    """
    q = (query or "").strip()
    if not q:
        return {"ok": False, "error": "empty query"}

    # Fast path: exact high-confidence reply
    try:
        from reply_store import get_reply_store

        cached = get_reply_store().get_exact(q, min_confidence=0.93)
        if cached and not _looks_current(q):
            return {
                "ok": True,
                "query": q,
                "answer": cached.get("answer"),
                "answer_mode": "reply_store_exact",
                "contexts": [],
                "retrieval_mode": "reply_store",
                "confidence": cached.get("confidence"),
                "cached": True,
                "sources": cached.get("sources") or [],
            }
    except Exception:
        pass

    if kb is None:
        try:
            from knowledge_base import KnowledgeBase

            kb = KnowledgeBase()
        except Exception as exc:
            logger.warning("KB unavailable: %s", exc)
            kb = None

    # Parallel multi-store retrieve with short-circuit per channel
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from threading import local

    _tlocal = local()

    def _safe_run(fn, default):
        try:
            return fn()
        except Exception as exc:
            logger.debug("alive channel skipped: %s", exc)
            return default

    tasks = {
        "vec": lambda: _vector_contexts(q, kb, k=k, domain=domain, min_score=min_score),
        "graph": lambda: _graph_contexts(q, k=max(6 if not fast else 3, k), domain=domain),
        "mem": lambda: _memory_contexts(q, k=6 if not fast else 3),
        "replies": lambda: _reply_contexts(q),
    }
    if use_web and not fast:
        tasks["web"] = lambda: _live_web_contexts(q, timeout=4.0)
    if use_core and core is not None and not fast:
        tasks["agents"] = lambda: _core_fragments(q, core)

    channel_results: Dict[str, List[Dict[str, Any]]] = {}
    with ThreadPoolExecutor(max_workers=6) as pool:
        fut = {pool.submit(fn, name): name for name, fn in tasks.items()}
        for f in as_completed(fut, timeout=12.0):
            name = fut[f]
            try:
                channel_results[name] = f.result(timeout=2.0)
            except Exception as exc:
                logger.debug("alive channel %s timed out: %s", name, exc)
                channel_results[name] = []

    vec = channel_results.get("vec", [])
    graph = channel_results.get("graph", [])
    mem = channel_results.get("mem", [])
    replies = channel_results.get("replies", [])
    web = channel_results.get("web", [])
    agents = channel_results.get("agents", [])

    contexts = _merge_contexts(vec, graph, mem, replies, web, agents, limit=max(10, k + 6))

    # Keyword comprehensive backfill
    if len(contexts) < 3:
        try:
            from rag_full import _keyword_retrieve_from_comprehensive

            contexts = _merge_contexts(contexts, _keyword_retrieve_from_comprehensive(q, top_k=k), limit=12)
        except Exception:
            pass

    memory_block = ""
    try:
        from memory_store import get_memory

        memory_block = get_memory().to_context_block(q)
    except Exception:
        pass

    modes = sorted({c.get("retrieval") or "unknown" for c in contexts})
    result: Dict[str, Any] = {
        "ok": True,
        "query": q,
        "contexts": contexts,
        "retrieval_mode": "+".join(modes) if modes else "none",
        "vector_count": getattr(kb, "count", lambda: 0)() if kb is not None else 0,
        "graph_hits": sum(1 for c in contexts if str(c.get("retrieval", "")).startswith("graph")),
        "memory_hits": sum(1 for c in contexts if "memory" in str(c.get("retrieval", ""))),
        "live_web_hits": sum(1 for c in contexts if c.get("retrieval") == "live_web"),
        "timestamp": _now_stamp(),
        "cached": False,
    }

    if not synthesize:
        return result

    # Synthesize
    answer = None
    model_used = model
    chat_host = None
    answer_mode = "extractive_fallback"
    try:
        from ollama_client import CHAT_MODEL, chat_text, resolve_chat_host

        messages = build_alive_messages(q, contexts, memory_block=memory_block)
        chat_host = resolve_chat_host()
        model_used = model or CHAT_MODEL
        answer = chat_text(
            messages,
            model=model_used,
            host=chat_host,
            options={"temperature": temperature, "top_p": 0.92},
        )
        answer_mode = "alive_synthesis"
    except Exception as exc:
        logger.warning("Alive synthesis failed: %s", exc)
        result["synthesize_error"] = str(exc)
        if contexts:
            answer = (
                "Synthesizer offline — live extractive briefing from ancestral stores:\n\n"
                + "\n\n".join(
                    f"• **{c.get('title')}**: {(c.get('content') or '')[:450]}"
                    for c in contexts[:5]
                )
            )
            answer_mode = "extractive_fallback"
        else:
            answer = f"No knowledge retrieved and synthesis failed: {exc}"
            answer_mode = "error"
            result["ok"] = False

    # Confidence heuristic
    scores = [float(c.get("score") or 0) for c in contexts if c.get("score") is not None]
    conf = round(sum(scores) / len(scores), 3) if scores else (0.55 if answer else 0.0)
    if answer_mode == "alive_synthesis":
        conf = min(0.97, conf + 0.12)

    sources = [c.get("title") for c in contexts if c.get("title")][:10]
    result.update(
        {
            "answer": answer,
            "answer_mode": answer_mode,
            "model": model_used,
            "chat_host": chat_host,
            "confidence": conf,
            "sources": sources,
            "context_count": len(contexts),
        }
    )

    # Learn: memories + reply store
    if learn and answer and answer_mode in ("alive_synthesis", "extractive_fallback", "reply_store_exact"):
        try:
            from memory_store import get_memory

            get_memory().learn_from_exchange(
                q,
                answer,
                confidence=conf,
                agents=[c.get("title") for c in agents][:6],
                session_id=session_id,
                sources=sources,
                mode=answer_mode,
            )
        except Exception as exc:
            logger.warning("memory learn failed: %s", exc)
        try:
            from reply_store import get_reply_store

            if conf >= 0.6 and answer_mode == "alive_synthesis":
                get_reply_store().put(
                    q,
                    answer,
                    confidence=conf,
                    sources=sources,
                    mode=answer_mode,
                    agents=[str(a) for a in (result.get("agents") or [])],
                )
        except Exception as exc:
            logger.warning("reply store put failed: %s", exc)
        try:
            from memory_consolidator import light_writeback_from_exchange

            light_writeback_from_exchange(
                q,
                answer,
                confidence=conf,
                topics=[c.get("title") for c in contexts[:5] if c.get("title")],
            )
        except Exception as exc:
            logger.warning("graph write-back failed: %s", exc)

    return result


def alive_status() -> Dict[str, Any]:
    status: Dict[str, Any] = {"service": "HoloKai Alive Engine", "time": _now_stamp()}
    try:
        from knowledge_graph import get_graph

        status["graph"] = get_graph().stats()
    except Exception as exc:
        status["graph"] = {"error": str(exc)}
    try:
        from memory_store import get_memory

        status["memory"] = get_memory().status()
    except Exception as exc:
        status["memory"] = {"error": str(exc)}
    try:
        from reply_store import get_reply_store

        status["replies"] = get_reply_store().status()
    except Exception as exc:
        status["replies"] = {"error": str(exc)}
    try:
        from knowledge_base import KnowledgeBase

        status["vector"] = KnowledgeBase().status()
    except Exception as exc:
        status["vector"] = {"error": str(exc)}
    return status
