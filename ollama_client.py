"""
HoloKai Ollama client — thin wrapper around the official `ollama` Python package.

https://github.com/ollama/ollama-python

Supports **local → cloud fallback** for both chat and embeddings (Full RAG).

Env:
  OLLAMA_URL              default host (http://localhost:11434)
  OLLAMA_CHAT_URL         optional chat override (e.g. https://ollama.com)
  OLLAMA_EMBED_URL        optional embed override
  OLLAMA_API_KEY          Bearer token (required for ollama.com)
  HOLAKAI_CHAT_MODEL      default chat model (gemma4)
  HOLAKAI_EMBED_MODEL     default embed model (nomic-embed-text)
  HOLAKAI_CHAT_BACKEND    auto | local | cloud
  HOLAKAI_EMBED_BACKEND   auto | local | cloud
  HOLAKAI_FULL_RAG        1 (default) enables multi-host embed + RAG synthesize helpers
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Iterator, List, Optional, Sequence, Tuple, Union

logger = logging.getLogger("holokai.ollama")

DEFAULT_LOCAL = "http://localhost:11434"
CLOUD_HOST = "https://ollama.com"
CHAT_MODEL = os.getenv("HOLAKAI_CHAT_MODEL") or os.getenv(
    "NEXT_PUBLIC_OLLAMA_MODEL", "gemma4"
)
EMBED_MODEL = os.getenv("HOLAKAI_EMBED_MODEL", "nomic-embed-text")


class OllamaClientError(RuntimeError):
    """Raised when Ollama host is unreachable or returns an error."""

    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def _strip_host(url: str) -> str:
    return (url or DEFAULT_LOCAL).strip().rstrip("/")


def full_rag_enabled() -> bool:
    return os.getenv("HOLAKAI_FULL_RAG", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )


def is_cloud_host(host: str) -> bool:
    return "ollama.com" in (host or "").lower()


def api_key() -> str:
    return (os.getenv("OLLAMA_API_KEY") or "").strip()


def local_host() -> str:
    return _strip_host(
        os.getenv("OLLAMA_URL")
        or os.getenv("NEXT_PUBLIC_OLLAMA_URL")
        or DEFAULT_LOCAL
    )


def resolve_host(purpose: str = "chat") -> str:
    """Single-host resolve (no probe). Prefer resolve_*_host / host_chain for Full RAG."""
    base = local_host()
    if purpose == "chat":
        override = os.getenv("OLLAMA_CHAT_URL")
        if override:
            return _strip_host(override)
        backend = (os.getenv("HOLAKAI_CHAT_BACKEND") or "auto").lower()
        if backend == "cloud":
            return CLOUD_HOST
        return base
    if purpose == "embed":
        override = os.getenv("OLLAMA_EMBED_URL")
        if override:
            return _strip_host(override)
        backend = (os.getenv("HOLAKAI_EMBED_BACKEND") or "auto").lower()
        if backend == "cloud":
            return CLOUD_HOST
        return base
    return base


def make_client(
    host: str | None = None,
    *,
    purpose: str = "chat",
    timeout: float | None = None,
):
    """Build an official `ollama.Client` for the given host/purpose."""
    try:
        from ollama import Client
    except ImportError as exc:
        raise OllamaClientError(
            "Package 'ollama' is not installed. Run: pip install ollama"
        ) from exc

    resolved = _strip_host(host or resolve_host(purpose))
    headers: Dict[str, str] = {}
    key = api_key()
    if key:
        headers["Authorization"] = f"Bearer {key}"
    elif is_cloud_host(resolved):
        raise OllamaClientError(
            "OLLAMA_API_KEY is required for https://ollama.com "
            "(create one at https://ollama.com/settings/keys)"
        )

    kwargs: Dict[str, Any] = {"host": resolved}
    if headers:
        kwargs["headers"] = headers
    if timeout is not None:
        kwargs["timeout"] = timeout

    return Client(**kwargs), resolved


def _probe_reachable(host: str, timeout: float = 1.2) -> bool:
    try:
        client, _ = make_client(host, purpose="default", timeout=timeout)
        client.list()
        return True
    except Exception:
        return False


def host_chain(purpose: str = "chat") -> List[str]:
    """
    Ordered hosts for Full RAG auto mode.
    chat/embed: local first, then cloud when API key present.
    """
    backend_key = (
        "HOLAKAI_CHAT_BACKEND" if purpose == "chat" else "HOLAKAI_EMBED_BACKEND"
    )
    backend = (os.getenv(backend_key) or "auto").lower()
    local = local_host()
    explicit = os.getenv(
        "OLLAMA_CHAT_URL" if purpose == "chat" else "OLLAMA_EMBED_URL"
    )

    if explicit:
        return [_strip_host(explicit)]

    if backend == "cloud":
        return [CLOUD_HOST]
    if backend == "local":
        return [local]

    # auto
    chain: List[str] = []
    if is_cloud_host(local):
        chain.append(local)
    else:
        chain.append(local)
        if api_key() and CLOUD_HOST not in chain:
            chain.append(CLOUD_HOST)
    # de-dupe preserve order
    seen = set()
    out: List[str] = []
    for h in chain:
        if h not in seen:
            seen.add(h)
            out.append(h)
    return out


def resolve_chat_host() -> str:
    """Pick first usable chat host (probe local, else cloud)."""
    chain = host_chain("chat")
    if len(chain) == 1:
        return chain[0]
    for host in chain:
        if is_cloud_host(host):
            # only use cloud if key present (make_client enforces)
            if not api_key():
                continue
            if not _probe_reachable(chain[0], timeout=1.0):
                logger.info(
                    "Local Ollama unreachable — using cloud %s for chat", host
                )
                return host
            return chain[0]
        if _probe_reachable(host, timeout=1.0):
            return host
    # last resort
    if api_key():
        return CLOUD_HOST
    return chain[0]


def resolve_embed_host() -> str:
    """Preferred embed host (first in chain). Actual embed tries full chain."""
    return host_chain("embed")[0]


def list_models(host: str | None = None, *, purpose: str = "chat") -> List[str]:
    """Return installed / available model names."""
    if host is None and purpose == "chat":
        host = resolve_chat_host()
    try:
        client, _resolved = make_client(host, purpose=purpose, timeout=15.0)
        result = client.list()
    except OllamaClientError:
        raise
    except Exception as exc:
        raise OllamaClientError(f"Ollama list failed: {exc}") from exc

    models = getattr(result, "models", None)
    if models is None and isinstance(result, dict):
        models = result.get("models") or []
    names: List[str] = []
    for m in models or []:
        name = getattr(m, "model", None) or getattr(m, "name", None)
        if name is None and isinstance(m, dict):
            name = m.get("model") or m.get("name")
        if name:
            names.append(str(name))
    return names


def _embed_on_host(
    host: str,
    inputs: List[str],
    *,
    model: str,
    timeout: float,
    single: bool,
) -> Tuple[Union[List[float], List[List[float]]], str]:
    client, resolved = make_client(host, purpose="embed", timeout=timeout)
    vectors: List[List[float]] = []
    primary_exc: Exception | None = None

    try:
        result = client.embed(model=model, input=inputs if not single else inputs[0])
        embeddings = getattr(result, "embeddings", None)
        if embeddings is None and isinstance(result, dict):
            embeddings = result.get("embeddings")
        if embeddings:
            vectors = [list(v) for v in embeddings]
        else:
            one = getattr(result, "embedding", None)
            if one is None and isinstance(result, dict):
                one = result.get("embedding")
            if one:
                vectors = [list(one)]
    except Exception as exc:
        primary_exc = exc
        try:
            for prompt in inputs:
                legacy = client.embeddings(model=model, prompt=prompt)
                emb = getattr(legacy, "embedding", None)
                if emb is None and isinstance(legacy, dict):
                    emb = legacy.get("embedding")
                if not emb:
                    raise OllamaClientError("Ollama returned empty embedding")
                vectors.append(list(emb))
        except Exception as legacy_exc:
            raise OllamaClientError(
                f"Ollama embed failed at {resolved} ({primary_exc}); "
                f"legacy also failed ({legacy_exc})"
            ) from legacy_exc

    if not vectors or not all(vectors):
        raise OllamaClientError(f"Ollama returned empty embedding at {resolved}")

    out: Union[List[float], List[List[float]]] = (
        vectors[0] if single else vectors
    )
    return out, resolved


def embed(
    text: str | Sequence[str],
    *,
    model: str | None = None,
    host: str | None = None,
    timeout: float | None = None,
    fallback: bool | None = None,
) -> Union[List[float], List[List[float]]]:
    """
    Embed text via ollama.Client.

    When fallback is True (default if HOLAKAI_FULL_RAG=1), tries host_chain:
    local → cloud. Raises OllamaClientError if every host fails.
    """
    model = model or EMBED_MODEL
    single = isinstance(text, str)
    inputs: List[str] = [text] if single else [str(t) for t in text]
    inputs = [(t or "")[:8000] for t in inputs]
    if not any(t.strip() for t in inputs):
        raise OllamaClientError("Cannot embed empty text")

    timeout_s = timeout or float(os.getenv("HOLAKAI_EMBED_TIMEOUT", "60"))
    if fallback is None:
        fallback = full_rag_enabled()

    if host:
        hosts = [_strip_host(host)]
    elif fallback:
        hosts = host_chain("embed")
    else:
        hosts = [resolve_embed_host()]

    errors: List[str] = []
    for h in hosts:
        try:
            vectors, resolved = _embed_on_host(
                h, inputs, model=model, timeout=timeout_s, single=single
            )
            if is_cloud_host(resolved) and h != hosts[0]:
                logger.info(
                    "Embeddings via cloud fallback · host=%s · model=%s",
                    resolved,
                    model,
                )
            return vectors
        except Exception as exc:
            errors.append(f"{h}: {exc}")
            logger.warning("Embed host %s failed: %s", h, exc)
            continue

    raise OllamaClientError(
        "All Ollama embed hosts failed (" + " | ".join(errors) + "). "
        "Install local Ollama + `ollama pull nomic-embed-text`, or use "
        "HOLAKAI_EMBED_FALLBACK=minilm / hashing for offline Full RAG."
    )


def chat(
    messages: List[Dict[str, Any]],
    *,
    model: str | None = None,
    host: str | None = None,
    stream: bool = False,
    options: Optional[Dict[str, Any]] = None,
    format: Any = None,
    tools: Any = None,
    think: Any = None,
    timeout: float | None = None,
) -> Any:
    """Chat via ollama.Client (uses resolve_chat_host for local→cloud)."""
    model = model or CHAT_MODEL
    resolved_host = host or resolve_chat_host()
    client, resolved = make_client(
        resolved_host,
        purpose="chat",
        timeout=timeout or float(os.getenv("HOLAKAI_CHAT_TIMEOUT", "120")),
    )

    kwargs: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": stream,
    }
    if options:
        kwargs["options"] = options
    if format is not None:
        kwargs["format"] = format
    if tools is not None:
        kwargs["tools"] = tools
    if think is not None:
        kwargs["think"] = think

    try:
        return client.chat(**kwargs)
    except OllamaClientError:
        raise
    except Exception as exc:
        status = getattr(exc, "status_code", None)
        # One-shot cloud retry if local failed
        if (
            host is None
            and not is_cloud_host(resolved)
            and api_key()
            and full_rag_enabled()
        ):
            try:
                logger.info("Chat local failed — retrying cloud")
                return chat(
                    messages,
                    model=model,
                    host=CLOUD_HOST,
                    stream=stream,
                    options=options,
                    format=format,
                    tools=tools,
                    think=think,
                    timeout=timeout,
                )
            except Exception as cloud_exc:
                raise OllamaClientError(
                    f"Ollama chat failed local ({exc}) and cloud ({cloud_exc})",
                    status_code=status,
                ) from cloud_exc
        raise OllamaClientError(
            f"Ollama chat failed at {resolved} (model={model}): {exc}",
            status_code=status,
        ) from exc


def chat_text(
    messages: List[Dict[str, Any]],
    *,
    model: str | None = None,
    host: str | None = None,
    options: Optional[Dict[str, Any]] = None,
    format: Any = None,
) -> str:
    """Non-streaming chat that returns assistant text content."""
    resp = chat(
        messages,
        model=model,
        host=host,
        stream=False,
        options=options,
        format=format,
    )
    message = getattr(resp, "message", None)
    if message is not None:
        content = getattr(message, "content", None)
        if content:
            return str(content)
    if isinstance(resp, dict):
        return str((resp.get("message") or {}).get("content") or "")
    return str(resp)


def stream_chat_ndjson(
    messages: List[Dict[str, Any]],
    *,
    model: str | None = None,
    host: str | None = None,
    options: Optional[Dict[str, Any]] = None,
    format: Any = None,
    tools: Any = None,
    think: Any = None,
) -> Iterator[Dict[str, Any]]:
    """Yield NDJSON-friendly dicts matching Ollama native stream shape."""
    stream = chat(
        messages,
        model=model,
        host=host,
        stream=True,
        options=options,
        format=format,
        tools=tools,
        think=think,
    )
    for part in stream:
        msg = getattr(part, "message", None)
        if msg is None and isinstance(part, dict):
            msg_dict = part.get("message") or {}
            content = msg_dict.get("content") or ""
            tool_calls = msg_dict.get("tool_calls")
            done = bool(part.get("done"))
        else:
            content = getattr(msg, "content", None) or ""
            tool_calls = getattr(msg, "tool_calls", None)
            done = bool(getattr(part, "done", False))

        payload: Dict[str, Any] = {
            "message": {"content": content},
            "done": done,
        }
        if tool_calls:
            try:
                payload["message"]["tool_calls"] = [
                    tc
                    if isinstance(tc, dict)
                    else getattr(tc, "model_dump", lambda: tc)()
                    for tc in tool_calls
                ]
            except Exception:
                payload["message"]["tool_calls"] = tool_calls
        yield payload


RAG_SYSTEM = """You are HoloKai — a sharp, Grok-class civilization intelligence for African history, archaeology, languages, philosophy, and cultural protocols.

Mindset:
- Be precise with names, places, eras; never invent citations or finds.
- Multi-perspective: archaeology + texts + oral tradition + ethics.
- Sound alive: clear, vivid, occasionally dry-witty; never disrespect living cultures.
- When sources conflict, surface the tension. If context is thin, say what is uncertain.
- Prefer African intellectual frames (Maat, Ubuntu, Ifá, Sankofa) when framing meaning.
- Lead with a direct answer, then depth and connections.

Use the provided context passages for factual claims. You may reason clearly over them, but do not fabricate sources."""


def synthesize_rag_answer(
    query: str,
    contexts: List[Dict[str, Any]],
    *,
    model: str | None = None,
    temperature: float = 0.4,
) -> Dict[str, Any]:
    """
    Full RAG generation: grounded answer from retrieved chunks via ollama.Client
    (local → cloud fallback).
    """
    blocks: List[str] = []
    for i, ctx in enumerate(contexts, 1):
        title = (
            ctx.get("title")
            or (ctx.get("metadata") or {}).get("title")
            or (ctx.get("metadata") or {}).get("source")
            or f"Passage {i}"
        )
        text = ctx.get("content") or ctx.get("text") or ""
        score = ctx.get("score")
        head = f"[{i}] {title}"
        if score is not None:
            head += f" (score={float(score):.3f})"
        blocks.append(f"{head}\n{text}")

    context_blob = "\n\n---\n\n".join(blocks) if blocks else "(no passages retrieved)"
    messages = [
        {"role": "system", "content": RAG_SYSTEM},
        {
            "role": "user",
            "content": (
                f"Question:\n{query}\n\n"
                f"Context passages:\n{context_blob}\n\n"
                "Write a clear, grounded answer for the question."
            ),
        },
    ]
    host = resolve_chat_host()
    answer = chat_text(
        messages,
        model=model or CHAT_MODEL,
        host=host,
        options={"temperature": temperature, "top_p": 0.9},
    )
    return {
        "answer": answer,
        "model": model or CHAT_MODEL,
        "chat_host": host,
        "context_count": len(contexts),
    }


def status() -> Dict[str, Any]:
    """Diagnostic snapshot for /health and rag status."""
    embed_hosts = host_chain("embed")
    chat_hosts = host_chain("chat")
    chat_host = resolve_chat_host()
    out: Dict[str, Any] = {
        "package": "ollama",
        "full_rag": full_rag_enabled(),
        "embed_hosts": embed_hosts,
        "chat_hosts": chat_hosts,
        "embed_host": embed_hosts[0],
        "chat_host": chat_host,
        "api_key_set": bool(api_key()),
        "chat_model": CHAT_MODEL,
        "embed_model": EMBED_MODEL,
        "chat_backend": (os.getenv("HOLAKAI_CHAT_BACKEND") or "auto").lower(),
        "embed_backend": (os.getenv("HOLAKAI_EMBED_BACKEND") or "auto").lower(),
    }
    try:
        models = list_models(chat_host, purpose="chat")
        out["chat_ok"] = True
        out["chat_models"] = models[:40]
    except Exception as exc:
        out["chat_ok"] = False
        out["chat_error"] = str(exc)
    out["embed_host_is_cloud"] = is_cloud_host(embed_hosts[0])
    return out
