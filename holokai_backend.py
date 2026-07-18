

from __future__ import annotations

import json
import logging
import os
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, asdict, field
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol

from knowledge_base_comprehensive import get_all_entries, get_entries_by_domain

# ----------------------------------------------------------------------
# Logging
# ----------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("holokai.core")


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


@dataclass(frozen=True)
class SynthesisResponse:
    title: str
    query: str
    fragments: List[KnowledgeFragment]
    summary: str
    confidence: float
    trace_id: str
    active_agents: List[str]
    safety_notes: List[str] = field(default_factory=list)
    emotions: Dict[str, float] = field(default_factory=dict)


@dataclass
class ExecutionPlan:
    agents_to_call: List[str]
    require_ethicist: bool = True
    max_workers: int = 4
    notes: str = ""


# ----------------------------------------------------------------------
# Agent Protocol & Base
# ----------------------------------------------------------------------
class Agent(Protocol):
    name: str
    domain: str

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        ...


class BaseAgent:
    def __init__(
        self,
        name: str,
        domain: str,
        knowledge_base: Any = None,
        domain_key: str | None = None,
    ):
        self.name = name
        self.domain = domain
        self.kb = knowledge_base
        self.domain_key = domain_key  # historian | archaeology | anthropology | linguistics | ethics

    def _contains(self, query: str, keywords: List[str]) -> bool:
        q = query.lower()
        return any(k in q for k in keywords)

    def _vector_fragments(
        self,
        query: str,
        source_type: SourceType,
        top_k: int = 4,
        min_score: float = 0.32,
    ) -> List[KnowledgeFragment]:
        """Primary retrieval via Ollama nomic-embed-text + Chroma (shared with Vanguard)."""
        if self.kb is None:
            return []
        try:
            chunks = self.kb.retrieve(
                query,
                domain=self.domain_key,
                top_k=top_k,
                min_score=min_score,
            )
        except Exception as exc:
            logger.warning("%s vector retrieve failed: %s", self.name, exc)
            return []

        fragments: List[KnowledgeFragment] = []
        for chunk in chunks:
            meta = chunk.get("metadata") or {}
            conf = min(0.96, 0.68 + float(chunk.get("score", 0)) * 0.28)
            fragments.append(
                KnowledgeFragment(
                    source_type=source_type,
                    content=chunk["text"],
                    confidence=round(conf, 3),
                    agent_origin=self.name,
                    citation=meta.get("source") or meta.get("title"),
                    metadata={**meta, "retrieval": "vector", "score": chunk.get("score")},
                )
            )
        return fragments


# ----------------------------------------------------------------------
# Concrete Agents
# ----------------------------------------------------------------------
class HistorianAI(BaseAgent):
    def __init__(self, knowledge_base: Any = None):
        super().__init__(
            "Historian AI",
            "Historical timelines and kingdoms",
            knowledge_base=knowledge_base,
            domain_key="historian",
        )

    def _search_kb(self, query: str) -> List[KnowledgeFragment]:
        # Vector-first (Ollama nomic); keyword comprehensive KB as soft backfill
        fragments = self._vector_fragments(query, SourceType.HISTORICAL_CONSENSUS, top_k=4)
        if len(fragments) >= 2:
            return fragments

        entries = get_entries_by_domain("historian")
        q = query.lower()
        seen = {f.content for f in fragments}
        for entry in entries:
            if any(word in q for word in entry["text"].lower().split() if len(word) > 3):
                if any(kw in q for kw in entry["metadata"].get("title", "").lower().split()):
                    if entry["text"] in seen:
                        continue
                    fragments.append(KnowledgeFragment(
                        source_type=SourceType.HISTORICAL_CONSENSUS,
                        content=entry["text"],
                        confidence=0.91,
                        agent_origin=self.name,
                        citation=entry["metadata"].get("source"),
                        metadata={**(entry.get("metadata") or {}), "retrieval": "keyword"},
                    ))
        return fragments

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        fragments = self._search_kb(query)

        if self._contains(query, ["mansa musa", "mali empire", "mali"]):
            fragments.append(KnowledgeFragment(
                source_type=SourceType.HISTORICAL_CONSENSUS,
                content=(
                    "Mansa Musa (c. 1312–1337) ruled the Mali Empire at its height. "
                    "His famous pilgrimage to Mecca in 1324–25 brought West African wealth, "
                    "scholarship, and political sophistication to wider Afro-Eurasian attention."
                ),
                confidence=0.94,
                agent_origin=self.name,
                citation="Ibn Battuta, al-Umari, and modern syntheses of Mali imperial history",
            ))
        if self._contains(query, ["sungbo", "eredo", "ijebu"]):
            fragments.append(KnowledgeFragment(
                source_type=SourceType.HISTORICAL_CONSENSUS,
                content=(
                    "Sungbo's Eredo is one of the largest earthwork complexes in West Africa, "
                    "associated with the historical Ijebu landscape in present-day southwestern Nigeria."
                ),
                confidence=0.93,
                agent_origin=self.name,
                citation="Regional historical and archaeological literature on Ijebu earthworks",
            ))
        if self._contains(query, ["africa", "african", "civilization", "history", "empire", "kingdom"]):
            fragments.append(KnowledgeFragment(
                source_type=SourceType.HISTORICAL_CONSENSUS,
                content=(
                    "Africa's civilizational record spans millennia. Major empires include "
                    "Ancient Egypt and Kush (Nubia), Aksum, Great Zimbabwe, the Mali Empire, "
                    "Songhai, the Kingdom of Kongo, and the Benin Empire. Each developed "
                    "sophisticated systems of governance, trade, art, and scholarship."
                ),
                confidence=0.92,
                agent_origin=self.name,
                citation="Pan-African historical syntheses",
            ))
            fragments.append(KnowledgeFragment(
                source_type=SourceType.HISTORICAL_CONSENSUS,
                content=(
                    "Timbuktu was a major center of Islamic scholarship and trans-Saharan trade "
                    "during the 14th–16th centuries. Its Sankore University housed hundreds of "
                    "thousands of manuscripts covering law, astronomy, medicine, and theology."
                ),
                confidence=0.91,
                agent_origin=self.name,
                citation="UNESCO and Timbuktu Manuscript Project",
            ))

        # Deduplicate
        seen = set()
        unique = []
        for f in fragments:
            if f.content not in seen:
                seen.add(f.content)
                unique.append(f)
        return unique[:5]


class ArchaeologistAI(BaseAgent):
    def __init__(self, knowledge_base: Any = None):
        super().__init__(
            "Archaeologist AI",
            "Physical evidence and sites",
            knowledge_base=knowledge_base,
            domain_key="archaeology",
        )

    def _search_kb(self, query: str) -> List[KnowledgeFragment]:
        fragments = self._vector_fragments(query, SourceType.ARCHAEOLOGICAL_EVIDENCE, top_k=4)
        if len(fragments) >= 2:
            return fragments

        entries = get_entries_by_domain("archaeology")
        q = query.lower()
        seen = {f.content for f in fragments}
        for entry in entries:
            if any(kw in q for kw in entry["metadata"].get("title", "").lower().split()):
                if entry["text"] in seen:
                    continue
                fragments.append(KnowledgeFragment(
                    source_type=SourceType.ARCHAEOLOGICAL_EVIDENCE,
                    content=entry["text"],
                    confidence=0.90,
                    agent_origin=self.name,
                    citation=entry["metadata"].get("source"),
                    metadata={**(entry.get("metadata") or {}), "retrieval": "keyword"},
                ))
        return fragments

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        fragments = self._search_kb(query)

        if self._contains(query, ["sungbo", "eredo"]):
            fragments.append(KnowledgeFragment(
                source_type=SourceType.ARCHAEOLOGICAL_EVIDENCE,
                content=(
                    "Archaeological survey and limited excavation confirm the monumental scale "
                    "of Sungbo's Eredo. Dating remains under active research, but the earthworks "
                    "demonstrate sophisticated large-scale organization."
                ),
                confidence=0.91,
                agent_origin=self.name,
                citation="Field reports and remote-sensing studies of the Eredo complex",
            ))
        if self._contains(query, ["timbuktu", "mali"]):
            fragments.append(KnowledgeFragment(
                source_type=SourceType.ARCHAEOLOGICAL_EVIDENCE,
                content=(
                    "Material culture and architectural remains from the broader Niger Bend region "
                    "support the existence of long-distance trade networks and urban centers during "
                    "the height of the Mali Empire."
                ),
                confidence=0.89,
                agent_origin=self.name,
            ))
        if self._contains(query, ["africa", "african", "civilization", "history", "archaeology", "site"]):
            fragments.append(KnowledgeFragment(
                source_type=SourceType.ARCHAEOLOGICAL_EVIDENCE,
                content=(
                    "Archaeological evidence across Africa includes the stone ruins of Great Zimbabwe "
                    "(11th–15th century), the Nok terracotta sculptures of Nigeria (500 BCE–200 CE), "
                    "and the pyramids and temples of Nubia at Meroe. These demonstrate advanced "
                    "engineering, artistry, and urban planning across the continent."
                ),
                confidence=0.90,
                agent_origin=self.name,
                citation="Pan-African archaeological literature",
            ))

        seen = set()
        unique = []
        for f in fragments:
            if f.content not in seen:
                seen.add(f.content)
                unique.append(f)
        return unique[:5]


class AnthropologistAI(BaseAgent):
    def __init__(self, knowledge_base: Any = None):
        super().__init__(
            "Anthropologist AI",
            "Culture, protocols, and oral histories",
            knowledge_base=knowledge_base,
            domain_key="anthropology",
        )

    def _search_kb(self, query: str) -> List[KnowledgeFragment]:
        fragments = self._vector_fragments(query, SourceType.ORAL_TRADITION, top_k=4)
        if len(fragments) >= 2:
            return fragments

        entries = get_entries_by_domain("anthropology")
        q = query.lower()
        seen = {f.content for f in fragments}
        for entry in entries:
            if any(kw in q for kw in entry["metadata"].get("title", "").lower().split()):
                if entry["text"] in seen:
                    continue
                fragments.append(KnowledgeFragment(
                    source_type=SourceType.ORAL_TRADITION,
                    content=entry["text"],
                    confidence=0.90,
                    agent_origin=self.name,
                    citation=entry["metadata"].get("source"),
                    metadata={**(entry.get("metadata") or {}), "retrieval": "keyword"},
                ))
        return fragments

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        fragments = self._search_kb(query)

        if self._contains(query, ["sungbo", "eredo", "ijebu"]):
            fragments.append(KnowledgeFragment(
                source_type=SourceType.ORAL_TRADITION,
                content=(
                    "Local oral traditions surrounding Sungbo's Eredo should be treated as living "
                    "cultural memory. They often emphasize founding figures, spiritual significance, "
                    "and communal labor, and must not be reduced to a single literal historical claim."
                ),
                confidence=0.90,
                agent_origin=self.name,
            ))
        if self._contains(query, ["hello", "greet", "greeting", "hi "]):
            fragments.append(KnowledgeFragment(
                source_type=SourceType.ANTHROPOLOGICAL_OBSERVATION,
                content=(
                    "Greetings in many West African societies open relational space and signal respect, "
                    "readiness for dialogue, and social positioning. Formal and informal registers carry "
                    "different cultural weight."
                ),
                confidence=0.88,
                agent_origin=self.name,
            ))

        seen = set()
        unique = []
        for f in fragments:
            if f.content not in seen:
                seen.add(f.content)
                unique.append(f)
        return unique[:5]


class LinguistAI(BaseAgent):
    def __init__(self, knowledge_base: Any = None):
        super().__init__(
            "Linguist AI",
            "African languages and reconstruction",
            knowledge_base=knowledge_base,
            domain_key="linguistics",
        )

    def _search_kb(self, query: str) -> List[KnowledgeFragment]:
        fragments = self._vector_fragments(
            query, SourceType.LINGUISTIC_RECONSTRUCTION, top_k=3
        )
        if len(fragments) >= 2:
            return fragments

        entries = get_entries_by_domain("linguistics")
        if not entries:
            entries = get_entries_by_domain("anthropology")
        q = query.lower()
        seen = {f.content for f in fragments}
        for entry in entries:
            title = entry["metadata"].get("title", "").lower()
            if any(kw in title for kw in ["nsibidi", "writing", "language", "divination", "binary", "adinkra"]):
                if any(kw in q for kw in title.split()) or any(
                    kw in q for kw in ["nsibidi", "adinkra", "script", "language"]
                ):
                    if entry["text"] in seen:
                        continue
                    fragments.append(KnowledgeFragment(
                        source_type=SourceType.LINGUISTIC_RECONSTRUCTION,
                        content=entry["text"],
                        confidence=0.89,
                        agent_origin=self.name,
                        citation=entry["metadata"].get("source"),
                        metadata={**(entry.get("metadata") or {}), "retrieval": "keyword"},
                    ))
        return fragments

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        fragments = self._search_kb(query)

        if self._contains(query, ["eredo", "sungbo"]):
            fragments.append(KnowledgeFragment(
                source_type=SourceType.LINGUISTIC_RECONSTRUCTION,
                content=(
                    "In local usage, 'Eredo' refers to a large trench or embankment form. "
                    "The name itself encodes functional and landscape information about the monument."
                ),
                confidence=0.92,
                agent_origin=self.name,
            ))
        if self._contains(query, ["hello", "greet", "greeting"]):
            fragments.append(KnowledgeFragment(
                source_type=SourceType.LINGUISTIC_RECONSTRUCTION,
                content=(
                    "Greeting forms across West African languages often encode respect, time of day, "
                    "and social hierarchy. Reconstruction must remain sensitive to dialectal variation."
                ),
                confidence=0.86,
                agent_origin=self.name,
            ))

        seen = set()
        unique = []
        for f in fragments:
            if f.content not in seen:
                seen.add(f.content)
                unique.append(f)
        return unique[:3]


class EthicistAI(BaseAgent):
    def __init__(self, knowledge_base: Any = None):
        super().__init__(
            "Ethicist AI",
            "Cultural protocols and responsible synthesis",
            knowledge_base=knowledge_base,
            domain_key="ethics",
        )

    def _search_kb(self, query: str) -> List[KnowledgeFragment]:
        fragments = self._vector_fragments(query, SourceType.CULTURAL_PROTOCOL, top_k=3)
        if len(fragments) >= 2:
            return fragments

        entries = get_entries_by_domain("ethics")
        q = query.lower()
        seen = {f.content for f in fragments}
        for entry in entries:
            if any(kw in q for kw in entry["metadata"].get("title", "").lower().split()):
                if entry["text"] in seen:
                    continue
                fragments.append(KnowledgeFragment(
                    source_type=SourceType.CULTURAL_PROTOCOL,
                    content=entry["text"],
                    confidence=0.91,
                    agent_origin=self.name,
                    citation=entry["metadata"].get("source"),
                    metadata={**(entry.get("metadata") or {}), "retrieval": "keyword"},
                ))
        return fragments

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        fragments = self._search_kb(query)

        if self._contains(query, ["mansa musa", "mali", "wealth", "gold"]):
            fragments.append(KnowledgeFragment(
                source_type=SourceType.CULTURAL_PROTOCOL,
                content=(
                    "Discussions of imperial wealth should preserve historical nuance and avoid "
                    "reducing complex polities to stereotypes of extravagance. Emphasize scholarship, "
                    "diplomacy, and institutional achievement."
                ),
                confidence=0.91,
                agent_origin=self.name,
            ))
        if self._contains(query, ["africa", "african", "civilization", "history"]):
            fragments.append(KnowledgeFragment(
                source_type=SourceType.CULTURAL_PROTOCOL,
                content=(
                    "African civilizations are often underrepresented or misrepresented in global "
                    "historical narratives. Responsible synthesis should center African voices, "
                    "oral traditions, and indigenous scholarship alongside archaeological and "
                    "textual evidence."
                ),
                confidence=0.92,
                agent_origin=self.name,
            ))

        seen = set()
        unique = []
        for f in fragments:
            if f.content not in seen:
                seen.add(f.content)
                unique.append(f)
        return unique[:3]


# ----------------------------------------------------------------------
# Contradiction Detection
# ----------------------------------------------------------------------
class ContradictionDetector:
    OPPOSING_CUES = [
        ("ancient", "recent"),
        ("large", "small"),
        ("confirmed", "disputed"),
        ("definitely", "possibly"),
        ("oral tradition", "archaeology"),
        ("proven", "uncertain"),
    ]

    def detect(self, fragments: List[KnowledgeFragment]) -> List[str]:
        notes: List[str] = []
        high_conf = [f for f in fragments if f.confidence >= 0.85]

        for i, a in enumerate(high_conf):
            for b in high_conf[i + 1 :]:
                if self._share_entities(a.content, b.content):
                    if self._looks_contradictory(a.content, b.content):
                        notes.append(
                            f"Potential tension between {a.agent_origin} and {b.agent_origin}: "
                            f"differing emphasis or interpretation detected."
                        )
        return notes

    def _share_entities(self, text1: str, text2: str) -> bool:
        entities = ["sungbo", "eredo", "mansa musa", "mali", "ijebu", "timbuktu"]
        t1, t2 = text1.lower(), text2.lower()
        return any(e in t1 and e in t2 for e in entities)

    def _looks_contradictory(self, text1: str, text2: str) -> bool:
        t1, t2 = text1.lower(), text2.lower()
        for pos, neg in self.OPPOSING_CUES:
            if (pos in t1 and neg in t2) or (neg in t1 and pos in t2):
                return True
        return False


# ----------------------------------------------------------------------
# Safety Engine
# ----------------------------------------------------------------------
class EthicEngine:
    def evaluate(
        self, fragments: List[KnowledgeFragment], query: str
    ) -> tuple[List[KnowledgeFragment], List[str]]:
        safe: List[KnowledgeFragment] = []
        notes: List[str] = []

        for f in fragments:
            if len(f.content.strip()) < 15:
                continue
            if f.confidence < 0.65:
                notes.append(
                    f"Low-confidence fragment from {f.agent_origin} retained with caution."
                )
            safe.append(f)

        if not safe:
            notes.append(
                "No high-confidence fragments found. Response framed with epistemic humility."
            )
        return safe, notes


# ----------------------------------------------------------------------
# Rule-based Supervisor (Fallback)
# ----------------------------------------------------------------------
class RuleBasedSupervisor:
    def plan(self, query: str) -> ExecutionPlan:
        q = query.lower().strip()

        if any(k in q for k in ["hello", "hi ", "greet", "good morning", "good afternoon", "good evening"]):
            return ExecutionPlan(
                agents_to_call=["Anthropologist AI", "Linguist AI"],
                notes="Social greeting path – lightweight activation",
            )

        if any(k in q for k in ["sungbo", "eredo", "ijebu"]):
            return ExecutionPlan(
                agents_to_call=["Historian AI", "Archaeologist AI", "Anthropologist AI", "Linguist AI"],
                notes="Full multi-perspective treatment of the earthworks",
            )

        if any(k in q for k in ["mansa musa", "mali empire", "mali"]):
            return ExecutionPlan(
                agents_to_call=["Historian AI", "Archaeologist AI", "Ethicist AI"],
                notes="Political history + material culture + ethical framing",
            )

        if any(k in q for k in ["kemet", "egypt", "pyramid", "pharaoh", "hieroglyph", "maat"]):
            return ExecutionPlan(
                agents_to_call=["Historian AI", "Archaeologist AI", "Ethicist AI"],
                notes="Ancient Egypt / Kemet – historical + archaeological",
            )

        if any(k in q for k in ["nubia", "kush", "meroe", "kerma", "napata"]):
            return ExecutionPlan(
                agents_to_call=["Historian AI", "Archaeologist AI"],
                notes="Nubian kingdoms – history and archaeology",
            )

        if any(k in q for k in ["aksum", "axum", "ethiopia", "lalibela", "solomonic", "sheba"]):
            return ExecutionPlan(
                agents_to_call=["Historian AI", "Archaeologist AI", "Ethicist AI"],
                notes="Ethiopian civilizations",
            )

        if any(k in q for k in ["songhai", "timbuktu", "sankore", "djenne"]):
            return ExecutionPlan(
                agents_to_call=["Historian AI", "Archaeologist AI", "Ethicist AI"],
                notes="Songhai / Timbuktu scholarly tradition",
            )

        if any(k in q for k in ["great zimbabwe", "zimbabwe", "stone", "ruins"]):
            return ExecutionPlan(
                agents_to_call=["Historian AI", "Archaeologist AI"],
                notes="Great Zimbabwe stone architecture",
            )

        if any(k in q for k in ["benin", "ife", "oyo", "yoruba", "bronze", "ifat", "ifa", "divination"]):
            return ExecutionPlan(
                agents_to_call=["Historian AI", "Archaeologist AI", "Anthropologist AI"],
                notes="Yoruba / Benin bronze civilizations",
            )

        if any(k in q for k in ["swahili", "kilwa", "mombasa", "zanzibar", "indian ocean"]):
            return ExecutionPlan(
                agents_to_call=["Historian AI", "Archaeologist AI"],
                notes="Swahili Coast trade network",
            )

        if any(k in q for k in ["nok", "terracotta", "iron", "smelt", "ishango"]):
            return ExecutionPlan(
                agents_to_call=["Archaeologist AI", "Historian AI"],
                notes="Ancient technology and archaeology",
            )

        if any(k in q for k in ["adinkra", "kente", "nsibidi", "symbol", "cloth", "weave"]):
            return ExecutionPlan(
                agents_to_call=["Anthropologist AI", "Linguist AI", "Ethicist AI"],
                notes="Cultural motifs and symbols",
            )

        if any(k in q for k in ["ubuntu", "philosophy", "cosmology", "ethic", "governance"]):
            return ExecutionPlan(
                agents_to_call=["Anthropologist AI", "Ethicist AI"],
                notes="Philosophy and governance systems",
            )

        if any(k in q for k in ["math", "astronom", "calend", "science", "medic"]):
            return ExecutionPlan(
                agents_to_call=["Historian AI", "Archaeologist AI"],
                notes="Knowledge systems and innovations",
            )

        if any(k in q for k in ["afrofutur", "vanguard", "griot", "oral", "tradition"]):
            return ExecutionPlan(
                agents_to_call=["Anthropologist AI", "Ethicist AI", "Linguist AI"],
                notes="Afrofuturist narratives and oral traditions",
            )

        if any(k in q for k in ["africa", "african", "civilization", "history", "empire", "kingdom"]):
            return ExecutionPlan(
                agents_to_call=["Historian AI", "Archaeologist AI", "Anthropologist AI", "Linguist AI", "Ethicist AI"],
                notes="Broad African civilization query – full agent activation",
            )

        return ExecutionPlan(
            agents_to_call=["Historian AI", "Ethicist AI"],
            notes="Low-signal or general query – conservative activation",
        )


# ----------------------------------------------------------------------
# LLM-Powered Supervisor (Ollama → xAI / Grok → rules)
# ----------------------------------------------------------------------
SUPERVISOR_SYSTEM_PROMPT = """
You are the Supervisor of HoloKai, a multi-agent system specializing in African civilizations, history, archaeology, linguistics, and cultural protocols.

Your job is to decide which specialist agents should handle a user query.

Available agents:
- Historian AI: timelines, kingdoms, political history
- Archaeologist AI: material evidence, sites, dating
- Anthropologist AI: oral traditions, cultural meaning, social protocols
- Linguist AI: language, terminology, reconstruction
- Ethicist AI: cultural sensitivity, responsible framing, safety

Rules:
1. Only select agents that are genuinely relevant.
2. Always include Ethicist AI for sensitive or contested historical topics.
3. Prefer fewer high-value agents over activating everyone.
4. Output ONLY valid JSON in this exact format:

{
  "agents_to_call": ["Agent Name 1", "Agent Name 2"],
  "require_ethicist": true,
  "reasoning": "short explanation of your decision",
  "priority": "high"
}
"""

VALID_SUPERVISOR_AGENTS = {
    "Historian AI",
    "Archaeologist AI",
    "Anthropologist AI",
    "Linguist AI",
    "Ethicist AI",
}


class LLMSupervisor:
    """
    Planning supervisor.

    Provider order (HOLAKAI_SUPERVISOR_PROVIDER=auto default):
      1. Ollama (local or cloud via ollama-python) when reachable / key present
      2. xAI Grok when XAI_API_KEY / OPENAI_API_KEY set
      3. Rule-based fallback
    """

    def __init__(self):
        self.fallback = RuleBasedSupervisor()
        self.provider = (os.getenv("HOLAKAI_SUPERVISOR_PROVIDER") or "auto").lower()
        self.ollama_model = (
            os.getenv("HOLAKAI_SUPERVISOR_MODEL")
            or os.getenv("HOLAKAI_CHAT_MODEL")
            or os.getenv("NEXT_PUBLIC_OLLAMA_MODEL")
            or "gemma4"
        )
        self.xai_key = os.getenv("XAI_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.xai_client = None
        self.ollama_ready = False
        self.active_backend: str = "rules"

        # Probe Ollama (fast; auto falls through on failure)
        if self.provider in ("auto", "ollama"):
            try:
                from ollama_client import list_models, resolve_chat_host

                host = resolve_chat_host()
                list_models(host, purpose="chat")
                self.ollama_ready = True
                self.active_backend = "ollama"
                logger.info(
                    "LLM Supervisor: Ollama ready · host=%s · model=%s",
                    host,
                    self.ollama_model,
                )
            except Exception as exc:
                self.ollama_ready = False
                if self.provider == "ollama":
                    logger.warning("Ollama supervisor requested but unavailable: %s", exc)
                else:
                    logger.info("Ollama supervisor probe failed (%s); trying xAI / rules", exc)

        if (
            not self.ollama_ready
            and self.provider in ("auto", "xai", "grok")
            and self.xai_key
        ):
            try:
                from openai import OpenAI

                self.xai_client = OpenAI(
                    api_key=self.xai_key,
                    base_url="https://api.x.ai/v1",
                )
                self.active_backend = "xai"
                logger.info("LLM Supervisor initialized with xAI / Grok")
            except Exception as e:
                logger.warning("Failed to initialize xAI client: %s", e)
                self.xai_client = None

        if not self.ollama_ready and self.xai_client is None:
            self.active_backend = "rules"
            logger.info("No LLM supervisor available – using rule-based Supervisor only")

    @property
    def enabled(self) -> bool:
        return self.active_backend in ("ollama", "xai")

    def _parse_plan(self, raw: str) -> ExecutionPlan:
        data = json.loads(raw)
        agents = data.get("agents_to_call", ["Historian AI", "Ethicist AI"])
        agents = [a for a in agents if a in VALID_SUPERVISOR_AGENTS]
        if not agents:
            agents = ["Historian AI", "Ethicist AI"]
        return ExecutionPlan(
            agents_to_call=agents,
            require_ethicist=data.get("require_ethicist", True),
            notes=data.get("reasoning", "LLM-generated plan"),
        )

    def _plan_ollama(self, query: str) -> ExecutionPlan:
        from ollama_client import chat_text

        raw = chat_text(
            [
                {"role": "system", "content": SUPERVISOR_SYSTEM_PROMPT},
                {"role": "user", "content": f"Query: {query}"},
            ],
            model=self.ollama_model,
            options={"temperature": 0.2},
            format="json",
        )
        # Some models wrap JSON in fences
        text = (raw or "").strip()
        if text.startswith("```"):
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:].strip()
        return self._parse_plan(text)

    def _plan_xai(self, query: str) -> ExecutionPlan:
        response = self.xai_client.chat.completions.create(
            model="grok-3-latest",
            messages=[
                {"role": "system", "content": SUPERVISOR_SYSTEM_PROMPT},
                {"role": "user", "content": f"Query: {query}"},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        return self._parse_plan(response.choices[0].message.content)

    def plan(self, query: str) -> ExecutionPlan:
        if self.active_backend == "ollama" and self.ollama_ready:
            try:
                return self._plan_ollama(query)
            except Exception as e:
                logger.warning("Ollama supervisor failed, falling back: %s", e)
                if self.xai_client is not None:
                    try:
                        return self._plan_xai(query)
                    except Exception as e2:
                        logger.warning("xAI supervisor also failed: %s", e2)
                return self.fallback.plan(query)

        if self.active_backend == "xai" and self.xai_client is not None:
            try:
                return self._plan_xai(query)
            except Exception as e:
                logger.warning("LLM Supervisor failed, falling back to rules: %s", e)
                return self.fallback.plan(query)

        return self.fallback.plan(query)


# ----------------------------------------------------------------------
# Main Orchestrator
# ----------------------------------------------------------------------
class CivilizationCore:
    def __init__(self, enable_vector_rag: bool | None = None):
        """
        Multi-agent core. When vector RAG is enabled (default), agents retrieve via
        Ollama nomic-embed-text + Chroma — the same embedding model as frontend Vanguard RAG.
        """
        if enable_vector_rag is None:
            enable_vector_rag = os.getenv("HOLAKAI_VECTOR_RAG", "1").strip() not in (
                "0",
                "false",
                "no",
                "off",
            )

        self.kb = None
        self.rag_status: Dict[str, Any] = {"enabled": False, "ready": False}

        if enable_vector_rag:
            try:
                from knowledge_base import KnowledgeBase, ensure_seeded

                self.kb = KnowledgeBase()
                # Seed only when empty; failures must not kill multi-agent core
                seed_summary: Dict[str, Any] = {"skipped": True}
                try:
                    if self.kb.count() == 0:
                        seed_summary = ensure_seeded(self.kb, force=False)
                    else:
                        seed_summary = {
                            "skipped": True,
                            "count": self.kb.count(),
                            "reason": "already seeded",
                        }
                except Exception as seed_exc:
                    logger.warning("Auto-seed deferred (%s)", seed_exc)
                    seed_summary = {"skipped": True, "error": str(seed_exc)}

                self.rag_status = {
                    "enabled": True,
                    "ready": self.kb.count() > 0,
                    "store": self.kb.status(),
                    "seed": seed_summary,
                }
                logger.info(
                    "Vector RAG online · backend=%s · %s chunks · %s",
                    getattr(self.kb, "backend", "?"),
                    self.kb.count(),
                    self.kb.embedder.model,
                )
            except Exception as exc:
                logger.warning(
                    "Vector RAG unavailable (%s) — agents will use keyword/comprehensive fallback",
                    exc,
                )
                self.rag_status = {
                    "enabled": True,
                    "ready": False,
                    "error": str(exc),
                    "hint": (
                        "Start Ollama and pull nomic-embed-text. "
                        "chromadb is optional (JSON vector store is used if missing)."
                    ),
                }

        self.agents: Dict[str, Agent] = {
            "Historian AI": HistorianAI(knowledge_base=self.kb),
            "Archaeologist AI": ArchaeologistAI(knowledge_base=self.kb),
            "Anthropologist AI": AnthropologistAI(knowledge_base=self.kb),
            "Linguist AI": LinguistAI(knowledge_base=self.kb),
            "Ethicist AI": EthicistAI(knowledge_base=self.kb),
        }
        self.supervisor = LLMSupervisor()
        self.ethic_engine = EthicEngine()
        self.contradiction_detector = ContradictionDetector()

    def process_query(self, query: str) -> SynthesisResponse:
        trace_id = str(uuid.uuid4())
        logger.info(f"[{trace_id}] Incoming query: {query[:140]}")

        plan = self.supervisor.plan(query)
        logger.info(f"[{trace_id}] Plan → {plan.agents_to_call} | {plan.notes}")

        # -------------------- Parallel Execution --------------------
        fragments: List[KnowledgeFragment] = []
        active_agents: List[str] = []

        with ThreadPoolExecutor(max_workers=plan.max_workers) as executor:
            future_to_name = {
                executor.submit(self.agents[name].analyze, query): name
                for name in plan.agents_to_call
                if name in self.agents
            }

            for future in as_completed(future_to_name):
                agent_name = future_to_name[future]
                try:
                    result = future.result()
                    if result:
                        active_agents.append(agent_name)
                        fragments.extend(result)
                except Exception as exc:
                    logger.error(f"[{trace_id}] Agent {agent_name} failed: {exc}")

        # -------------------- Ethicist Final Gate --------------------
        if plan.require_ethicist and "Ethicist AI" not in active_agents:
            try:
                ethic_result = self.agents["Ethicist AI"].analyze(query)
                if ethic_result:
                    fragments.extend(ethic_result)
                    active_agents.append("Ethicist AI")
            except Exception as exc:
                logger.error(f"[{trace_id}] Ethicist failed: {exc}")

        # -------------------- Contradiction Detection --------------------
        contradiction_notes = self.contradiction_detector.detect(fragments)

        # -------------------- Safety + Synthesis --------------------
        safe_fragments, safety_notes = self.ethic_engine.evaluate(fragments, query)
        safety_notes.extend(contradiction_notes)

        confidence = (
            round(sum(f.confidence for f in safe_fragments) / len(safe_fragments), 3)
            if safe_fragments
            else 0.0
        )

        response = SynthesisResponse(
            title=self._title_for(query),
            query=query,
            fragments=safe_fragments,
            summary=self._summarize(safe_fragments),
            confidence=confidence,
            trace_id=trace_id,
            active_agents=active_agents,
            safety_notes=safety_notes,
            emotions=self._emotion_profile(query, safe_fragments),
        )

        logger.info(
            f"[{trace_id}] Completed | confidence={confidence} | agents={active_agents}"
        )
        return response

    # -------------------- Helpers --------------------
    def _title_for(self, query: str) -> str:
        q = query.lower()
        if any(k in q for k in ["mansa musa", "mali"]):
            return "The Legacy of Mansa Musa"
        if any(k in q for k in ["sungbo", "eredo"]):
            return "Sungbo's Eredo Synthesis"
        if any(k in q for k in ["hello", "greet", "hi "]):
            return "Initialization Greetings"
        if any(k in q for k in ["kemet", "egypt", "pyramid"]):
            return "Ancient Kemet — Nile Valley Civilization"
        if any(k in q for k in ["nubia", "kush", "meroe"]):
            return "Kingdom of Kush — Nubian Legacy"
        if any(k in q for k in ["aksum", "ethiopia", "lalibela"]):
            return "Aksum and Ethiopian Civilizations"
        if any(k in q for k in ["songhai", "timbuktu", "sankore"]):
            return "Songhai Empire and Timbuktu Scholarship"
        if any(k in q for k in ["great zimbabwe", "zimbabwe"]):
            return "Great Zimbabwe — Stone Architecture"
        if any(k in q for k in ["benin", "ife", "yoruba"]):
            return "Yoruba and Benin — Bronze Art Civilizations"
        if any(k in q for k in ["swahili", "kilwa"]):
            return "Swahili Coast — Indian Ocean Trade"
        if any(k in q for k in ["nok", "terracotta", "ishango"]):
            return "Ancient African Technology and Innovation"
        if any(k in q for k in ["adinkra", "kente", "nsibidi"]):
            return "African Cultural Motifs and Symbolism"
        if any(k in q for k in ["ubuntu", "philosophy", "maat"]):
            return "African Philosophy and Governance"
        if any(k in q for k in ["afrofutur", "vanguard"]):
            return "Afrofuturism — Where Civilization Remembers"
        if any(k in q for k in ["africa", "african", "civilization", "history", "empire", "kingdom"]):
            return "African Civilization Overview"
        return "Civilization Data Retrieval"

    def _summarize(self, fragments: List[KnowledgeFragment]) -> str:
        if not fragments:
            return "No high-confidence evidence was available for a responsible synthesis."
        return " ".join(f.content for f in fragments[:4])

    def _emotion_profile(
        self, query: str, fragments: List[KnowledgeFragment]
    ) -> Dict[str, float]:
        base = {
            "empathy": 0.75,
            "curiosity": 0.70,
            "analytical": 0.85,
            "culturalResonance": 0.80,
        }
        text = " ".join(f.content.lower() for f in fragments)

        if "mansa" in text or "mali" in text:
            base.update({"analytical": 0.95, "culturalResonance": 0.97})
        if "sungbo" in text or "eredo" in text:
            base.update({"curiosity": 0.93, "culturalResonance": 0.96})
        if any(k in query.lower() for k in ["hello", "greet", "hi "]):
            base.update({"empathy": 0.95, "curiosity": 0.60})

        return base

    def to_dict(self, response: SynthesisResponse) -> Dict[str, Any]:
        data = asdict(response)
        data["fragments"] = [
            {**asdict(f), "source_type": f.source_type.value} for f in response.fragments
        ]
        return data


# ----------------------------------------------------------------------
# Self-test
# ----------------------------------------------------------------------
if __name__ == "__main__":
    core = CivilizationCore()
    test_queries = [
        "Tell me about Sungbo's Eredo",
        "Who was Mansa Musa?",
        "Hello HoloKai",
        "What is the capital of France?",
    ]
    for q in test_queries:
        result = core.process_query(q)
        print(json.dumps(core.to_dict(result), indent=2, ensure_ascii=False))
        print("-" * 70)