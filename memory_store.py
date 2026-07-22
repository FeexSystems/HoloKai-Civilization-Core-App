"""
HoloKai Live Memory Store — episodic, semantic, and procedural memory.

Persists to ./holokai_memory/memories.json
- Episodic: user interactions, conversations, preferences signals
- Semantic: durable topic facts learned or reinforced from Q&A
- Procedural: response strategies that worked (high confidence)

Memories are retrieved into the active reply context so HoloKai stays
"alive" across turns and sessions.
"""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Set

logger = logging.getLogger("holokai.memory")

DEFAULT_MEMORY_DIR = os.getenv("HOLAKAI_MEMORY_PATH", "./holokai_memory")
MEMORY_FILE = "memories.json"

MAX_EPISODIC = int(os.getenv("HOLAKAI_MAX_EPISODIC", "5000"))
MAX_SEMANTIC = int(os.getenv("HOLAKAI_MAX_SEMANTIC", "3000"))
MAX_PROCEDURAL = int(os.getenv("HOLAKAI_MAX_PROCEDURAL", "1200"))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _tokens(text: str) -> Set[str]:
    return set(re.findall(r"[a-z0-9']+", (text or "").lower()))


def _score(query: str, *fields: str) -> float:
    q = _tokens(query)
    if not q:
        return 0.0
    blob = _tokens(" ".join(fields))
    if not blob:
        return 0.0
    inter = len(q & blob)
    if not inter:
        return 0.0
    return inter / max(1, len(q))


class MemoryStore:
    def __init__(self, persist_directory: str | None = None):
        self.persist_directory = Path(persist_directory or DEFAULT_MEMORY_DIR)
        self.path = self.persist_directory / MEMORY_FILE
        self.episodic: List[Dict[str, Any]] = []
        self.semantic: List[Dict[str, Any]] = []
        self.procedural: List[Dict[str, Any]] = []
        self.preferences: Dict[str, Any] = {}
        self.meta: Dict[str, Any] = {
            "version": 1,
            "created_at": _now(),
            "updated_at": _now(),
            "label": "HoloKai Live Memories",
        }
        self._load()

    def _load(self) -> None:
        if not self.path.is_file():
            return
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            self.episodic = list(data.get("episodic") or [])
            self.semantic = list(data.get("semantic") or [])
            self.procedural = list(data.get("procedural") or [])
            self.preferences = dict(data.get("preferences") or {})
            self.meta = data.get("meta") or self.meta
            logger.info(
                "MemoryStore loaded · episodic=%s semantic=%s procedural=%s",
                len(self.episodic),
                len(self.semantic),
                len(self.procedural),
            )
        except Exception as exc:
            logger.warning("Corrupt memory file (%s) — starting empty", exc)

    def save(self) -> None:
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        self.meta["updated_at"] = _now()
        self.meta["counts"] = self.counts()
        payload = {
            "meta": self.meta,
            "preferences": self.preferences,
            "episodic": self.episodic[-MAX_EPISODIC:],
            "semantic": self.semantic[-MAX_SEMANTIC:],
            "procedural": self.procedural[-MAX_PROCEDURAL:],
        }
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self.path)

    def counts(self) -> Dict[str, int]:
        return {
            "episodic": len(self.episodic),
            "semantic": len(self.semantic),
            "procedural": len(self.procedural),
            "preferences": len(self.preferences),
            "total": len(self.episodic) + len(self.semantic) + len(self.procedural),
        }

    def status(self) -> Dict[str, Any]:
        return {
            "path": str(self.path),
            "counts": self.counts(),
            "meta": self.meta,
            "preferences_keys": list(self.preferences.keys())[:40],
        }

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------
    def remember_episode(
        self,
        *,
        query: str,
        answer: str,
        role: str = "user_turn",
        topics: Sequence[str] | None = None,
        agents: Sequence[str] | None = None,
        confidence: float = 0.7,
        session_id: str | None = None,
        metadata: Dict[str, Any] | None = None,
    ) -> str:
        mid = f"ep_{uuid.uuid4().hex[:12]}"
        item = {
            "id": mid,
            "kind": "episodic",
            "role": role,
            "query": query,
            "answer": (answer or "")[:4000],
            "topics": list(topics or self._infer_topics(query + " " + (answer or ""))),
            "agents": list(agents or []),
            "confidence": float(confidence),
            "session_id": session_id,
            "metadata": metadata or {},
            "created_at": _now(),
            "access_count": 0,
        }
        self.episodic.append(item)
        if len(self.episodic) > MAX_EPISODIC:
            self.episodic = self.episodic[-MAX_EPISODIC:]
        self._update_preferences_from_query(query)
        self.save()
        return mid

    def remember_semantic(
        self,
        *,
        fact: str,
        topic: str = "general",
        source: str = "interaction",
        confidence: float = 0.75,
        metadata: Dict[str, Any] | None = None,
    ) -> str:
        # Dedup near-identical facts
        fact_l = fact.strip().lower()
        for existing in self.semantic:
            if existing.get("fact", "").strip().lower() == fact_l:
                existing["confidence"] = max(
                    float(existing.get("confidence") or 0), confidence
                )
                existing["reinforced_at"] = _now()
                existing["access_count"] = int(existing.get("access_count") or 0) + 1
                self.save()
                return existing["id"]
        mid = f"sm_{uuid.uuid4().hex[:12]}"
        self.semantic.append(
            {
                "id": mid,
                "kind": "semantic",
                "fact": fact.strip()[:2000],
                "topic": topic,
                "source": source,
                "confidence": float(confidence),
                "metadata": metadata or {},
                "created_at": _now(),
                "access_count": 0,
            }
        )
        if len(self.semantic) > MAX_SEMANTIC:
            self.semantic = self.semantic[-MAX_SEMANTIC:]
        self.save()
        return mid

    def remember_procedural(
        self,
        *,
        strategy: str,
        trigger: str,
        success: bool = True,
        confidence: float = 0.7,
        metadata: Dict[str, Any] | None = None,
    ) -> str:
        mid = f"pr_{uuid.uuid4().hex[:12]}"
        self.procedural.append(
            {
                "id": mid,
                "kind": "procedural",
                "strategy": strategy[:1500],
                "trigger": trigger[:500],
                "success": bool(success),
                "confidence": float(confidence),
                "metadata": metadata or {},
                "created_at": _now(),
                "access_count": 0,
            }
        )
        if len(self.procedural) > MAX_PROCEDURAL:
            self.procedural = self.procedural[-MAX_PROCEDURAL:]
        self.save()
        return mid

    def learn_from_exchange(
        self,
        query: str,
        answer: str,
        *,
        confidence: float = 0.7,
        agents: Sequence[str] | None = None,
        session_id: str | None = None,
        sources: Sequence[str] | None = None,
        mode: str = "rag",
    ) -> Dict[str, Any]:
        """Write episodic + light semantic/procedural memory after a successful reply."""
        topics = self._infer_topics(query + " " + answer)
        ep_id = self.remember_episode(
            query=query,
            answer=answer,
            topics=topics,
            agents=agents,
            confidence=confidence,
            session_id=session_id,
            metadata={"sources": list(sources or []), "mode": mode},
        )
        # Extract a compact semantic fact from the answer lead
        lead = " ".join((answer or "").strip().split())[:420]
        sm_id = None
        if lead and confidence >= 0.55:
            topic = topics[0] if topics else "african_civilizations"
            sm_id = self.remember_semantic(
                fact=f"Regarding '{query[:120]}': {lead}",
                topic=topic,
                source="exchange",
                confidence=min(0.92, confidence),
                metadata={"query": query[:200]},
            )
        pr_id = self.remember_procedural(
            strategy=f"Use {mode} with agents={list(agents or []) or ['HoloKai']}; ground in ancestral memory",
            trigger=query[:200],
            success=confidence >= 0.5,
            confidence=confidence,
            metadata={"topics": topics},
        )
        return {"episodic": ep_id, "semantic": sm_id, "procedural": pr_id, "topics": topics}

    def seed_bootstrap_memories(self, force: bool = False) -> Dict[str, int]:
        """Seed identity + topic procedural/semantic memories if empty."""
        if not force and (self.semantic or self.procedural):
            return {"skipped": 1, **self.counts()}

        identity_facts = [
            (
                "HoloKai is a multi-agent civilization core specializing in African history, archaeology, languages, and cultural protocols.",
                "identity",
            ),
            (
                "HoloKai grounds answers in ancestral knowledge (curated corpora + knowledge graph) and live session memories.",
                "identity",
            ),
            (
                "Vanguard archetypes (Kemet-Alpha, Asante-V, Sika-Gold, Zamani, Naja-7, Bantu-Node, Kush-Prime, Oluwa-Core) are persona lenses over the same knowledge core.",
                "vanguard",
            ),
            (
                "Maat (Kemet) and Ubuntu (Bantu philosophy) are ethical anchors for responsible cultural framing.",
                "ethics",
            ),
            (
                "Mansa Musa's 1324–25 pilgrimage spotlighted Mali's wealth and scholarship across Afro-Eurasia.",
                "mali",
            ),
            (
                "Axum controlled Red Sea trade and adopted Christianity under Ezana in the 4th century CE.",
                "axum",
            ),
            (
                "Great Zimbabwe's dry-stone architecture demonstrates state-level organization in medieval southern Africa.",
                "zimbabwe",
            ),
            (
                "The Swahili coast fused African, Arab, and Indian Ocean trade cultures; Kiswahili remains a major lingua franca.",
                "swahili",
            ),
            (
                "Ifá is a Yoruba knowledge system of divination and ethics mediated by babaláwo and the Odu corpus.",
                "ifa",
            ),
            (
                "Nsibidi is an indigenous West-Central African ideographic writing tradition associated with the Cross River region.",
                "nsibidi",
            ),
        ]
        for fact, topic in identity_facts:
            self.remember_semantic(fact=fact, topic=topic, source="bootstrap", confidence=0.95)

        strategies = [
            ("Prefer precise names, places, eras; flag contested claims.", "history"),
            ("When evidence is thin, state uncertainty rather than invent citations.", "epistemics"),
            ("Include Ethicist framing for contested or sensitive cultural topics.", "ethics"),
            ("Use graph neighbors to connect empires, people, and trade networks.", "graph"),
            ("Blend oral tradition with archaeological and written sources carefully.", "method"),
            ("For Vanguard replies, keep persona voice while staying factually grounded.", "persona"),
        ]
        for strategy, trigger in strategies:
            self.remember_procedural(
                strategy=strategy, trigger=trigger, success=True, confidence=0.9
            )

        # Synthetic episodic exemplars (system-wide memory texture)
        exemplars = [
            ("Who was Mansa Musa?", "Mansa Musa ruled Mali c. 1312–1337; his hajj (1324–25) made West African scholarship and gold famous."),
            ("What is Ma'at?", "Ma'at is Kemet's principle of truth, balance, justice, and cosmic order upheld against isfet (chaos)."),
            ("Tell me about Great Zimbabwe.", "Great Zimbabwe is a medieval dry-stone city complex in southern Africa, center of a powerful trading polity."),
        ]
        for q, a in exemplars:
            self.remember_episode(query=q, answer=a, confidence=0.9, role="bootstrap")

        self.save()
        return self.counts()

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------
    def retrieve(
        self,
        query: str,
        *,
        k_episodic: int = 4,
        k_semantic: int = 5,
        k_procedural: int = 3,
        min_score: float = 0.15,
    ) -> Dict[str, List[Dict[str, Any]]]:
        ep = self._rank(
            self.episodic,
            query,
            fields=lambda m: (m.get("query", ""), m.get("answer", ""), " ".join(m.get("topics") or [])),
            k=k_episodic,
            min_score=min_score,
        )
        sm = self._rank(
            self.semantic,
            query,
            fields=lambda m: (m.get("fact", ""), m.get("topic", "")),
            k=k_semantic,
            min_score=min_score,
        )
        pr = self._rank(
            self.procedural,
            query,
            fields=lambda m: (m.get("strategy", ""), m.get("trigger", "")),
            k=k_procedural,
            min_score=min_score * 0.8,
        )
        # bump access counts
        for group in (ep, sm, pr):
            for m in group:
                m["access_count"] = int(m.get("access_count") or 0) + 1
        if ep or sm or pr:
            self.save()
        return {"episodic": ep, "semantic": sm, "procedural": pr}

    def to_context_block(
        self,
        query: str,
        *,
        max_chars: int = 2800,
    ) -> str:
        packs = self.retrieve(query)
        parts: List[str] = []
        if self.preferences:
            prefs = ", ".join(f"{k}={v}" for k, v in list(self.preferences.items())[:8])
            parts.append(f"[User preferences] {prefs}")
        for m in packs["semantic"]:
            parts.append(f"[Semantic · {m.get('topic','')}] {m.get('fact','')}")
        for m in packs["episodic"]:
            parts.append(
                f"[Episodic] Q: {m.get('query','')[:180]} → A: {m.get('answer','')[:320]}"
            )
        for m in packs["procedural"]:
            parts.append(f"[Strategy] {m.get('strategy','')}")
        blob = "\n".join(parts)
        return blob[:max_chars]

    def to_rag_contexts(self, query: str, top_k: int = 6) -> List[Dict[str, Any]]:
        packs = self.retrieve(query)
        contexts: List[Dict[str, Any]] = []
        for m in packs["semantic"]:
            contexts.append(
                {
                    "content": m.get("fact", ""),
                    "text": m.get("fact", ""),
                    "score": m.get("_score", 0.5),
                    "title": f"Memory · {m.get('topic', 'semantic')}",
                    "metadata": {
                        "origin": "live_memory",
                        "kind": "semantic",
                        "memory_id": m.get("id"),
                    },
                    "retrieval": "memory_semantic",
                }
            )
        for m in packs["episodic"]:
            text = f"Prior exchange — Q: {m.get('query','')} A: {m.get('answer','')}"
            contexts.append(
                {
                    "content": text,
                    "text": text,
                    "score": m.get("_score", 0.45),
                    "title": "Memory · episode",
                    "metadata": {
                        "origin": "live_memory",
                        "kind": "episodic",
                        "memory_id": m.get("id"),
                    },
                    "retrieval": "memory_episodic",
                }
            )
        contexts.sort(key=lambda c: c.get("score") or 0, reverse=True)
        return contexts[:top_k]

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------
    def _rank(
        self,
        items: List[Dict[str, Any]],
        query: str,
        *,
        fields,
        k: int,
        min_score: float,
    ) -> List[Dict[str, Any]]:
        scored: List[Dict[str, Any]] = []
        for m in items:
            score = _score(query, *fields(m))
            # recency soft boost for episodic
            if m.get("kind") == "episodic" or "answer" in m:
                score += 0.02
            conf = float(m.get("confidence") or 0.5)
            score = score * (0.7 + 0.3 * conf)
            if score < min_score:
                continue
            scored.append({**m, "_score": round(score, 4)})
        scored.sort(key=lambda x: x["_score"], reverse=True)
        return scored[:k]

    def _infer_topics(self, text: str) -> List[str]:
        t = (text or "").lower()
        mapping = {
            "kemet": ["egypt", "kemet", "pharaoh", "pyramid", "maat", "nile"],
            "mali": ["mali", "mansa", "timbuktu", "musa"],
            "songhai": ["songhai", "askia", "gao"],
            "kush": ["nubia", "kush", "meroe", "kerma"],
            "axum": ["axum", "aksum", "ezana", "ethiopia"],
            "zimbabwe": ["zimbabwe", "shona"],
            "swahili": ["swahili", "kilwa", "zanzibar", "mombasa"],
            "benin": ["benin", "oba", "bronze"],
            "ifa": ["ifa", "orisha", "yoruba", "babalawo"],
            "dogon": ["dogon", "sirius", "nommo"],
            "ubuntu": ["ubuntu", "botho"],
            "adinkra": ["adinkra", "sankofa"],
            "nsibidi": ["nsibidi"],
            "carthage": ["carthage", "hannibal", "punic"],
            "vanguard": ["vanguard", "archetype"],
            "ethics": ["ethics", "protocol", "sensitive", "colonial"],
        }
        hits = [topic for topic, kws in mapping.items() if any(k in t for k in kws)]
        return hits or ["african_civilizations"]

    def _update_preferences_from_query(self, query: str) -> None:
        topics = self._infer_topics(query)
        pref = self.preferences.setdefault("topic_affinity", {})
        for t in topics:
            pref[t] = int(pref.get(t) or 0) + 1
        # track last queries lightly
        recent = self.preferences.setdefault("recent_topics", [])
        for t in topics:
            if t in recent:
                recent.remove(t)
            recent.insert(0, t)
        self.preferences["recent_topics"] = recent[:12]
        self.preferences["last_query_at"] = _now()


_MEMORY: MemoryStore | None = None


def get_memory(force_reload: bool = False) -> MemoryStore:
    global _MEMORY
    if _MEMORY is None or force_reload:
        _MEMORY = MemoryStore()
    return _MEMORY
