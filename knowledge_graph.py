"""
HoloKai Knowledge Graph — entities, relationships, and graph-aware retrieval.

Persists to ./holokai_graph/graph.json by default.
Supports people / places / events / concepts + hierarchical, associative,
causal, spatial, and temporal edges. Used as the active full-node store
alongside the vector reply path.
"""

from __future__ import annotations

import json
import logging
import math
import os
import re
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple

logger = logging.getLogger("holokai.graph")

DEFAULT_GRAPH_DIR = os.getenv("HOLAKAI_GRAPH_PATH", "./holokai_graph")
GRAPH_FILE = "graph.json"

NODE_TYPES = ("person", "place", "event", "concept", "artifact", "empire", "work", "system")
REL_TYPES = (
    "hierarchical",
    "associative",
    "causal",
    "spatial",
    "temporal",
    "influences",
    "located_in",
    "part_of",
    "related_to",
    "contemporary_of",
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _tokens(text: str) -> Set[str]:
    return set(re.findall(r"[a-z0-9']+", (text or "").lower()))


def _score_query(query: str, *fields: str) -> float:
    q = _tokens(query)
    if not q:
        return 0.0
    blob = _tokens(" ".join(fields))
    if not blob:
        return 0.0
    inter = len(q & blob)
    if not inter:
        return 0.0
    # Jaccard-ish with length bonus for denser nodes
    j = inter / max(1, len(q))
    density = min(1.0, len(blob) / 40.0)
    return j * 0.85 + density * 0.15 * (1.0 if inter >= 2 else 0.6)


class KnowledgeGraph:
    """In-process knowledge graph with JSON persistence."""

    def __init__(self, persist_directory: str | None = None):
        self.persist_directory = Path(persist_directory or DEFAULT_GRAPH_DIR)
        self.path = self.persist_directory / GRAPH_FILE
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.edges: Dict[str, Dict[str, Any]] = {}
        self.meta: Dict[str, Any] = {
            "version": 1,
            "created_at": _now(),
            "updated_at": _now(),
            "label": "HoloKai Civilization Graph",
        }
        self._load()

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------
    def _load(self) -> None:
        if not self.path.is_file():
            return
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            self.nodes = data.get("nodes") or {}
            self.edges = data.get("edges") or {}
            self.meta = data.get("meta") or self.meta
            logger.info(
                "KnowledgeGraph loaded · nodes=%s edges=%s path=%s",
                len(self.nodes),
                len(self.edges),
                self.path,
            )
        except Exception as exc:
            logger.warning("Corrupt graph file %s (%s) — starting empty", self.path, exc)
            self.nodes, self.edges = {}, {}

    def save(self) -> None:
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        self.meta["updated_at"] = _now()
        self.meta["node_count"] = len(self.nodes)
        self.meta["edge_count"] = len(self.edges)
        payload = {
            "meta": self.meta,
            "nodes": self.nodes,
            "edges": self.edges,
        }
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self.path)

    def clear(self) -> None:
        self.nodes.clear()
        self.edges.clear()
        self.meta["updated_at"] = _now()
        self.save()

    # ------------------------------------------------------------------
    # Mutators
    # ------------------------------------------------------------------
    def upsert_node(
        self,
        node_id: str | None = None,
        *,
        name: str,
        node_type: str = "concept",
        summary: str = "",
        text: str = "",
        domain: str = "historian",
        empire: str = "",
        region: str = "",
        era: str = "",
        themes: Sequence[str] | None = None,
        aliases: Sequence[str] | None = None,
        metadata: Dict[str, Any] | None = None,
        confidence: float = 0.9,
    ) -> str:
        nid = node_id or f"n_{uuid.uuid4().hex[:12]}"
        node_type = (node_type or "concept").lower()
        if node_type not in NODE_TYPES:
            node_type = "concept"
        body = (text or summary or name).strip()
        existing = self.nodes.get(nid) or {}
        self.nodes[nid] = {
            **existing,
            "id": nid,
            "name": name,
            "type": node_type,
            "summary": summary or existing.get("summary") or body[:280],
            "text": body,
            "domain": domain,
            "empire": empire,
            "region": region,
            "era": era,
            "themes": list(themes or existing.get("themes") or []),
            "aliases": list(aliases or existing.get("aliases") or []),
            "confidence": float(confidence),
            "metadata": {**(existing.get("metadata") or {}), **(metadata or {})},
            "updated_at": _now(),
            "created_at": existing.get("created_at") or _now(),
        }
        return nid

    def add_edge(
        self,
        source: str,
        target: str,
        *,
        rel_type: str = "associative",
        label: str = "",
        weight: float = 1.0,
        metadata: Dict[str, Any] | None = None,
        edge_id: str | None = None,
    ) -> str | None:
        if source not in self.nodes or target not in self.nodes:
            return None
        rel_type = (rel_type or "associative").lower()
        if rel_type not in REL_TYPES:
            rel_type = "associative"
        eid = edge_id or f"e_{uuid.uuid4().hex[:12]}"
        self.edges[eid] = {
            "id": eid,
            "source": source,
            "target": target,
            "type": rel_type,
            "label": label or rel_type,
            "weight": float(weight),
            "metadata": metadata or {},
            "created_at": _now(),
        }
        return eid

    def bulk_upsert(
        self,
        nodes: Iterable[Dict[str, Any]],
        edges: Iterable[Dict[str, Any]] | None = None,
        *,
        save: bool = True,
    ) -> Dict[str, int]:
        n_count = 0
        for n in nodes:
            self.upsert_node(
                n.get("id"),
                name=n.get("name") or n.get("title") or "Untitled",
                node_type=n.get("type") or n.get("node_type") or "concept",
                summary=n.get("summary") or "",
                text=n.get("text") or n.get("content") or "",
                domain=n.get("domain") or "historian",
                empire=n.get("empire") or "",
                region=n.get("region") or "",
                era=n.get("era") or "",
                themes=n.get("themes") or [],
                aliases=n.get("aliases") or [],
                metadata=n.get("metadata") or {},
                confidence=float(n.get("confidence") or 0.9),
            )
            n_count += 1
        e_count = 0
        for e in edges or []:
            if self.add_edge(
                e.get("source") or e.get("from"),
                e.get("target") or e.get("to"),
                rel_type=e.get("type") or e.get("rel_type") or "associative",
                label=e.get("label") or "",
                weight=float(e.get("weight") or 1.0),
                metadata=e.get("metadata") or {},
                edge_id=e.get("id"),
            ):
                e_count += 1
        if save:
            self.save()
        return {"nodes_upserted": n_count, "edges_added": e_count}

    # ------------------------------------------------------------------
    # Query
    # ------------------------------------------------------------------
    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        return self.nodes.get(node_id)

    def neighbors(self, node_id: str, depth: int = 1) -> List[Dict[str, Any]]:
        seen: Set[str] = {node_id}
        frontier = {node_id}
        out: List[Dict[str, Any]] = []
        for _ in range(max(1, depth)):
            nxt: Set[str] = set()
            for eid, e in self.edges.items():
                s, t = e["source"], e["target"]
                if s in frontier and t not in seen:
                    seen.add(t)
                    nxt.add(t)
                    node = self.nodes.get(t)
                    if node:
                        out.append({**node, "via_edge": e})
                elif t in frontier and s not in seen:
                    seen.add(s)
                    nxt.add(s)
                    node = self.nodes.get(s)
                    if node:
                        out.append({**node, "via_edge": e})
            frontier = nxt
            if not frontier:
                break
        return out

    def search(
        self,
        query: str,
        *,
        top_k: int = 12,
        node_type: str | None = None,
        domain: str | None = None,
        empire: str | None = None,
        min_score: float = 0.12,
        expand_neighbors: int = 1,
    ) -> List[Dict[str, Any]]:
        scored: List[Tuple[float, Dict[str, Any]]] = []
        for node in self.nodes.values():
            if node_type and node.get("type") != node_type:
                continue
            if domain and node.get("domain") != domain:
                continue
            if empire and (node.get("empire") or "").lower() != empire.lower():
                continue
            score = _score_query(
                query,
                node.get("name", ""),
                " ".join(node.get("aliases") or []),
                node.get("summary", ""),
                node.get("text", "")[:1200],
                " ".join(node.get("themes") or []),
                node.get("empire", ""),
                node.get("region", ""),
                node.get("era", ""),
            )
            if score < min_score:
                continue
            scored.append((score, node))
        scored.sort(key=lambda x: x[0], reverse=True)
        hits = scored[:top_k]
        results: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()
        for score, node in hits:
            nid = node["id"]
            if nid in seen_ids:
                continue
            seen_ids.add(nid)
            item = {
                **node,
                "score": round(score, 4),
                "retrieval": "graph",
            }
            results.append(item)
            if expand_neighbors > 0:
                for nb in self.neighbors(nid, depth=1)[:expand_neighbors]:
                    if nb["id"] in seen_ids:
                        continue
                    seen_ids.add(nb["id"])
                    results.append(
                        {
                            **nb,
                            "score": round(score * 0.72, 4),
                            "retrieval": "graph_neighbor",
                        }
                    )
        results.sort(key=lambda r: r.get("score", 0), reverse=True)
        return results[: top_k + expand_neighbors * min(3, top_k)]

    def to_rag_contexts(
        self,
        query: str,
        *,
        top_k: int = 8,
        domain: str | None = None,
        empire: str | None = None,
    ) -> List[Dict[str, Any]]:
        hits = self.search(query, top_k=top_k, domain=domain, empire=empire)
        contexts: List[Dict[str, Any]] = []
        for h in hits:
            text = h.get("text") or h.get("summary") or h.get("name") or ""
            if not text.strip():
                continue
            contexts.append(
                {
                    "content": text,
                    "text": text,
                    "score": h.get("score", 0.5),
                    "title": h.get("name") or "Graph node",
                    "metadata": {
                        "origin": "knowledge_graph",
                        "node_id": h.get("id"),
                        "type": h.get("type"),
                        "domain": h.get("domain"),
                        "empire": h.get("empire"),
                        "region": h.get("region"),
                        "era": h.get("era"),
                        "themes": "|".join(h.get("themes") or []),
                        "retrieval": h.get("retrieval", "graph"),
                    },
                    "retrieval": h.get("retrieval", "graph"),
                }
            )
        return contexts

    def export_documents_for_vector(
        self,
        *,
        max_nodes: int | None = None,
        min_text_len: int = 40,
    ) -> List[Dict[str, Any]]:
        """Flatten graph nodes into vector-KB documents."""
        docs: List[Dict[str, Any]] = []
        nodes = list(self.nodes.values())
        # Prefer denser / higher confidence nodes first
        nodes.sort(
            key=lambda n: (float(n.get("confidence") or 0), len(n.get("text") or "")),
            reverse=True,
        )
        if max_nodes is not None:
            nodes = nodes[:max_nodes]
        for n in nodes:
            text = (n.get("text") or n.get("summary") or "").strip()
            if len(text) < min_text_len:
                continue
            docs.append(
                {
                    "text": text,
                    "metadata": {
                        "origin": "knowledge_graph",
                        "source": n.get("empire") or n.get("id") or "graph",
                        "title": n.get("name") or "Graph node",
                        "domain": n.get("domain") or "historian",
                        "node_id": n.get("id"),
                        "type": n.get("type"),
                        "empire": n.get("empire") or "",
                        "region": n.get("region") or "",
                        "era": n.get("era") or "",
                        "themes": "|".join(n.get("themes") or []),
                    },
                }
            )
        return docs

    def stats(self) -> Dict[str, Any]:
        by_type: Dict[str, int] = defaultdict(int)
        by_domain: Dict[str, int] = defaultdict(int)
        by_empire: Dict[str, int] = defaultdict(int)
        for n in self.nodes.values():
            by_type[n.get("type") or "?"] += 1
            by_domain[n.get("domain") or "?"] += 1
            emp = n.get("empire") or "general"
            by_empire[emp] += 1
        by_rel: Dict[str, int] = defaultdict(int)
        for e in self.edges.values():
            by_rel[e.get("type") or "?"] += 1
        return {
            "nodes": len(self.nodes),
            "edges": len(self.edges),
            "by_type": dict(by_type),
            "by_domain": dict(by_domain),
            "by_empire": dict(sorted(by_empire.items(), key=lambda x: -x[1])[:30]),
            "by_relationship": dict(by_rel),
            "path": str(self.path),
            "meta": self.meta,
        }

    def status(self) -> Dict[str, Any]:
        return self.stats()


# Singleton helpers
_GRAPH: KnowledgeGraph | None = None


def get_graph(force_reload: bool = False) -> KnowledgeGraph:
    global _GRAPH
    if _GRAPH is None or force_reload:
        _GRAPH = KnowledgeGraph()
    return _GRAPH
