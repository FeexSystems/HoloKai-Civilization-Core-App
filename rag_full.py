"""
HoloKai Full RAG — retrieve + synthesize via ollama.Client (local → cloud).

Pipeline:
  1. Embed query (Ollama host chain → minilm/hashing offline fallback)
  2. Vector retrieve from KnowledgeBase (or keyword fallback if empty)
  3. Grounded answer via ollama chat (local → cloud)

Usage:
  from rag_full import full_rag_ask
  result = full_rag_ask("What was the Mali Empire?")
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger("holokai.rag_full")


def _keyword_score(query: str, text: str) -> float:
    q = set(re.findall(r"[a-z0-9]+", (query or "").lower()))
    if not q:
        return 0.0
    t = set(re.findall(r"[a-z0-9]+", (text or "").lower()))
    if not t:
        return 0.0
    return len(q & t) / max(1, len(q))


def _keyword_retrieve_from_comprehensive(query: str, top_k: int = 5) -> List[Dict[str, Any]]:
    try:
        from knowledge_base_comprehensive import get_all_entries
    except Exception as exc:
        logger.warning("comprehensive KB unavailable: %s", exc)
        return []

    scored: List[Dict[str, Any]] = []
    for entry in get_all_entries():
        if isinstance(entry, dict):
            text = entry.get("text") or entry.get("content") or entry.get("body") or ""
            title = entry.get("title") or entry.get("source") or "Knowledge"
            meta = {k: v for k, v in entry.items() if k not in ("text", "content", "body")}
        else:
            text = str(entry)
            title = "Knowledge"
            meta = {}
        score = _keyword_score(query, f"{title} {text}")
        if score <= 0:
            continue
        scored.append(
            {
                "text": text,
                "content": text,
                "score": score,
                "title": title,
                "metadata": meta,
                "retrieval": "keyword",
            }
        )
    scored.sort(key=lambda c: c["score"], reverse=True)
    return scored[:top_k]


def full_rag_ask(
    query: str,
    *,
    k: int = 5,
    min_score: float = 0.22,
    domain: str | None = None,
    model: str | None = None,
    synthesize: bool = True,
    kb: Any = None,
    core: Any = None,
    use_alive: bool | None = None,
) -> Dict[str, Any]:
    """
    Full RAG ask with ollama.Client cloud fallback for chat.

    When HOLAKAI_ALIVE=1 (default), routes through the Alive Engine:
    vector + knowledge graph + live memories + reply store + optional live web.
    """
    from embeddings_ollama import check_embeddings
    from ollama_client import synthesize_rag_answer, status as ollama_status

    if use_alive is None:
        use_alive = os.getenv("HOLAKAI_ALIVE", "1").strip().lower() not in (
            "0",
            "false",
            "no",
            "off",
        )

    if use_alive:
        try:
            from holokai_alive import alive_ask

            result = alive_ask(
                query,
                k=max(k, 8),
                min_score=min_score,
                domain=domain,
                model=model,
                synthesize=synthesize,
                kb=kb,
                core=core,
                use_core=core is not None,
                use_web=True,
                learn=True,
            )
            emb_status = check_embeddings()
            result["embeddings"] = emb_status
            result["ollama"] = ollama_status()
            result["alive"] = True
            return result
        except Exception as exc:
            logger.warning("Alive engine failed, falling back to classic RAG: %s", exc)

    emb_status = check_embeddings()
    contexts: List[Dict[str, Any]] = []
    retrieval_mode = "none"
    vector_count = 0
    kb_error = None

    # Vector path
    try:
        if kb is None:
            from knowledge_base import KnowledgeBase

            kb = KnowledgeBase()
        vector_count = kb.count()
        if vector_count > 0:
            raw = kb.retrieve(
                query, domain=domain, top_k=k, min_score=min_score
            )
            for c in raw:
                contexts.append(
                    {
                        "content": c.get("text") or "",
                        "text": c.get("text") or "",
                        "score": c.get("score"),
                        "title": (c.get("metadata") or {}).get("title")
                        or (c.get("metadata") or {}).get("source")
                        or "Knowledge",
                        "metadata": c.get("metadata") or {},
                        "retrieval": "vector",
                    }
                )
            retrieval_mode = "vector"
        else:
            retrieval_mode = "empty_store"
    except Exception as exc:
        kb_error = str(exc)
        logger.warning("Vector retrieve failed: %s", exc)
        retrieval_mode = "vector_error"

    # Graph + memory soft merge
    try:
        from knowledge_graph import get_graph

        g = get_graph()
        if g.nodes:
            for c in g.to_rag_contexts(query, top_k=max(3, k // 2)):
                contexts.append(c)
            retrieval_mode = "hybrid_graph" if retrieval_mode == "vector" else "graph"
    except Exception:
        pass
    try:
        from memory_store import get_memory

        for c in get_memory().to_rag_contexts(query, top_k=3):
            contexts.append(c)
    except Exception:
        pass

    # Keyword fallback for Full RAG when vectors missing/weak
    if len(contexts) < max(1, k // 2):
        extra = _keyword_retrieve_from_comprehensive(query, top_k=k)
        if extra:
            seen = {c["content"] for c in contexts}
            for e in extra:
                if e["content"] in seen:
                    continue
                contexts.append(e)
                seen.add(e["content"])
            retrieval_mode = (
                "hybrid" if "vector" in retrieval_mode or retrieval_mode == "vector" else "keyword"
            )

    # Dedupe + cap
    deduped: List[Dict[str, Any]] = []
    seen_t = set()
    for c in contexts:
        key = (c.get("content") or "")[:140]
        if key in seen_t:
            continue
        seen_t.add(key)
        deduped.append(c)
    contexts = deduped[: max(k, 8)]
    result: Dict[str, Any] = {
        "ok": True,
        "query": query,
        "contexts": contexts,
        "retrieval_mode": retrieval_mode,
        "vector_count": vector_count,
        "embeddings": emb_status,
        "ollama": ollama_status(),
        "kb_error": kb_error,
        "alive": False,
    }

    if not synthesize:
        return result

    try:
        synth = synthesize_rag_answer(query, contexts, model=model)
        result.update(synth)
        result["ok"] = True
        # Learn from classic path too
        if result.get("answer"):
            try:
                from memory_store import get_memory
                from reply_store import get_reply_store

                get_memory().learn_from_exchange(
                    query, result["answer"], confidence=0.7, mode="classic_rag"
                )
                get_reply_store().put(
                    query, result["answer"], confidence=0.7, mode="classic_rag"
                )
            except Exception:
                pass
    except Exception as exc:
        logger.warning("RAG synthesize failed: %s", exc)
        # Still return contexts — partial Full RAG
        result["ok"] = bool(contexts)
        result["answer"] = None
        result["synthesize_error"] = str(exc)
        # Extractive fallback
        if contexts:
            result["answer"] = (
                "Synthesizer unavailable. Top passages:\n\n"
                + "\n\n".join(
                    f"• {c.get('title')}: {(c.get('content') or '')[:400]}"
                    for c in contexts[:3]
                )
            )
            result["answer_mode"] = "extractive_fallback"
        else:
            result["answer"] = (
                "No knowledge passages retrieved and chat synthesis failed: "
                f"{exc}"
            )
            result["answer_mode"] = "error"

    return result


def ensure_full_rag_ready(force_seed: bool = False) -> Dict[str, Any]:
    """
    Ensure embeddings + optional seed so Full RAG can retrieve.
    Uses hashing/minilm when Ollama embeds are down (HOLAKAI_FULL_RAG=1).
    """
    from embeddings_ollama import check_embeddings
    from knowledge_base import KnowledgeBase, ensure_seeded

    emb = check_embeddings()
    if not emb.get("ok"):
        return {"ok": False, "embeddings": emb, "seed": None}

    kb = KnowledgeBase()
    seed = None
    if force_seed or kb.count() == 0:
        seed = ensure_seeded(kb, force=force_seed)
    return {
        "ok": True,
        "embeddings": emb,
        "count": kb.count(),
        "seed": seed,
        "status": kb.status(),
    }
