class HistorianAI(BaseAgent):
    def __init__(self, knowledge_base: KnowledgeBase):
        super().__init__("Historian AI", "Historical timelines and kingdoms")
        self.kb = knowledge_base

    def analyze(self, query: str) -> List[KnowledgeFragment]:
        # Retrieve relevant historical knowledge
        chunks = self.kb.retrieve(query, domain="historian", top_k=3)

        fragments = []
        for chunk in chunks:
            if chunk["score"] < 0.45:  # relevance threshold
                continue

            fragments.append(
                KnowledgeFragment(
                    source_type=SourceType.HISTORICAL_CONSENSUS,
                    content=chunk["text"],
                    confidence=min(0.95, 0.70 + chunk["score"] * 0.25),
                    agent_origin=self.name,
                    citation=chunk["metadata"].get("source"),
                    metadata=chunk["metadata"]
                )
            )

        # Optional: keep a small fallback for classic keyword cases
        if not fragments and self._contains(query, ["mansa musa", "mali"]):
            fragments.append(
                KnowledgeFragment(
                    source_type=SourceType.HISTORICAL_CONSENSUS,
                    content="Mansa Musa (c. 1312–1337) ruled the Mali Empire at its height...",
                    confidence=0.88,
                    agent_origin=self.name,
                    citation="Fallback historical synthesis"
                )
            )

        return fragments