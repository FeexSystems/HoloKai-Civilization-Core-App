"""
HoloKai shared embeddings — aligned with frontend RAG.

Primary: Ollama `nomic-embed-text` (local, sovereign, 768-d)
Fallback: sentence-transformers all-MiniLM-L6-v2 (only if Ollama unavailable
          AND HOLAKAI_EMBED_FALLBACK=minilm)

Env:
  OLLAMA_URL              default http://localhost:11434
  OLLAMA_API_KEY          optional Bearer token (Ollama Cloud / authenticated hosts)
  HOLAKAI_EMBED_MODEL     default nomic-embed-text
  HOLAKAI_EMBED_FALLBACK  ollama | minilm | none  (default: none — fail clearly)
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from typing import List, Optional, Sequence

logger = logging.getLogger("holokai.embeddings")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "").strip()
EMBED_MODEL = os.getenv("HOLAKAI_EMBED_MODEL", "nomic-embed-text")
FALLBACK_MODE = os.getenv("HOLAKAI_EMBED_FALLBACK", "none").lower()
# Keep probe short so core/startup never blocks when Ollama is offline
PROBE_TIMEOUT = float(os.getenv("HOLAKAI_EMBED_PROBE_TIMEOUT", "3"))
EMBED_TIMEOUT = float(os.getenv("HOLAKAI_EMBED_TIMEOUT", "60"))

# Canonical collection identity for Chroma when using nomic
NOMIC_COLLECTION = "holokai_knowledge_nomic"
MINILM_COLLECTION = "holokai_knowledge"  # legacy


class EmbeddingError(RuntimeError):
    pass


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

        if allow_minilm_fallback is None:
            allow_minilm_fallback = FALLBACK_MODE in ("minilm", "true", "1", "yes")

        try:
            probe = self._ollama_embed(
                "HoloKai ancestral memory probe", timeout=PROBE_TIMEOUT
            )
            self.dimensions = len(probe)
            logger.info(
                "Ollama embeddings ready · model=%s · dims=%s · url=%s",
                self.model,
                self.dimensions,
                self.ollama_url,
            )
        except Exception as exc:
            if not allow_minilm_fallback:
                raise EmbeddingError(
                    f"Ollama embeddings unavailable ({exc}). "
                    f"Run: ollama pull {self.model}  |  Or set HOLAKAI_EMBED_FALLBACK=minilm"
                ) from exc
            logger.warning("Ollama unavailable (%s); falling back to MiniLM", exc)
            self._init_minilm()

    def _init_minilm(self) -> None:
        from sentence_transformers import SentenceTransformer

        self._minilm = SentenceTransformer("all-MiniLM-L6-v2")
        self.backend = "minilm"
        self.model = "all-MiniLM-L6-v2"
        self.dimensions = 384
        logger.info("MiniLM fallback embeddings ready · dims=384")

    def _ollama_embed(self, text: str, timeout: float | None = None) -> List[float]:
        prompt = (text or "")[:8000]
        if not prompt.strip():
            raise EmbeddingError("Cannot embed empty text")

        payload = json.dumps({"model": self.model, "prompt": prompt}).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if OLLAMA_API_KEY:
            headers["Authorization"] = f"Bearer {OLLAMA_API_KEY}"
        req = urllib.request.Request(
            f"{self.ollama_url}/api/embeddings",
            data=payload,
            headers=headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout or EMBED_TIMEOUT) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except TimeoutError as exc:
            raise EmbeddingError(
                f"Ollama embed timed out after {timeout or EMBED_TIMEOUT}s at {self.ollama_url}"
            ) from exc
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise EmbeddingError(f"Ollama HTTP {exc.code}: {body}") from exc
        except urllib.error.URLError as exc:
            raise EmbeddingError(f"Ollama unreachable at {self.ollama_url}: {exc}") from exc

        embedding = data.get("embedding")
        if not isinstance(embedding, list) or not embedding:
            raise EmbeddingError("Ollama returned empty embedding")
        return embedding

    def embed(self, text: str) -> List[float]:
        if self.backend == "minilm":
            return self._minilm.encode(text, show_progress_bar=False).tolist()
        return self._ollama_embed(text)

    def encode(
        self,
        texts: Sequence[str] | str,
        show_progress_bar: bool = False,  # noqa: ARG002 — API compat
    ) -> List[List[float]] | List[float]:
        """SentenceTransformer-compatible encode()."""
        single = isinstance(texts, str)
        batch: List[str] = [texts] if single else list(texts)
        vectors = [self.embed(t) for t in batch]
        return vectors[0] if single else vectors

    @property
    def collection_name(self) -> str:
        return NOMIC_COLLECTION if self.backend == "ollama" else MINILM_COLLECTION

    def status(self) -> dict:
        return {
            "backend": self.backend,
            "model": self.model,
            "dimensions": self.dimensions,
            "ollama_url": self.ollama_url,
            "collection": self.collection_name,
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
            "error": str(exc),
        }
