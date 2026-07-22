from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass
from typing import Any, Dict, List

STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "to",
    "was",
    "were",
    "with",
}


@dataclass(frozen=True)
class Citation:
    citation_id: str
    source_title: str
    source_slug: str | None
    passage: str
    evidence_type: str
    uncertainty: str
    metadata: Dict[str, Any]


def _tokenize(text: str) -> set[str]:
    return {
        t
        for t in re.findall(r"[a-zA-Z][a-zA-Z\-']{2,}", (text or "").lower())
        if t not in STOPWORDS
    }


def _split_claims(answer: str, max_claims: int = 8) -> List[str]:
    text = (answer or "").strip()
    if not text:
        return []
    parts = re.split(r"(?<=[.!?])\s+", text)
    claims: List[str] = []
    for part in parts:
        p = re.sub(r"\s+", " ", part).strip(" -\n\t")
        if len(p) < 35:
            continue
        claims.append(p)
        if len(claims) >= max_claims:
            break
    return claims


def _evidence_type(ctx: Dict[str, Any]) -> str:
    meta = ctx.get("metadata") or {}
    if meta.get("evidence_type"):
        return str(meta["evidence_type"])
    retrieval = str(ctx.get("retrieval") or "").lower()
    if "oral" in retrieval:
        return "Oral Tradition"
    if "graph" in retrieval:
        return "Historical Consensus"
    if "web" in retrieval:
        return "Contemporary Reporting"
    if "memory" in retrieval:
        return "Memory Trace"
    if "vector" in retrieval or "rag" in retrieval:
        return "Textual Scholarship"
    return "Unclassified"


def _citation_id(source_title: str, passage: str) -> str:
    raw = f"{source_title}|{passage[:220]}".encode("utf-8", errors="ignore")
    digest = hashlib.sha1(raw).hexdigest()[:12]
    return f"HKC-{digest.upper()}"


def _best_contexts_for_claim(claim: str, contexts: List[Dict[str, Any]], top_n: int = 2) -> List[Dict[str, Any]]:
    claim_tokens = _tokenize(claim)
    if not claim_tokens:
        return []

    scored: List[tuple[float, Dict[str, Any]]] = []
    for ctx in contexts:
        content = ctx.get("content") or ctx.get("text") or ""
        tokens = _tokenize(content)
        if not tokens:
            continue
        overlap = len(claim_tokens & tokens)
        if overlap == 0:
            continue
        lexical = overlap / max(len(claim_tokens), 1)
        score = float(ctx.get("score") or 0)
        total = lexical * 0.7 + score * 0.3
        scored.append((total, ctx))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [ctx for _, ctx in scored[:top_n]]


def build_grounded_answer(
    query: str,
    answer: str,
    contexts: List[Dict[str, Any]] | None,
) -> Dict[str, Any]:
    contexts = contexts or []
    claims = _split_claims(answer)

    claim_rows: List[Dict[str, Any]] = []
    citation_index: Dict[str, Dict[str, Any]] = {}

    supported_claims = 0
    for i, claim in enumerate(claims, start=1):
        supports = _best_contexts_for_claim(claim, contexts)
        citations: List[Dict[str, Any]] = []

        for ctx in supports:
            passage = (ctx.get("content") or ctx.get("text") or "").strip()
            source_title = (
                ctx.get("title")
                or (ctx.get("metadata") or {}).get("title")
                or (ctx.get("metadata") or {}).get("source")
                or "Untitled Source"
            )
            source_slug = (ctx.get("metadata") or {}).get("source_slug")
            cid = _citation_id(source_title, passage)
            citation = Citation(
                citation_id=cid,
                source_title=source_title,
                source_slug=source_slug,
                passage=passage[:900],
                evidence_type=_evidence_type(ctx),
                uncertainty="medium" if float(ctx.get("score") or 0) < 0.55 else "low",
                metadata=ctx.get("metadata") or {},
            )
            citation_payload = {
                "citation_id": citation.citation_id,
                "source_title": citation.source_title,
                "source_slug": citation.source_slug,
                "passage": citation.passage,
                "evidence_type": citation.evidence_type,
                "uncertainty": citation.uncertainty,
                "metadata": citation.metadata,
            }
            citations.append(citation_payload)
            citation_index[cid] = citation_payload

        evidence_status = "supported" if citations else "insufficient_evidence"
        if evidence_status == "supported":
            supported_claims += 1

        claim_rows.append(
            {
                "claim_id": f"claim-{i}",
                "text": claim,
                "evidence_status": evidence_status,
                "contestation_status": "open",
                "citations": citations,
            }
        )

    insufficient = supported_claims == 0

    return {
        "query": query,
        "answer": answer,
        "claims": claim_rows,
        "citation_index": list(citation_index.values()),
        "supported_claim_count": supported_claims,
        "insufficient_evidence": insufficient,
        "insufficient_evidence_message": (
            "Insufficient reviewed evidence for a grounded factual answer."
            if insufficient
            else None
        ),
    }


def grounded_refusal_message(query: str) -> str:
    return (
        "I don’t have enough reviewed, citable evidence yet to answer that confidently. "
        "Please broaden the query, or open related scholarship in the library while an editor reviews additional sources."
    )
