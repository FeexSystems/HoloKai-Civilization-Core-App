"""
HoloKai RAG agents — Ollama nomic-embed-text aligned with frontend Vanguard RAG.

Uses shared KnowledgeBase (knowledge_base.py) for vector retrieval.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

from knowledge_base import KnowledgeBase, ensure_seeded

logger = logging.getLogger("holokai.rag")


# ----------------------------------------------------------------------
# Schemas
# ----------------------------------------------------------------------
class SourceType(str, Enum):
    HISTORICAL_CONSENSUS = "Historical Consensus"
    ARCHAEOLOGICAL_EVIDENCE = "Current Archaeological Evidence"
    ORAL_TRADITION = "Oral Tradition"
    ANTHROPOLOGICAL_OBSERVATION = "Anthropological Observation"
    LINGUISTIC_RECONSTRUCTION = "Linguistic Reconstruction"
    ALTERNATIVE_INTERPRETATION = "Alternative Interpretation"
    SYSTEM_NOTIFICATION = "System Notification"
    CULTURAL_PROTOCOL = "Cultural Protocol"


@dataclass(frozen=True)
class KnowledgeFragment:
    source_type: SourceType
    content: str
    confidence: float
    agent_origin: str
    citation: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


# ----------------------------------------------------------------------
# Base Agent
# ----------------------------------------------------------------------
class BaseAgent:
    def __init__(self, name: str, domain: str, knowledge_base: KnowledgeBase):
        self.name = name
        self.domain = domain
        self.kb = knowledge_base

    def _contains(self, query: str, keywords: List[str]) -> bool:
        q = query.lower()
        return any(k in q for k in keywords)

    def _chunks_to_fragments(
        self,
        chunks: List[Dict[str, Any]],
        source_type: SourceType,
        confidence_boost: float = 0.25,
    ) -> List[KnowledgeFragment]:
        fragments = []
        for chunk in chunks:
            conf = min(0.96, 0.68 + chunk["score"] * confidence_boost)
            meta = chunk.get("metadata") or {}
            fragments.append(
                KnowledgeFragment(
                    source_type=source_type,
                    content=chunk["text"],
                    confidence=round(conf, 3),
                    agent_origin=self.name,
                    citation=meta.get("source") or meta.get("title"),
                    metadata=meta,
                )
            )
        return fragments


# ----------------------------------------------------------------------
# RAG-powered agents
# ----------------------------------------------------------------------
class HistorianAI(BaseAgent):
    def __init__(self, knowledge_base: KnowledgeBase):
        super().__init__("Historian AI", "historian", knowledge_base)

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        chunks = self.kb.retrieve(query, domain="historian", top_k=4)
        fragments = self._chunks_to_fragments(chunks, SourceType.HISTORICAL_CONSENSUS)

        if not fragments and self._contains(query, ["mansa musa", "mali"]):
            fragments.append(
                KnowledgeFragment(
                    source_type=SourceType.HISTORICAL_CONSENSUS,
                    content=(
                        "Mansa Musa (c. 1312–1337) ruled the Mali Empire at its height. "
                        "His pilgrimage to Mecca in 1324–25 brought West African wealth, "
                        "scholarship, and political sophistication to wider Afro-Eurasian attention."
                    ),
                    confidence=0.89,
                    agent_origin=self.name,
                    citation="Fallback historical synthesis",
                )
            )
        return fragments


class ArchaeologistAI(BaseAgent):
    def __init__(self, knowledge_base: KnowledgeBase):
        super().__init__("Archaeologist AI", "archaeology", knowledge_base)

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        chunks = self.kb.retrieve(query, domain="archaeology", top_k=4)
        return self._chunks_to_fragments(chunks, SourceType.ARCHAEOLOGICAL_EVIDENCE)


class AnthropologistAI(BaseAgent):
    def __init__(self, knowledge_base: KnowledgeBase):
        super().__init__("Anthropologist AI", "anthropology", knowledge_base)

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        chunks = self.kb.retrieve(query, domain="anthropology", top_k=4)
        fragments = self._chunks_to_fragments(chunks, SourceType.ORAL_TRADITION)

        if not fragments and self._contains(query, ["hello", "greet", "hi "]):
            fragments.append(
                KnowledgeFragment(
                    source_type=SourceType.ANTHROPOLOGICAL_OBSERVATION,
                    content=(
                        "Greetings in many West African societies open relational space and signal respect, "
                        "readiness for dialogue, and social positioning."
                    ),
                    confidence=0.87,
                    agent_origin=self.name,
                )
            )
        return fragments


class LinguistAI(BaseAgent):
    def __init__(self, knowledge_base: KnowledgeBase):
        super().__init__("Linguist AI", "linguistics", knowledge_base)

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        chunks = self.kb.retrieve(query, domain="linguistics", top_k=3)
        return self._chunks_to_fragments(chunks, SourceType.LINGUISTIC_RECONSTRUCTION)


class EthicistAI(BaseAgent):
    def __init__(self, knowledge_base: KnowledgeBase):
        super().__init__("Ethicist AI", "ethics", knowledge_base)

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        chunks = self.kb.retrieve(query, domain="ethics", top_k=3)
        fragments = self._chunks_to_fragments(
            chunks, SourceType.CULTURAL_PROTOCOL, confidence_boost=0.2
        )

        if self._contains(query, ["mansa musa", "gold", "wealth", "rich"]):
            fragments.append(
                KnowledgeFragment(
                    source_type=SourceType.CULTURAL_PROTOCOL,
                    content=(
                        "Discussions of imperial wealth should preserve historical nuance and avoid "
                        "reducing complex polities to stereotypes of extravagance. Emphasize scholarship, "
                        "diplomacy, and institutional achievement."
                    ),
                    confidence=0.92,
                    agent_origin=self.name,
                    citation="Cultural protocol",
                )
            )
        return fragments


def create_rag_agents(persist_directory: str = "./holokai_chroma", force_seed: bool = False):
    """Fully wired RAG agents using Ollama nomic-embed-text + Chroma."""
    kb = KnowledgeBase(persist_directory=persist_directory)
    ensure_seeded(kb, force=force_seed)

    agents = {
        "Historian AI": HistorianAI(kb),
        "Archaeologist AI": ArchaeologistAI(kb),
        "Anthropologist AI": AnthropologistAI(kb),
        "Linguist AI": LinguistAI(kb),
        "Ethicist AI": EthicistAI(kb),
    }
    return kb, agents
