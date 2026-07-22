"""
HoloKai Active Reply Store — caches high-quality answers for live reuse.

Stores successful replies keyed by normalized query fingerprints.
Improves real-time answers when the same or similar questions return.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger("holokai.replies")

DEFAULT_REPLY_DIR = os.getenv("HOLAKAI_REPLY_PATH", "./holokai_replies")
REPLY_FILE = "replies.json"
MAX_REPLIES = int(os.getenv("HOLAKAI_MAX_REPLIES", "4000"))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _norm(text: str) -> str:
    t = re.sub(r"\s+", " ", (text or "").strip().lower())
    t = re.sub(r"[^\w\s']", "", t)
    return t


def _tokens(text: str) -> Set[str]:
    return set(re.findall(r"[a-z0-9']+", (text or "").lower()))


def fingerprint(query: str) -> str:
    return hashlib.sha256(_norm(query).encode("utf-8")).hexdigest()[:24]


class ReplyStore:
    def __init__(self, persist_directory: str | None = None):
        self.persist_directory = Path(persist_directory or DEFAULT_REPLY_DIR)
        self.path = self.persist_directory / REPLY_FILE
        self.replies: Dict[str, Dict[str, Any]] = {}
        self.meta: Dict[str, Any] = {
            "version": 1,
            "created_at": _now(),
            "updated_at": _now(),
        }
        self._load()

    def _load(self) -> None:
        if not self.path.is_file():
            return
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            self.replies = data.get("replies") or {}
            self.meta = data.get("meta") or self.meta
            logger.info("ReplyStore loaded · %s replies", len(self.replies))
        except Exception as exc:
            logger.warning("Corrupt reply store (%s)", exc)

    def save(self) -> None:
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        self.meta["updated_at"] = _now()
        self.meta["count"] = len(self.replies)
        # prune oldest by last_used if over cap
        if len(self.replies) > MAX_REPLIES:
            items = sorted(
                self.replies.items(),
                key=lambda kv: kv[1].get("last_used") or kv[1].get("created_at") or "",
            )
            for k, _ in items[: max(0, len(self.replies) - MAX_REPLIES)]:
                self.replies.pop(k, None)
        payload = {"meta": self.meta, "replies": self.replies}
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self.path)

    def put(
        self,
        query: str,
        answer: str,
        *,
        confidence: float = 0.7,
        sources: List[str] | None = None,
        mode: str = "alive",
        agents: List[str] | None = None,
        metadata: Dict[str, Any] | None = None,
    ) -> str:
        if not answer or len(answer.strip()) < 40:
            return ""
        fp = fingerprint(query)
        existing = self.replies.get(fp)
        if existing and float(existing.get("confidence") or 0) > confidence + 0.05:
            existing["hits"] = int(existing.get("hits") or 0) + 1
            existing["last_used"] = _now()
            self.save()
            return existing["id"]
        rid = existing.get("id") if existing else f"rp_{uuid.uuid4().hex[:12]}"
        self.replies[fp] = {
            "id": rid,
            "fingerprint": fp,
            "query": query[:500],
            "answer": answer[:8000],
            "confidence": float(confidence),
            "sources": list(sources or []),
            "mode": mode,
            "agents": list(agents or []),
            "metadata": metadata or {},
            "hits": int(existing.get("hits") or 0) + 1 if existing else 1,
            "created_at": (existing or {}).get("created_at") or _now(),
            "last_used": _now(),
        }
        self.save()
        return rid

    def get_exact(self, query: str, min_confidence: float = 0.72) -> Optional[Dict[str, Any]]:
        fp = fingerprint(query)
        item = self.replies.get(fp)
        if not item:
            return None
        if float(item.get("confidence") or 0) < min_confidence:
            return None
        item["hits"] = int(item.get("hits") or 0) + 1
        item["last_used"] = _now()
        self.save()
        return item

    def search_similar(
        self,
        query: str,
        *,
        top_k: int = 3,
        min_score: float = 0.45,
        min_confidence: float = 0.6,
    ) -> List[Dict[str, Any]]:
        q = _tokens(query)
        if not q:
            return []
        scored: List[Dict[str, Any]] = []
        for item in self.replies.values():
            if float(item.get("confidence") or 0) < min_confidence:
                continue
            t = _tokens(item.get("query") or "")
            if not t:
                continue
            inter = len(q & t)
            if inter < 2:
                continue
            score = inter / max(1, len(q))
            if score < min_score:
                continue
            scored.append({**item, "similarity": round(score, 4)})
        scored.sort(key=lambda x: (x["similarity"], x.get("confidence", 0)), reverse=True)
        return scored[:top_k]

    def to_context(self, query: str, max_chars: int = 1800) -> str:
        exact = self.get_exact(query, min_confidence=0.85)
        if exact:
            return f"[Cached high-confidence reply]\n{exact.get('answer','')[:max_chars]}"
        sims = self.search_similar(query, top_k=2)
        if not sims:
            return ""
        parts = [
            f"[Related prior reply · sim={s.get('similarity')}]\nQ: {s.get('query')}\nA: {(s.get('answer') or '')[:500]}"
            for s in sims
        ]
        return "\n\n".join(parts)[:max_chars]

    def status(self) -> Dict[str, Any]:
        return {
            "path": str(self.path),
            "count": len(self.replies),
            "meta": self.meta,
        }


_REPLIES: ReplyStore | None = None


def get_reply_store(force_reload: bool = False) -> ReplyStore:
    global _REPLIES
    if _REPLIES is None or force_reload:
        _REPLIES = ReplyStore()
    return _REPLIES
