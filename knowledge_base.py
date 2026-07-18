from __future__ import annotations

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any
import uuid

class KnowledgeBase:
    def __init__(self, persist_directory: str = "./holokai_chroma"):
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(anonymized_telemetry=False)
        )
        
        self.collection = self.client.get_or_create_collection(
            name="holokai_knowledge",
            metadata={"hnsw:space": "cosine"}
        )

    def add_documents(self, documents: List[Dict[str, Any]]):
        """
        documents = [
            {
                "text": "Sungbo’s Eredo is ...",
                "metadata": {
                    "domain": "archaeology",          # historian | archaeology | anthropology | linguistics | ethics
                    "source": "Field reports 2019",
                    "title": "Sungbo’s Eredo Overview"
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
        embeddings = self.embedder.encode(texts).tolist()

        self.collection.add(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas
        )

    def retrieve(
        self,
        query: str,
        domain: str | None = None,
        top_k: int = 4
    ) -> List[Dict[str, Any]]:
        query_embedding = self.embedder.encode(query).tolist()

        where_filter = {"domain": domain} if domain else None

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )

        chunks = []
        if results["documents"]:
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0]
            ):
                chunks.append({
                    "text": doc,
                    "metadata": meta,
                    "score": 1 - dist  # convert distance to similarity
                })
        return chunks