"""
HoloKai Memory Consolidator — sleep-cycle learning + graph write-back.

- Cluster / reinforce episodic memories into durable semantic facts
- Promote high-confidence facts into knowledge graph nodes + edges
- Optionally re-index promoted facts into the vector store
- Decay low-value noise (mark archived, trim episodic tail)

Called after exchanges (light) and via CLI/API (full consolidate).
"""

from __future__ import annotations

import hashlib
import logging
import os
import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

logger = logging.getLogger("holokai.consolidate")

MIN_PROMOTE_CONF = float(os.getenv("HOLAKAI_PROMOTE_MIN_CONF", "0.62"))
MIN_CLUSTER = int(os.getenv("HOLAKAI_CONSOLIDATE_MIN_CLUSTER", "2"))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _tokens(text: str) -> Set[str]:
    return set(re.findall(r"[a-z0-9']+", (text or "").lower()))


def _jaccard(a: Set[str], b: Set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / max(1, len(a | b))


def _sid(*parts: str) -> str:
    raw = "::".join(parts)
    return "n_mem_" + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:14]


# Lightweight entity lexicon for graph linking (expandable)
EMPIRE_HINTS = {
    "kemet": "Kemet",
    "egypt": "Kemet",
    "mali": "Mali",
    "mansa": "Mali",
    "timbuktu": "Mali",
    "songhai": "Songhai",
    "askia": "Songhai",
    "kush": "Kush",
    "nubia": "Kush",
    "meroe": "Kush",
    "axum": "Axum",
    "aksum": "Axum",
    "zimbabwe": "Great Zimbabwe",
    "swahili": "Swahili City-States",
    "kilwa": "Swahili City-States",
    "benin": "Benin",
    "carthage": "Carthage",
    "hannibal": "Carthage",
    "ifa": "Yoruba",
    "yoruba": "Yoruba",
    "dogon": "Dogon",
    "adinkra": "Akan / Asante",
    "sankofa": "Akan / Asante",
    "ubuntu": "Bantu",
    "nsibidi": "Ejagham / Igbo / Cross River",
    "kongo": "Kongo",
    "ghana": "Ghana / Wagadu",
    "wagadu": "Ghana / Wagadu",
    "nok": "Nok",
}


def _infer_empire(text: str) -> str:
    t = (text or "").lower()
    for k, v in EMPIRE_HINTS.items():
        if k in t:
            return v
    return "HoloKai Living Memory"


def _infer_domain(text: str) -> str:
    t = (text or "").lower()
    if any(w in t for w in ("ethic", "restitut", "colonial", "ubuntu", "maat", "protocol")):
        return "ethics"
    if any(w in t for w in ("excav", "pottery", "bronze", "stone", "site", "archaeol")):
        return "archaeology"
    if any(w in t for w in ("language", "script", "hieroglyph", "nsibidi", "geez", "word")):
        return "linguistics"
    if any(w in t for w in ("ritual", "oral", "divin", "cosmol", "orisha")):
        return "anthropology"
    return "historian"


def consolidate_memories(
    *,
    promote_to_graph: bool = True,
    reindex_vector: bool = False,
    kb: Any = None,
    min_conf: float = MIN_PROMOTE_CONF,
    max_promotions: int = 40,
) -> Dict[str, Any]:
    """
    Full consolidation pass over the memory store.
    """
    from memory_store import get_memory
    from knowledge_graph import get_graph

    mem = get_memory()
    graph = get_graph()
    summary: Dict[str, Any] = {
        "started_at": _now(),
        "episodic_in": len(mem.episodic),
        "semantic_in": len(mem.semantic),
        "clusters": 0,
        "semantic_promoted": 0,
        "graph_nodes": 0,
        "graph_edges": 0,
        "vector_docs": 0,
        "archived_episodes": 0,
    }

    # --- 1) Cluster episodic by token overlap ---
    active_eps = [e for e in mem.episodic if not e.get("archived")]
    clusters: List[List[Dict[str, Any]]] = []
    used: Set[str] = set()
    for i, e in enumerate(active_eps):
        eid = e.get("id") or str(i)
        if eid in used:
            continue
        te = _tokens((e.get("query") or "") + " " + (e.get("answer") or "")[:400])
        cluster = [e]
        used.add(eid)
        for j, o in enumerate(active_eps[i + 1 :], start=i + 1):
            oid = o.get("id") or str(j)
            if oid in used:
                continue
            to = _tokens((o.get("query") or "") + " " + (o.get("answer") or "")[:400])
            if _jaccard(te, to) >= 0.28:
                cluster.append(o)
                used.add(oid)
        clusters.append(cluster)
    summary["clusters"] = len(clusters)

    promotions: List[Dict[str, Any]] = []
    for cluster in clusters:
        if len(cluster) < MIN_CLUSTER and float(cluster[0].get("confidence") or 0) < 0.85:
            continue
        # Build durable fact from best answer lead
        cluster.sort(key=lambda x: float(x.get("confidence") or 0), reverse=True)
        best = cluster[0]
        conf = min(
            0.96,
            sum(float(c.get("confidence") or 0.5) for c in cluster) / max(1, len(cluster))
            + 0.05 * (len(cluster) - 1),
        )
        if conf < min_conf:
            continue
        q = (best.get("query") or "").strip()
        a = " ".join((best.get("answer") or "").strip().split())[:480]
        if len(a) < 40:
            continue
        topics = best.get("topics") or []
        topic = topics[0] if topics else "african_civilizations"
        fact = f"Consolidated knowledge about '{q[:140]}': {a}"
        sm_id = mem.remember_semantic(
            fact=fact,
            topic=str(topic),
            source="consolidation",
            confidence=conf,
            metadata={
                "cluster_size": len(cluster),
                "episode_ids": [c.get("id") for c in cluster[:12]],
                "consolidated_at": _now(),
            },
        )
        summary["semantic_promoted"] += 1
        promotions.append(
            {
                "semantic_id": sm_id,
                "fact": fact,
                "confidence": conf,
                "topic": topic,
                "query": q,
            }
        )
        # Archive weaker duplicates in cluster (keep best episodic)
        for c in cluster[1:]:
            if not c.get("archived"):
                c["archived"] = True
                c["archived_at"] = _now()
                c["archived_reason"] = "consolidated"
                summary["archived_episodes"] += 1

    # Reinforce procedural: successful high-conf patterns
    for e in active_eps[-30:]:
        if float(e.get("confidence") or 0) >= 0.75:
            topics = e.get("topics") or ["general"]
            mem.remember_procedural(
                strategy=(
                    f"For topics {topics}, fuse vector+graph+memory and ground names/eras; "
                    f"prior success conf={e.get('confidence')}"
                ),
                trigger=(e.get("query") or "")[:200],
                success=True,
                confidence=float(e.get("confidence") or 0.7),
                metadata={"from_episode": e.get("id")},
            )

    mem.save()

    # --- 2) Graph write-back ---
    if promote_to_graph and promotions:
        # Find empire hub nodes for edges
        empire_hubs: Dict[str, str] = {}
        for nid, n in graph.nodes.items():
            if n.get("type") == "empire":
                empire_hubs[(n.get("empire") or n.get("name") or "").lower()] = nid

        for p in promotions[:max_promotions]:
            fact = p["fact"]
            empire = _infer_empire(fact + " " + (p.get("query") or ""))
            domain = _infer_domain(fact)
            node_id = _sid("sem", p.get("semantic_id") or fact[:40])
            graph.upsert_node(
                node_id,
                name=(p.get("query") or "Living memory fact")[:120],
                node_type="concept",
                summary=fact[:280],
                text=fact,
                domain=domain,
                empire=empire,
                region="Living memory",
                era="learned",
                themes=[str(p.get("topic") or "memory"), "living_memory", "consolidated"],
                confidence=float(p.get("confidence") or 0.7),
                metadata={
                    "origin": "memory_consolidation",
                    "semantic_id": p.get("semantic_id"),
                    "promoted_at": _now(),
                },
            )
            summary["graph_nodes"] += 1

            # Link to empire hub if present
            hub = None
            for key, hid in empire_hubs.items():
                if key and key in empire.lower():
                    hub = hid
                    break
            if hub:
                if graph.add_edge(
                    hub,
                    node_id,
                    rel_type="associative",
                    label="living_memory_about",
                    weight=float(p.get("confidence") or 0.7),
                    metadata={"origin": "memory_consolidation"},
                ):
                    summary["graph_edges"] += 1
            # Link related semantic siblings lightly
            if summary["graph_nodes"] > 1:
                # edge to previous promotion node
                pass

        graph.save()

    # --- 3) Optional vector reindex of promoted facts ---
    if reindex_vector and promotions:
        try:
            if kb is None:
                from knowledge_base import KnowledgeBase

                kb = KnowledgeBase()
            docs = []
            for p in promotions[:max_promotions]:
                docs.append(
                    {
                        "text": p["fact"],
                        "metadata": {
                            "origin": "memory_consolidation",
                            "source": "living_memory",
                            "title": (p.get("query") or "Living memory")[:120],
                            "domain": _infer_domain(p["fact"]),
                            "empire": _infer_empire(p["fact"]),
                        },
                    }
                )
            if docs:
                summary["vector_docs"] = kb.add_documents(docs)
        except Exception as exc:
            logger.warning("vector reindex after consolidate failed: %s", exc)
            summary["vector_error"] = str(exc)

    summary["finished_at"] = _now()
    summary["episodic_out"] = len(mem.episodic)
    summary["semantic_out"] = len(mem.semantic)
    summary["memory_counts"] = mem.counts()
    try:
        summary["graph_stats"] = graph.stats()
    except Exception:
        pass
    logger.info("Consolidation complete: %s", summary)
    return summary


def light_writeback_from_exchange(
    query: str,
    answer: str,
    *,
    confidence: float = 0.7,
    topics: Sequence[str] | None = None,
) -> Dict[str, Any]:
    """
    Lightweight post-answer graph write-back (does not full-cluster).
    Creates/updates a living-memory concept node linked to an empire hub.
    """
    if confidence < 0.68 or not answer or len(answer) < 60:
        return {"skipped": True, "reason": "low_conf_or_short"}

    from knowledge_graph import get_graph

    graph = get_graph()
    empire = _infer_empire(query + " " + answer)
    domain = _infer_domain(query + " " + answer)
    lead = " ".join(answer.strip().split())[:500]
    node_id = _sid("live", query[:80])
    fact = f"Live exchange · Q: {query[:160]}\nA: {lead}"
    graph.upsert_node(
        node_id,
        name=query[:120],
        node_type="concept",
        summary=lead[:280],
        text=fact,
        domain=domain,
        empire=empire,
        region="Living memory",
        era="learned",
        themes=list(topics or []) + ["living_memory", "episode_writeback"],
        confidence=confidence,
        metadata={"origin": "exchange_writeback", "written_at": _now()},
    )
    # hub link
    for nid, n in graph.nodes.items():
        if n.get("type") == "empire" and (n.get("empire") or "").lower() in empire.lower():
            graph.add_edge(
                nid,
                node_id,
                rel_type="associative",
                label="discussed_in_session",
                weight=confidence,
            )
            break
    graph.save()
    return {"skipped": False, "node_id": node_id, "empire": empire, "domain": domain}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(consolidate_memories(promote_to_graph=True, reindex_vector=False))
