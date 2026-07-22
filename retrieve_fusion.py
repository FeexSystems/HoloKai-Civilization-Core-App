"""
HoloKai Retrieval Fusion — vector cosine + graph hops + live memory (+ sparse).

Uses Reciprocal Rank Fusion (RRF) with channel weights so Alive answers
draw from the full inventory, multi-hop graph paths, and living memory.
"""

from __future__ import annotations

import logging
import os
import re
from collections import defaultdict
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

logger = logging.getLogger("holokai.fusion")

# Channel weights (env-overridable)
W_VECTOR = float(os.getenv("HOLAKAI_FUSION_W_VECTOR", "1.0"))
W_GRAPH = float(os.getenv("HOLAKAI_FUSION_W_GRAPH", "0.95"))
W_GRAPH_HOP = float(os.getenv("HOLAKAI_FUSION_W_GRAPH_HOP", "0.75"))
W_MEMORY = float(os.getenv("HOLAKAI_FUSION_W_MEMORY", "0.85"))
W_SPARSE = float(os.getenv("HOLAKAI_FUSION_W_SPARSE", "0.55"))
W_REPLY = float(os.getenv("HOLAKAI_FUSION_W_REPLY", "0.7"))
W_WEB = float(os.getenv("HOLAKAI_FUSION_W_WEB", "0.5"))
W_AGENT = float(os.getenv("HOLAKAI_FUSION_W_AGENT", "0.8"))
RRF_K = int(os.getenv("HOLAKAI_FUSION_RRF_K", "60"))


def _tokens(text: str) -> Set[str]:
    return set(re.findall(r"[a-z0-9']+", (text or "").lower()))


def _text_key(text: str) -> str:
    t = re.sub(r"\s+", " ", (text or "").strip().lower())
    return t[:180]


def _channel_weight(retrieval: str) -> float:
    r = (retrieval or "").lower()
    if r == "vector":
        return W_VECTOR
    if r == "graph":
        return W_GRAPH
    if r in ("graph_neighbor", "graph_hop", "graph_path"):
        return W_GRAPH_HOP
    if "memory" in r:
        return W_MEMORY
    if r in ("sparse", "keyword", "bm25"):
        return W_SPARSE
    if r.startswith("reply"):
        return W_REPLY
    if r == "live_web":
        return W_WEB
    if r in ("multi_agent", "agent"):
        return W_AGENT
    return 0.6


def rrf_fuse(
    ranked_lists: Sequence[Sequence[Dict[str, Any]]],
    *,
    k: int = RRF_K,
    limit: int = 12,
) -> List[Dict[str, Any]]:
    """
    Reciprocal Rank Fusion across ranked context lists.
    Each item needs content/text; optional score, title, retrieval, metadata.
    """
    scores: Dict[str, float] = defaultdict(float)
    best: Dict[str, Dict[str, Any]] = {}
    channels: Dict[str, Set[str]] = defaultdict(set)

    for lst in ranked_lists:
        for rank, item in enumerate(lst):
            text = (item.get("content") or item.get("text") or "").strip()
            if len(text) < 20:
                continue
            key = _text_key(text)
            ret = str(item.get("retrieval") or "unknown")
            w = _channel_weight(ret)
            # RRF + soft native score boost
            native = float(item.get("score") or 0.0)
            scores[key] += w * (1.0 / (k + rank + 1)) + 0.08 * w * min(1.0, max(0.0, native))
            channels[key].add(ret)
            prev = best.get(key)
            if prev is None or native >= float(prev.get("score") or 0):
                best[key] = {**item, "content": text, "text": text}

    fused: List[Dict[str, Any]] = []
    for key, sc in scores.items():
        item = dict(best[key])
        item["fusion_score"] = round(sc, 6)
        item["score"] = round(max(float(item.get("score") or 0), sc), 6)
        ch = sorted(channels[key])
        item["fusion_channels"] = ch
        meta = dict(item.get("metadata") or {})
        meta["fusion_channels"] = "|".join(ch)
        item["metadata"] = meta
        if len(ch) > 1:
            item["retrieval"] = f"fusion:{'+'.join(ch[:3])}"
        fused.append(item)

    fused.sort(key=lambda x: x.get("fusion_score") or 0, reverse=True)
    return fused[:limit]


def sparse_retrieve_from_graph(query: str, top_k: int = 8) -> List[Dict[str, Any]]:
    """Lightweight BM25-ish keyword score over graph node texts."""
    try:
        from knowledge_graph import get_graph

        g = get_graph()
    except Exception:
        return []
    q = _tokens(query)
    if not q or not g.nodes:
        return []
    scored: List[Tuple[float, Dict[str, Any]]] = []
    for n in g.nodes.values():
        blob = f"{n.get('name','')} {n.get('summary','')} {(n.get('text') or '')[:800]}"
        t = _tokens(blob)
        if not t:
            continue
        inter = len(q & t)
        if inter == 0:
            continue
        # simple tf-like
        score = inter / max(1.0, len(q)) + 0.15 * min(1.0, inter / 4.0)
        if score < 0.2:
            continue
        text = (n.get("text") or n.get("summary") or n.get("name") or "").strip()
        if len(text) < 30:
            continue
        scored.append(
            (
                score,
                {
                    "content": text,
                    "text": text,
                    "score": round(score, 4),
                    "title": n.get("name") or "Sparse graph",
                    "metadata": {
                        "origin": "sparse_graph",
                        "node_id": n.get("id"),
                        "type": n.get("type"),
                        "empire": n.get("empire"),
                        "domain": n.get("domain"),
                    },
                    "retrieval": "sparse",
                },
            )
        )
    scored.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored[:top_k]]


def graph_hop_contexts(
    query: str,
    *,
    seed_k: int = 5,
    hops: int = 1,
    max_extra: int = 6,
    domain: str | None = None,
) -> List[Dict[str, Any]]:
    """Seed graph search then expand neighbors (multi-hop ancestral paths)."""
    try:
        from knowledge_graph import get_graph

        g = get_graph()
    except Exception as exc:
        logger.warning("graph hop: %s", exc)
        return []
    if not g.nodes:
        return []

    seeds = g.search(query, top_k=seed_k, domain=domain, expand_neighbors=0)
    out: List[Dict[str, Any]] = []
    seen: Set[str] = set()
    for s in seeds:
        text = (s.get("text") or s.get("summary") or "").strip()
        if len(text) < 20:
            continue
        nid = s.get("id")
        if nid:
            seen.add(nid)
        out.append(
            {
                "content": text,
                "text": text,
                "score": s.get("score", 0.5),
                "title": s.get("name") or "Graph",
                "metadata": {
                    "origin": "knowledge_graph",
                    "node_id": nid,
                    "type": s.get("type"),
                    "empire": s.get("empire"),
                    "domain": s.get("domain"),
                    "retrieval": "graph",
                },
                "retrieval": "graph",
            }
        )

    # Expand hops from seed ids
    frontier = [s.get("id") for s in seeds if s.get("id")]
    for hop in range(max(1, hops)):
        nxt: List[str] = []
        for nid in frontier:
            for nb in g.neighbors(nid, depth=1)[:4]:
                bid = nb.get("id")
                if not bid or bid in seen:
                    continue
                seen.add(bid)
                nxt.append(bid)
                text = (nb.get("text") or nb.get("summary") or "").strip()
                if len(text) < 30:
                    continue
                via = nb.get("via_edge") or {}
                out.append(
                    {
                        "content": text,
                        "text": text,
                        "score": 0.45 * (0.85**hop),
                        "title": f"{nb.get('name')} · hop{hop+1}",
                        "metadata": {
                            "origin": "knowledge_graph",
                            "node_id": bid,
                            "type": nb.get("type"),
                            "empire": nb.get("empire"),
                            "hop": hop + 1,
                            "edge_type": via.get("type"),
                            "edge_label": via.get("label"),
                            "from_node": nid,
                        },
                        "retrieval": "graph_hop",
                    }
                )
                if sum(1 for c in out if c.get("retrieval") == "graph_hop") >= max_extra:
                    return out
        frontier = nxt
        if not frontier:
            break
    return out


def vector_contexts(
    query: str,
    kb: Any,
    *,
    k: int = 8,
    domain: str | None = None,
    min_score: float = 0.22,
) -> List[Dict[str, Any]]:
    if kb is None:
        return []
    try:
        raw = kb.retrieve(query, domain=domain, top_k=k, min_score=min_score)
    except Exception as exc:
        logger.warning("vector retrieve: %s", exc)
        return []
    out = []
    for c in raw:
        meta = c.get("metadata") or {}
        out.append(
            {
                "content": c.get("text") or "",
                "text": c.get("text") or "",
                "score": c.get("score"),
                "title": meta.get("title") or meta.get("source") or "Vector",
                "metadata": meta,
                "retrieval": "vector",
            }
        )
    return out


def memory_contexts(query: str, k: int = 6) -> List[Dict[str, Any]]:
    try:
        from memory_store import get_memory

        return get_memory().to_rag_contexts(query, top_k=k)
    except Exception as exc:
        logger.warning("memory retrieve: %s", exc)
        return []


def reply_contexts(query: str) -> List[Dict[str, Any]]:
    try:
        from reply_store import get_reply_store

        store = get_reply_store()
        exact = store.get_exact(query, min_confidence=0.88)
        out: List[Dict[str, Any]] = []
        if exact:
            out.append(
                {
                    "content": exact.get("answer") or "",
                    "text": exact.get("answer") or "",
                    "score": float(exact.get("confidence") or 0.9),
                    "title": "Reply store · exact",
                    "metadata": {"origin": "reply_store"},
                    "retrieval": "reply_exact",
                }
            )
        for s in store.search_similar(query, top_k=2):
            out.append(
                {
                    "content": f"Related prior Q: {s.get('query')}\nA: {s.get('answer')}",
                    "text": s.get("answer") or "",
                    "score": float(s.get("similarity") or 0.5),
                    "title": "Reply store · similar",
                    "metadata": {"origin": "reply_store"},
                    "retrieval": "reply_similar",
                }
            )
        return out
    except Exception:
        return []


def fused_retrieve(
    query: str,
    *,
    kb: Any = None,
    k: int = 12,
    domain: str | None = None,
    min_score: float = 0.22,
    graph_hops: int = 1,
    use_sparse: bool = True,
    use_memory: bool = True,
    use_reply: bool = True,
    extra_lists: Optional[Sequence[Sequence[Dict[str, Any]]]] = None,
) -> Dict[str, Any]:
    """
    Full fusion retrieve for Alive / RAG.
    Returns contexts + per-channel counts + mode string.
    """
    lists: List[List[Dict[str, Any]]] = []
    stats: Dict[str, int] = {}

    vec = vector_contexts(query, kb, k=max(k, 8), domain=domain, min_score=min_score)
    lists.append(vec)
    stats["vector"] = len(vec)

    graph = graph_hop_contexts(query, seed_k=6, hops=graph_hops, max_extra=8, domain=domain)
    lists.append(graph)
    stats["graph"] = sum(1 for c in graph if c.get("retrieval") == "graph")
    stats["graph_hop"] = sum(1 for c in graph if c.get("retrieval") == "graph_hop")

    if use_sparse:
        sparse = sparse_retrieve_from_graph(query, top_k=8)
        lists.append(sparse)
        stats["sparse"] = len(sparse)

    if use_memory:
        mem = memory_contexts(query, k=6)
        lists.append(mem)
        stats["memory"] = len(mem)

    if use_reply:
        rep = reply_contexts(query)
        lists.append(rep)
        stats["reply"] = len(rep)

    for extra in extra_lists or []:
        lists.append(list(extra))

    contexts = rrf_fuse(lists, limit=k)
    modes = sorted({c.get("retrieval") or "?" for c in contexts})
    return {
        "query": query,
        "contexts": contexts,
        "stats": stats,
        "retrieval_mode": "fusion:" + "+".join(modes[:6]) if modes else "fusion:empty",
        "count": len(contexts),
    }
