from __future__ import annotations

import os
from typing import Any, Dict, List


def _build_messages(query: str, contexts: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    evidence = []
    for i, ctx in enumerate(contexts[:10], start=1):
        title = (
            ctx.get("title")
            or (ctx.get("metadata") or {}).get("title")
            or (ctx.get("metadata") or {}).get("source")
            or "Source"
        )
        content = (ctx.get("content") or ctx.get("text") or "").strip()
        evidence.append(f"[{i}] {title}\n{content[:1200]}")

    system = (
        "You are HoloKai research synthesis. Use only provided evidence blocks. "
        "If evidence is insufficient, explicitly say so. Keep claims precise and traceable."
    )
    user = (
        f"Question: {query}\n\n"
        "Evidence blocks:\n"
        f"{'\n\n'.join(evidence) if evidence else '[none]'}\n\n"
        "Return a concise synthesis and call out uncertainty or contested points."
    )

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user},
    ]


def _extract_message_content(message: Any) -> str:
    content = getattr(message, "content", "")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: List[str] = []
        for item in content:
            if isinstance(item, dict):
                txt = item.get("text")
                if isinstance(txt, str):
                    parts.append(txt)
            elif isinstance(item, str):
                parts.append(item)
        return "\n".join(parts).strip()
    return str(content or "").strip()


def _resolve_provider() -> str:
    provider = (os.getenv("HOSTED_PROVIDER") or "").strip().lower()
    if provider in {"kimi", "moonshot", "openai", "frontier", "generic"}:
        return provider

    if os.getenv("MOONSHOT_API_KEY") or os.getenv("KIMI_API_KEY"):
        return "kimi"

    if os.getenv("FRONTIER_API_KEY") or os.getenv("OPENAI_API_KEY"):
        return "generic"

    return "none"


def _hosted_synthesize(messages: List[Dict[str, str]], model: str | None = None) -> Dict[str, Any]:
    provider = _resolve_provider()

    if provider in {"kimi", "moonshot"}:
        api_key = os.getenv("MOONSHOT_API_KEY") or os.getenv("KIMI_API_KEY")
        if not api_key:
            raise RuntimeError("No Kimi API key configured (MOONSHOT_API_KEY/KIMI_API_KEY)")

        base_url = os.getenv("MOONSHOT_BASE_URL") or os.getenv("KIMI_BASE_URL") or "https://api.moonshot.ai/v1"
        hosted_model = model or os.getenv("KIMI_MODEL") or os.getenv("MOONSHOT_MODEL") or "kimi-k3"
        reasoning_effort = (
            os.getenv("KIMI_REASONING_EFFORT")
            or os.getenv("MOONSHOT_REASONING_EFFORT")
            or "max"
        ).strip().lower()
        if reasoning_effort not in {"low", "high", "max"}:
            reasoning_effort = "max"

        from openai import OpenAI

        client = OpenAI(api_key=api_key, base_url=base_url)
        # Kimi K3 guidance: omit temperature/top_p/etc; pass reasoning_effort only.
        response = client.chat.completions.create(
            model=hosted_model,
            reasoning_effort=reasoning_effort,
            messages=messages,
        )
        answer = _extract_message_content(response.choices[0].message)
        if not answer:
            raise RuntimeError("Kimi hosted model returned an empty answer")

        return {
            "answer": answer,
            "provider": "kimi",
            "model": hosted_model,
            "host": base_url,
            "reasoning_effort": reasoning_effort,
        }

    if provider in {"frontier", "openai", "generic"}:
        api_key = os.getenv("FRONTIER_API_KEY") or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("No hosted model API key configured (FRONTIER_API_KEY/OPENAI_API_KEY)")

        base_url = os.getenv("FRONTIER_BASE_URL") or os.getenv("OPENAI_BASE_URL")
        hosted_model = model or os.getenv("FRONTIER_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-5-mini"

        from openai import OpenAI

        client = OpenAI(api_key=api_key, base_url=base_url)
        response = client.chat.completions.create(
            model=hosted_model,
            messages=messages,
            temperature=0.2,
        )
        answer = _extract_message_content(response.choices[0].message)
        if not answer:
            raise RuntimeError("Hosted model returned an empty answer")

        return {
            "answer": answer,
            "provider": "hosted",
            "model": hosted_model,
            "host": base_url or "default",
        }

    raise RuntimeError(
        "No hosted provider configured. Set MOONSHOT_API_KEY (Kimi) or FRONTIER_API_KEY/OPENAI_API_KEY."
    )


def _ollama_synthesize(messages: List[Dict[str, str]], model: str | None = None) -> Dict[str, Any]:
    from ollama_client import CHAT_MODEL, chat_text, resolve_chat_host

    chosen = model or CHAT_MODEL
    host = resolve_chat_host()
    answer = chat_text(messages, model=chosen, host=host, options={"temperature": 0.25, "top_p": 0.9})
    if not answer:
        raise RuntimeError("Ollama returned an empty answer")

    return {
        "answer": answer,
        "provider": "ollama",
        "model": chosen,
        "host": host,
    }


def synthesize_with_gateway(
    *,
    query: str,
    contexts: List[Dict[str, Any]],
    prefer_hosted: bool = True,
    hosted_model: str | None = None,
    ollama_model: str | None = None,
) -> Dict[str, Any]:
    messages = _build_messages(query, contexts)
    errors: List[str] = []

    if prefer_hosted:
        try:
            return _hosted_synthesize(messages, model=hosted_model)
        except Exception as exc:
            errors.append(f"hosted: {exc}")

    try:
        return _ollama_synthesize(messages, model=ollama_model)
    except Exception as exc:
        errors.append(f"ollama: {exc}")
        raise RuntimeError(" ; ".join(errors)) from exc
