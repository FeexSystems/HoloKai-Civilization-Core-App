"""
HoloKai shared embeddings — Full RAG via ollama.Client (local → cloud) + offline fallbacks.

Primary: Ollama `nomic-embed-text` through ollama-python host chain
Fallbacks (when HOLAKAI_FULL_RAG=1 or HOLAKAI_EMBED_FALLBACK set):
  - minilm: sentence-transformers all-MiniLM-L6-v2 (if installed)
  - hashing: deterministic 384-d bag-of-tokens (no deps — enables seed/retrieve offline)

Env:
  OLLAMA_URL / OLLAMA_EMBED_URL
  OLLAMA_API_KEY
  HOLAKAI_EMBED_MODEL          default nomic-embed-text
  HOLAKAI_EMBED_BACKEND        auto | local | cloud
  HOLAKAI_EMBED_FALLBACK       none | minilm | hashing | auto
                               auto (default when FULL_RAG): minilm then hashing
  HOLAKAI_FULL_RAG             default 1
"""

from __future__ import annotations

import hashlib
import logging
import math
import os
import re
from typing import List, Optional, Sequence

logger = logging.getLogger("holokai.embeddings")

OLLAMA_URL = (
    os.getenv("OLLAMA_EMBED_URL")
    or os.getenv("OLLAMA_URL")
    or "http://localhost:11434"
).rstrip("/")
EMBED_MODEL = os.getenv("HOLAKAI_EMBED_MODEL", "nomic-embed-text")
FALLBACK_MODE = os.getenv("HOLAKAI_EMBED_FALLBACK", "").lower().strip()
PROBE_TIMEOUT = float(os.getenv("HOLAKAI_EMBED_PROBE_TIMEOUT", "3"))
EMBED_TIMEOUT = float(os.getenv("HOLAKAI_EMBED_TIMEOUT", "60"))
HASH_DIMS = int(os.getenv("HOLAKAI_HASH_EMBED_DIMS", "384"))

NOMIC_COLLECTION = "holokai_knowledge_nomic"
MINILM_COLLECTION = "holokai_knowledge"
HASH_COLLECTION = "holokai_knowledge_hash"


class EmbeddingError(RuntimeError):
    pass


def _full_rag() -> bool:
    return os.getenv("HOLAKAI_FULL_RAG", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def _fallback_modes() -> List[str]:
    """Ordered offline fallbacks after Ollama host chain fails."""
    mode = FALLBACK_MODE
    if not mode:
        mode = "auto" if _full_rag() else "none"
    if mode in ("none", "0", "false", "off"):
        return []
    if mode == "auto":
        return ["minilm", "hashing"]
    if mode in ("minilm", "true", "1", "yes"):
        return ["minilm", "hashing"] if _full_rag() else ["minilm"]
    if mode == "hashing":
        return ["hashing"]
    return [mode]


def hashing_embed(text: str, dims: int = HASH_DIMS) -> List[float]:
    """
    Deterministic sparse-ish bag-of-tokens embedding (no external deps).
    Good enough for Full RAG demo / keyword-ish semantic retrieval offline.
    """
    tokens = re.findall(r"[a-z0-9]+", (text or "").lower())
    if not tokens:
        tokens = ["empty"]
    vec = [0.0] * dims
    for tok in tokens:
        h = hashlib.sha256(tok.encode("utf-8")).digest()
        # two signed features per token for slight directionality
        idx = int.from_bytes(h[:4], "little") % dims
        sign = 1.0 if h[4] % 2 == 0 else -1.0
        vec[idx] += sign
        idx2 = int.from_bytes(h[5:9], "little") % dims
        sign2 = 1.0 if h[9] % 2 == 0 else -1.0
        vec[idx2] += 0.5 * sign2
    # L2 normalize
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


class Embedder:
    """Thin embedder with batch encode API compatible with prior SentenceTransformer usage."""

    def __init__(
        self,
        model: str | None = None,
        ollama_url: str | None = None,
        allow_minilm_fallback: bool | None = None,
    ):
        self.model = model or EMBED_MODEL
        self.ollama_url = (ollama_url or OLLAMA_URL).rstrip("/")
        self.backend = "ollama"
        self.dimensions: Optional[int] = None
        self._minilm = None
        self.host_used: Optional[str] = None

        # Legacy flag still honored
        if allow_minilm_fallback is True and "minilm" not in _fallback_modes():
            modes = ["minilm"] + _fallback_modes()
        else:
            modes = _fallback_modes()

        try:
            probe = self._ollama_embed(
                "HoloKai ancestral memory probe", timeout=PROBE_TIMEOUT
            )
            self.dimensions = len(probe)
            logger.info(
                "Ollama embeddings ready · model=%s · dims=%s · url=%s",
                self.model,
                self.dimensions,
                self.host_used or self.ollama_url,
            )
            return
        except Exception as ollama_exc:
            logger.warning("Ollama embed chain failed: %s", ollama_exc)
            last_exc: Exception = ollama_exc

        for mode in modes:
            try:
                if mode == "minilm":
                    self._init_minilm()
                    return
                if mode == "hashing":
                    self._init_hashing()
                    return
            except Exception as exc:
                last_exc = exc
                logger.warning("Embed fallback %s failed: %s", mode, exc)

        raise EmbeddingError(
            f"Embeddings unavailable ({last_exc}). "
            f"Run: ollama pull {self.model}  |  Or set HOLAKAI_EMBED_FALLBACK=minilm|hashing|auto"
        ) from last_exc

    def _init_minilm(self) -> None:
        from sentence_transformers import SentenceTransformer

        self._minilm = SentenceTransformer("all-MiniLM-L6-v2")
        self.backend = "minilm"
        self.model = "all-MiniLM-L6-v2"
        self.dimensions = 384
        self.host_used = "local:sentence-transformers"
        logger.info("MiniLM fallback embeddings ready · dims=384")

    def _init_hashing(self) -> None:
        self.backend = "hashing"
        self.model = f"hashing-{HASH_DIMS}"
        self.dimensions = HASH_DIMS
        self.host_used = "local:hashing"
        # probe
        hashing_embed("HoloKai ancestral memory probe", HASH_DIMS)
        logger.info(
            "Hashing embeddings ready · dims=%s (offline Full RAG fallback)", HASH_DIMS
        )

    def _ollama_embed(self, text: str, timeout: float | None = None) -> List[float]:
        from ollama_client import OllamaClientError, embed

        try:
            # host=None → Full RAG host chain (local → cloud)
            vector = embed(
                text,
                model=self.model,
                host=None if _full_rag() else self.ollama_url,
                timeout=timeout or EMBED_TIMEOUT,
                fallback=_full_rag(),
            )
        except OllamaClientError as exc:
            raise EmbeddingError(str(exc)) from exc
        except Exception as exc:
            raise EmbeddingError(f"Ollama embed failed: {exc}") from exc

        if not isinstance(vector, list) or not vector:
            raise EmbeddingError("Ollama returned empty embedding")
        if vector and isinstance(vector[0], list):
            return list(vector[0])  # type: ignore[return-value]
        return list(vector)  # type: ignore[arg-type]

    def embed(self, text: str) -> List[float]:
        if self.backend == "minilm":
            return self._minilm.encode(text, show_progress_bar=False).tolist()
        if self.backend == "hashing":
            return hashing_embed(text, self.dimensions or HASH_DIMS)
        return self._ollama_embed(text)

    def encode(
        self,
        texts: Sequence[str] | str,
        show_progress_bar: bool = False,  # noqa: ARG002
    ) -> List[List[float]] | List[float]:
        """SentenceTransformer-compatible encode()."""
        single = isinstance(texts, str)
        batch: List[str] = [texts] if single else list(texts)

        if self.backend == "minilm":
            vectors = [self.embed(t) for t in batch]
            return vectors[0] if single else vectors

        if self.backend == "hashing":
            vectors = [hashing_embed(t, self.dimensions or HASH_DIMS) for t in batch]
            return vectors[0] if single else vectors

        from ollama_client import OllamaClientError, embed

        try:
            result = embed(
                batch if not single else batch[0],
                model=self.model,
                host=None if _full_rag() else self.ollama_url,
                timeout=EMBED_TIMEOUT,
                fallback=_full_rag(),
            )
        except OllamaClientError as exc:
            raise EmbeddingError(str(exc)) from exc

        if single:
            return list(result)  # type: ignore[arg-type]
        return [list(v) for v in result]  # type: ignore[union-attr]

    @property
    def collection_name(self) -> str:
        if self.backend == "ollama":
            return NOMIC_COLLECTION
        if self.backend == "hashing":
            return HASH_COLLECTION
        return MINILM_COLLECTION

    def status(self) -> dict:
        return {
            "backend": self.backend,
            "model": self.model,
            "dimensions": self.dimensions,
            "ollama_url": self.ollama_url,
            "host_used": self.host_used,
            "collection": self.collection_name,
            "client": "ollama-python",
            "full_rag": _full_rag(),
        }


def check_embeddings() -> dict:
    try:
        emb = Embedder()
        return {"ok": True, **emb.status()}
    except Exception as exc:
        return {
            "ok": False,
            "backend": None,
            "model": EMBED_MODEL,
            "ollama_url": OLLAMA_URL,
            "client": "ollama-python",
            "full_rag": _full_rag(),
            "error": str(exc),
        }
