"""
HoloKai KnowledgeBase — vector RAG for multi-agent retrieval.

Embeddings: Ollama nomic-embed-text (same as frontend Vanguard RAG)
Store (preferred): Chroma persistent client (./holokai_chroma)
Store (fallback): pure-Python JSON cosine store when chromadb is unavailable
  (common on Windows without MSVC build tools for chroma-hnswlib)

Collection is namespaced by embedding backend to avoid dimension clashes
when migrating from MiniLM → nomic-embed-text.
"""

from __future__ import annotations

import json
import logging
import math
import os
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from embeddings_ollama import Embedder, EmbeddingError, NOMIC_COLLECTION

logger = logging.getLogger("holokai.kb")

DEFAULT_PERSIST = os.getenv("HOLAKAI_CHROMA_PATH", "./holokai_chroma")
DEFAULT_JSON_PATH = os.getenv("HOLAKAI_PY_VECTOR_PATH", "./holokai_vectors.json")

try:
    import chromadb
    from chromadb.config import Settings

    HAS_CHROMADB = True
except Exception as exc:  # pragma: no cover — optional dependency
    chromadb = None  # type: ignore
    Settings = None  # type: ignore
    HAS_CHROMADB = False
    logger.warning(
        "chromadb not available (%s) — using pure-Python JSON vector store. "
        "Install Visual C++ Build Tools + chromadb for HNSW, or use Docker Chroma.",
        exc,
    )


def _cosine(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return -1.0
    dot = na = nb = 0.0
    for x, y in zip(a, b):
        dot += x * y
        na += x * x
        nb += y * y
    if na <= 0 or nb <= 0:
        return -1.0
    return dot / (math.sqrt(na) * math.sqrt(nb))


class JsonVectorCollection:
    """Chroma-compatible subset used by KnowledgeBase (add/query/count)."""

    def __init__(self, path: str, name: str):
        self.path = Path(path)
        self.name = name
        self._records: List[Dict[str, Any]] = []
        self._load()

    def _load(self) -> None:
        if not self.path.is_file():
            self._records = []
            return
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
            self._records = list(data.get("records") or [])
        except Exception as exc:
            logger.warning("Corrupt vector file %s (%s) — starting empty", self.path, exc)
            self._records = []

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "version": 1,
            "collection": self.name,
            "records": self._records,
        }
        self.path.write_text(json.dumps(payload), encoding="utf-8")

    def add(
        self,
        ids: List[str],
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
    ) -> None:
        for i, doc in enumerate(documents):
            self._records.append(
                {
                    "id": ids[i],
                    "document": doc,
                    "embedding": embeddings[i],
                    "metadata": metadatas[i] if i < len(metadatas) else {},
                }
            )
        self._save()

    def count(self) -> int:
        return len(self._records)

    def query(
        self,
        query_embeddings: List[List[float]],
        n_results: int = 5,
        include: Optional[List[str]] = None,  # noqa: ARG002
        where: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        q = query_embeddings[0]
        records = self._records
        if where:
            records = [
                r
                for r in records
                if all((r.get("metadata") or {}).get(k) == v for k, v in where.items())
            ]
        if not records:
            return {
                "ids": [[]],
                "documents": [[]],
                "metadatas": [[]],
                "distances": [[]],
            }

        scored = []
        for r in records:
            score = _cosine(q, r.get("embedding") or [])
            scored.append((score, r))
        scored.sort(key=lambda t: t[0], reverse=True)
        top = scored[: max(1, min(n_results, len(scored)))]
        return {
            "ids": [[r["id"] for _, r in top]],
            "documents": [[r["document"] for _, r in top]],
            "metadatas": [[r.get("metadata") or {} for _, r in top]],
            "distances": [[1.0 - s for s, _ in top]],
        }

    def clear(self) -> None:
        self._records = []
        self._save()



def split_text(text: str, chunk_size: int = 800, chunk_overlap: int = 150) -> List[str]:
    """Lightweight recursive splitter aligned with frontend lib/rag/textSplit.js."""
    cleaned = (text or "").replace("\r\n", "\n").strip()
    if not cleaned:
        return []
    if len(cleaned) <= chunk_size:
        return [cleaned]

    # Prefer paragraph → sentence boundaries
    parts = re.split(r"(\n\n+)", cleaned)
    units: List[str] = []
    buf = ""
    for part in parts:
        if len(buf) + len(part) <= chunk_size:
            buf += part
        else:
            if buf.strip():
                units.append(buf.strip())
            if len(part) > chunk_size:
                # hard-wrap long blocks
                start = 0
                while start < len(part):
                    end = min(start + chunk_size, len(part))
                    units.append(part[start:end].strip())
                    start = max(end - chunk_overlap, end)
                buf = ""
            else:
                buf = part
    if buf.strip():
        units.append(buf.strip())

    # Merge tiny units and apply overlap window on oversized sequences
    chunks: List[str] = []
    current = ""
    for unit in units:
        candidate = f"{current}\n\n{unit}".strip() if current else unit
        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                chunks.append(current)
            if len(unit) <= chunk_size:
                # overlap tail of previous
                tail = current[-chunk_overlap:] if current else ""
                current = f"{tail}{unit}".strip() if tail else unit
            else:
                start = 0
                while start < len(unit):
                    end = min(start + chunk_size, len(unit))
                    chunks.append(unit[start:end].strip())
                    start = max(end - chunk_overlap, end)
                current = ""
    if current:
        chunks.append(current)
    return [c for c in chunks if c]


def _flatten_metadata(meta: Dict[str, Any]) -> Dict[str, Any]:
    """Chroma metadata values must be str | int | float | bool."""
    out: Dict[str, Any] = {}
    for k, v in (meta or {}).items():
        if v is None:
            continue
        if isinstance(v, (str, int, float, bool)):
            out[k] = v
        elif isinstance(v, (list, tuple)):
            out[k] = "|".join(str(x) for x in v)
        else:
            out[k] = str(v)
    return out


class KnowledgeBase:
    def __init__(
        self,
        persist_directory: str = DEFAULT_PERSIST,
        embedder: Embedder | None = None,
        collection_name: str | None = None,
    ):
        self.persist_directory = persist_directory
        self.embedder = embedder or Embedder()
        self.collection_name = collection_name or self.embedder.collection_name
        self.backend = "chroma" if HAS_CHROMADB else "json"
        self.client = None

        force_json = os.getenv("HOLAKAI_VECTOR_STORE", "").lower() in ("json", "local", "file")
        if HAS_CHROMADB and not force_json:
            self.client = chromadb.PersistentClient(
                path=persist_directory,
                settings=Settings(anonymized_telemetry=False),
            )
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={
                    "hnsw:space": "cosine",
                    "project": "holokai",
                    "embedding_model": self.embedder.model,
                    "embedding_backend": self.embedder.backend,
                },
            )
            self.backend = "chroma"
        else:
            json_path = os.getenv("HOLAKAI_PY_VECTOR_PATH") or str(
                Path(persist_directory) / f"{self.collection_name}.json"
            )
            self.collection = JsonVectorCollection(json_path, self.collection_name)
            self.backend = "json"
            self.persist_directory = str(Path(json_path).parent)

        logger.info(
            "KnowledgeBase ready · backend=%s · collection=%s · docs=%s · embed=%s/%s",
            self.backend,
            self.collection_name,
            self.collection.count(),
            self.embedder.backend,
            self.embedder.model,
        )

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------
    def add_documents(self, documents: List[Dict[str, Any]]) -> int:
        """
        documents = [
          { "text": "...", "metadata": { "domain": "historian", "source": "...", "title": "..." } },
          ...
        ]
        """
        if not documents:
            return 0

        ids = [str(uuid.uuid4()) for _ in documents]
        texts = [d["text"] for d in documents]
        metadatas = [_flatten_metadata(d.get("metadata") or {}) for d in documents]
        embeddings = self.embedder.encode(texts)

        self.collection.add(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        logger.info("Added %s docs · total=%s", len(documents), self.collection.count())
        return len(documents)

    def add_text(
        self,
        text: str,
        metadata: Optional[Dict[str, Any]] = None,
        chunk_size: int = 800,
        chunk_overlap: int = 150,
    ) -> int:
        chunks = split_text(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        if not chunks:
            return 0
        docs = []
        base = metadata or {}
        for i, chunk in enumerate(chunks):
            meta = {
                **base,
                "chunkIndex": i,
                "chunkCount": len(chunks),
            }
            docs.append({"text": chunk, "metadata": meta})
        return self.add_documents(docs)

    def clear(self) -> None:
        name = self.collection_name
        if self.backend == "json":
            self.collection.clear()
            logger.info("JSON collection cleared: %s", name)
            return
        try:
            self.client.delete_collection(name)
        except Exception:
            pass
        self.collection = self.client.get_or_create_collection(
            name=name,
            metadata={
                "hnsw:space": "cosine",
                "project": "holokai",
                "embedding_model": self.embedder.model,
                "embedding_backend": self.embedder.backend,
            },
        )
        logger.info("Collection cleared: %s", name)

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------
    def retrieve(
        self,
        query: str,
        domain: str | None = None,
        top_k: int = 4,
        min_score: float = 0.32,
        empire: str | None = None,
        source: str | None = None,
    ) -> List[Dict[str, Any]]:
        """
        Vector retrieve with optional hard filters.
        If domain filter yields few hits, backfill with unfiltered semantic results.
        """
        query_embedding = self.embedder.embed(query)
        pool = max(top_k * 3, top_k)

        def _run(where: dict | None) -> List[Dict[str, Any]]:
            total = self.collection.count()
            if total == 0:
                return []
            # Chroma rejects n_results > collection size
            n_results = max(1, min(pool, total))
            kwargs: Dict[str, Any] = {
                "query_embeddings": [query_embedding],
                "n_results": n_results,
                "include": ["documents", "metadatas", "distances"],
            }
            if where:
                kwargs["where"] = where
            results = self.collection.query(**kwargs)
            out: List[Dict[str, Any]] = []
            if not results.get("documents") or not results["documents"][0]:
                return out
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            ):
                score = 1.0 - float(dist)
                if score < min_score:
                    continue
                out.append(
                    {
                        "text": doc,
                        "metadata": meta or {},
                        "score": score,
                    }
                )
            return out

        where: Dict[str, Any] = {}
        if domain:
            where["domain"] = domain
        if empire:
            where["empire"] = empire
        if source:
            where["source"] = source

        chunks = _run(where if where else None)

        # Domain-soft backfill so sparse agent domains still get ancestral context
        if domain and len(chunks) < max(1, top_k // 2):
            seen = {c["text"] for c in chunks}
            for extra in _run(None):
                if extra["text"] in seen:
                    continue
                # soft domain affinity via metadata themes/title
                meta = extra.get("metadata") or {}
                domains = str(meta.get("domains") or meta.get("domain") or "")
                boost = 0.04 if domain in domains else 0.0
                extra = {**extra, "score": min(1.0, extra["score"] + boost)}
                chunks.append(extra)
                seen.add(extra["text"])

        chunks.sort(key=lambda c: c["score"], reverse=True)
        return chunks[:top_k]

    def count(self) -> int:
        return self.collection.count()

    def status(self) -> Dict[str, Any]:
        return {
            "backend": self.backend,
            "persist_directory": self.persist_directory,
            "collection": self.collection_name,
            "count": self.collection.count(),
            "embeddings": self.embedder.status(),
            "chromadb_installed": HAS_CHROMADB,
        }


# ----------------------------------------------------------------------
# Seed helpers — comprehensive KB + curated knowledge files
# ----------------------------------------------------------------------

# Map frontend knowledge files → agent domains (multi-domain = multi-index)
KNOWLEDGE_FILE_DOMAINS: Dict[str, List[str]] = {
    "kemet.txt": ["historian", "archaeology", "linguistics"],
    "mali-empire.txt": ["historian", "anthropology"],
    "great-zimbabwe.txt": ["archaeology", "historian"],
    "dogon-cosmology.txt": ["anthropology", "linguistics"],
    "ifa-divination.txt": ["anthropology", "ethics", "linguistics"],
    "adinkra-symbols.txt": ["linguistics", "anthropology", "ethics"],
    "nsibidi-writing.txt": ["linguistics", "historian"],
    "ubuntu-philosophy.txt": ["ethics", "anthropology"],
    "benin-bronzes.txt": ["archaeology", "historian", "ethics"],
    "nubia-kush.txt": ["historian", "archaeology"],
    "axum-empire.txt": ["historian", "archaeology", "linguistics"],
    "songhai-empire.txt": ["historian", "anthropology"],
    "swahili-coast.txt": ["historian", "linguistics", "anthropology", "archaeology"],
    "carthage.txt": ["historian", "archaeology"],
}

FILE_EMPIRE: Dict[str, str] = {
    "kemet.txt": "Kemet",
    "mali-empire.txt": "Mali",
    "great-zimbabwe.txt": "Great Zimbabwe",
    "dogon-cosmology.txt": "Dogon",
    "ifa-divination.txt": "Yoruba",
    "adinkra-symbols.txt": "Akan / Asante",
    "nsibidi-writing.txt": "Ejagham / Igbo",
    "ubuntu-philosophy.txt": "Bantu",
    "benin-bronzes.txt": "Benin",
    "nubia-kush.txt": "Kush",
    "axum-empire.txt": "Axum",
    "songhai-empire.txt": "Songhai",
    "swahili-coast.txt": "Swahili City-States",
    "carthage.txt": "Carthage",
}


def _knowledge_dirs() -> List[Path]:
    root = Path(__file__).resolve().parent
    return [
        root / "frontend" / "public" / "knowledge",
        root / "knowledge",
        root / "public" / "knowledge",
    ]


def seed_from_comprehensive(kb: KnowledgeBase) -> int:
    try:
        from knowledge_base_comprehensive import get_all_entries
    except ImportError:
        logger.warning("knowledge_base_comprehensive not available")
        return 0

    entries = get_all_entries()
    docs = []
    for e in entries:
        text = e.get("text") or ""
        if not text.strip():
            continue
        meta = dict(e.get("metadata") or {})
        meta.setdefault("origin", "comprehensive")
        docs.append({"text": text.strip(), "metadata": meta})
    return kb.add_documents(docs) if docs else 0


def seed_from_knowledge_files(kb: KnowledgeBase) -> int:
    total = 0
    dirs = [d for d in _knowledge_dirs() if d.is_dir()]
    if not dirs:
        logger.warning("No knowledge file directories found")
        return 0

    knowledge_dir = dirs[0]
    for filename, domains in KNOWLEDGE_FILE_DOMAINS.items():
        path = knowledge_dir / filename
        if not path.is_file():
            logger.warning("Missing knowledge file: %s", path)
            continue
        text = path.read_text(encoding="utf-8")
        title = filename.replace(".txt", "").replace("-", " ").title()
        source_id = filename.replace(".txt", "")
        empire = FILE_EMPIRE.get(filename, "")

        for domain in domains:
            n = kb.add_text(
                text,
                metadata={
                    "domain": domain,
                    "domains": "|".join(domains),
                    "source": source_id,
                    "title": title,
                    "empire": empire,
                    "origin": "knowledge_file",
                    "filename": filename,
                },
            )
            total += n
        logger.info("Seeded file %s → %s domains", filename, domains)
    return total


def seed_classic_fragments(kb: KnowledgeBase) -> int:
    """Compact high-signal fragments (Sungbo, Mansa Musa) used by early RAG demos."""
    documents = [
        {
            "text": (
                "Sungbo’s Eredo is one of the largest earthwork complexes in West Africa, "
                "located in the Ijebu region of southwestern Nigeria. It consists of massive "
                "ditches and embankments that stretch for over 160 kilometers."
            ),
            "metadata": {
                "domain": "archaeology",
                "source": "Archaeological surveys",
                "title": "Sungbo’s Eredo – Scale",
                "origin": "classic",
            },
        },
        {
            "text": (
                "Oral traditions among the Ijebu people associate the construction of the Eredo "
                "with a legendary noblewoman known as Bilikisu Sungbo. These traditions emphasize "
                "communal labor, spiritual protection, and founding narratives."
            ),
            "metadata": {
                "domain": "anthropology",
                "source": "Local oral histories",
                "title": "Sungbo Oral Traditions",
                "origin": "classic",
            },
        },
        {
            "text": (
                "In local Yoruba usage, the term ‘Eredo’ refers to a large defensive trench or "
                "embankment. The name itself encodes both function and landscape form."
            ),
            "metadata": {
                "domain": "linguistics",
                "source": "Linguistic notes",
                "title": "Meaning of Eredo",
                "origin": "classic",
            },
        },
        {
            "text": (
                "Historical interpretations place Sungbo’s Eredo within the broader context of "
                "large-scale earthwork traditions in the forest zone of West Africa, demonstrating "
                "sophisticated political organization and labor mobilization."
            ),
            "metadata": {
                "domain": "historian",
                "source": "Regional historical synthesis",
                "title": "Historical Context of the Eredo",
                "origin": "classic",
            },
        },
        {
            "text": (
                "Mansa Musa ruled the Mali Empire from approximately 1312 to 1337. His pilgrimage "
                "to Mecca in 1324–1325 is one of the most famous journeys in medieval African history "
                "and drew widespread attention to the wealth and scholarship of West Africa."
            ),
            "metadata": {
                "domain": "historian",
                "source": "Ibn Battuta, al-Umari, modern syntheses",
                "title": "Mansa Musa Overview",
                "origin": "classic",
            },
        },
        {
            "text": (
                "Contemporary Arabic sources describe the enormous quantities of gold that Mansa Musa "
                "distributed during his pilgrimage, which temporarily affected gold prices in Cairo "
                "and the eastern Mediterranean."
            ),
            "metadata": {
                "domain": "historian",
                "source": "al-Umari",
                "title": "Economic Impact of the Pilgrimage",
                "origin": "classic",
            },
        },
        {
            "text": (
                "Discussions of Mansa Musa’s wealth should emphasize institutional achievement, "
                "support for scholarship (especially in Timbuktu), and diplomatic engagement rather "
                "than reducing the empire to stereotypes of extravagance."
            ),
            "metadata": {
                "domain": "ethics",
                "source": "Cultural protocol notes",
                "title": "Responsible Framing of Imperial Wealth",
                "origin": "classic",
            },
        },
        {
            "text": (
                "Archaeological and architectural evidence from the wider Niger Bend supports the "
                "existence of major urban centers and long-distance trade networks during the height "
                "of the Mali Empire."
            ),
            "metadata": {
                "domain": "archaeology",
                "source": "Niger Bend studies",
                "title": "Material Context of Mali",
                "origin": "classic",
            },
        },
    ]
    return kb.add_documents(documents)


def ensure_seeded(kb: KnowledgeBase, force: bool = False) -> Dict[str, Any]:
    """Seed if empty (or force re-seed). Returns summary counts."""
    if kb.count() > 0 and not force:
        return {"skipped": True, "count": kb.count(), "reason": "already seeded"}

    if force and kb.count() > 0:
        kb.clear()

    summary = {
        "classic": seed_classic_fragments(kb),
        "comprehensive": seed_from_comprehensive(kb),
        "knowledge_files": seed_from_knowledge_files(kb),
        "total": kb.count(),
        "embeddings": kb.embedder.status(),
        "collection": kb.collection_name,
    }
    logger.info("Seed complete: %s", summary)
    return summary
