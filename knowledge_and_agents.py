from __future__ import annotations

import uuid
import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

logger = logging.getLogger("holokai.rag")

# ----------------------------------------------------------------------
# Schemas (keep consistent with the rest of the system)
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
# Knowledge Base (RAG Layer)
# ----------------------------------------------------------------------
class KnowledgeBase:
    def __init__(self, persist_directory: str = "./holokai_chroma"):
        logger.info("Initializing KnowledgeBase...")
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")

        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(anonymized_telemetry=False),
        )

        self.collection = self.client.get_or_create_collection(
            name="holokai_knowledge",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info(f"KnowledgeBase ready. Documents: {self.collection.count()}")

    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        """
        documents = [
            {
                "text": "...",
                "metadata": {
                    "domain": "historian" | "archaeology" | "anthropology" | "linguistics" | "ethics",
                    "source": "...",
                    "title": "..."
                }
            },
            ...
        ]
        """
        if not documents:
            return

        ids = [str(uuid.uuid4()) for _ in documents]
        texts = [d["text"] for d in documents]
        metadatas = [d.get("metadata", {}) for d in documents]
        embeddings = self.embedder.encode(texts, show_progress_bar=False).tolist()

        self.collection.add(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
        )
        logger.info(f"Added {len(documents)} documents. Total now: {self.collection.count()}")

    def retrieve(
        self,
        query: str,
        domain: Optional[str] = None,
        top_k: int = 4,
        min_score: float = 0.42,
    ) -> List[Dict[str, Any]]:
        query_embedding = self.embedder.encode(query, show_progress_bar=False).tolist()

        kwargs: Dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": top_k,
            "include": ["documents", "metadatas", "distances"],
        }
        if domain:
            kwargs["where"] = {"domain": domain}

        results = self.collection.query(**kwargs)

        chunks: List[Dict[str, Any]] = []
        if not results["documents"] or not results["documents"][0]:
            return chunks

        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            score = 1.0 - float(dist)  # cosine distance → similarity
            if score < min_score:
                continue
            chunks.append({
                "text": doc,
                "metadata": meta or {},
                "score": score,
            })
        return chunks


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
            fragments.append(
                KnowledgeFragment(
                    source_type=source_type,
                    content=chunk["text"],
                    confidence=round(conf, 3),
                    agent_origin=self.name,
                    citation=chunk["metadata"].get("source"),
                    metadata=chunk["metadata"],
                )
            )
        return fragments


# ----------------------------------------------------------------------
# Upgraded Agents (RAG-powered)
# ----------------------------------------------------------------------
class HistorianAI(BaseAgent):
    def __init__(self, knowledge_base: KnowledgeBase):
        super().__init__("Historian AI", "historian", knowledge_base)

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        chunks = self.kb.retrieve(query, domain="historian", top_k=4)
        fragments = self._chunks_to_fragments(
            chunks, SourceType.HISTORICAL_CONSENSUS
        )

        # Light fallback for classic queries
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
        return self._chunks_to_fragments(
            chunks, SourceType.ARCHAEOLOGICAL_EVIDENCE
        )


class AnthropologistAI(BaseAgent):
    def __init__(self, knowledge_base: KnowledgeBase):
        super().__init__("Anthropologist AI", "anthropology", knowledge_base)

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        chunks = self.kb.retrieve(query, domain="anthropology", top_k=4)
        fragments = self._chunks_to_fragments(
            chunks, SourceType.ORAL_TRADITION
        )

        # Greeting fallback
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
        return self._chunks_to_fragments(
            chunks, SourceType.LINGUISTIC_RECONSTRUCTION
        )


class EthicistAI(BaseAgent):
    def __init__(self, knowledge_base: KnowledgeBase):
        super().__init__("Ethicist AI", "ethics", knowledge_base)

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        chunks = self.kb.retrieve(query, domain="ethics", top_k=3)
        fragments = self._chunks_to_fragments(
            chunks, SourceType.CULTURAL_PROTOCOL, confidence_boost=0.2
        )

        # Extra safety for wealth-related queries
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


# ----------------------------------------------------------------------
# Seed Data (run once)
# ----------------------------------------------------------------------
def seed_knowledge_base(kb: KnowledgeBase) -> None:
    documents = [
        # Sungbo’s Eredo
        {
            "text": "Sungbo’s Eredo is one of the largest earthwork complexes in West Africa, located in the Ijebu region of southwestern Nigeria. It consists of massive ditches and embankments that stretch for over 160 kilometers.",
            "metadata": {
                "domain": "archaeology",
                "source": "Archaeological surveys",
                "title": "Sungbo’s Eredo – Scale",
            },
        },
        {
            "text": "Oral traditions among the Ijebu people associate the construction of the Eredo with a legendary noblewoman known as Bilikisu Sungbo. These traditions emphasize communal labor, spiritual protection, and founding narratives.",
            "metadata": {
                "domain": "anthropology",
                "source": "Local oral histories",
                "title": "Sungbo Oral Traditions",
            },
        },
        {
            "text": "In local Yoruba usage, the term ‘Eredo’ refers to a large defensive trench or embankment. The name itself encodes both function and landscape form.",
            "metadata": {
                "domain": "linguistics",
                "source": "Linguistic notes",
                "title": "Meaning of Eredo",
            },
        },
        {
            "text": "Historical interpretations place Sungbo’s Eredo within the broader context of large-scale earthwork traditions in the forest zone of West Africa, demonstrating sophisticated political organization and labor mobilization.",
            "metadata": {
                "domain": "historian",
                "source": "Regional historical synthesis",
                "title": "Historical Context of the Eredo",
            },
        },
        # Mansa Musa
        {
            "text": "Mansa Musa ruled the Mali Empire from approximately 1312 to 1337. His pilgrimage to Mecca in 1324–1325 is one of the most famous journeys in medieval African history and drew widespread attention to the wealth and scholarship of West Africa.",
            "metadata": {
                "domain": "historian",
                "source": "Ibn Battuta, al-Umari, modern syntheses",
                "title": "Mansa Musa Overview",
            },
        },
        {
            "text": "Contemporary Arabic sources describe the enormous quantities of gold that Mansa Musa distributed during his pilgrimage, which temporarily affected gold prices in Cairo and the eastern Mediterranean.",
            "metadata": {
                "domain": "historian",
                "source": "al-Umari",
                "title": "Economic Impact of the Pilgrimage",
            },
        },
        {
            "text": "Discussions of Mansa Musa’s wealth should emphasize institutional achievement, support for scholarship (especially in Timbuktu), and diplomatic engagement rather than reducing the empire to stereotypes of extravagance.",
            "metadata": {
                "domain": "ethics",
                "source": "Cultural protocol notes",
                "title": "Responsible Framing of Imperial Wealth",
            },
        },
        {
            "text": "Archaeological and architectural evidence from the wider Niger Bend supports the existence of major urban centers and long-distance trade networks during the height of the Mali Empire.",
            "metadata": {
                "domain": "archaeology",
                "source": "Niger Bend studies",
                "title": "Material Context of Mali",
            },
        },
    ]

    if kb.collection.count() == 0:
        kb.add_documents(documents)
        logger.info("Knowledge base seeded successfully.")
    else:
        logger.info("Knowledge base already contains documents. Skipping seed.")


# ----------------------------------------------------------------------
# Factory helper
# ----------------------------------------------------------------------
def create_rag_agents(persist_directory: str = "./holokai_chroma"):
    """Convenience function to create a fully wired set of RAG agents."""
    kb = KnowledgeBase(persist_directory=persist_directory)
    seed_knowledge_base(kb)

    agents = {
        "Historian AI": HistorianAI(kb),
        "Archaeologist AI": ArchaeologistAI(kb),
        "Anthropologist AI": AnthropologistAI(kb),
        "Linguist AI": LinguistAI(kb),
        "Ethicist AI": EthicistAI(kb),
    }
    return kb, agents