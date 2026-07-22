# HoloKai Meta-Agent Extract — Knowledge, Memories, Learning, Self, Vanguards

Captured from user handoff (session inventory). Status: **LIVE** — full graph seed hits **12,419 nodes** via `graph_seed.py` → `holokai_graph/graph.json`.

Reseed: `python seed_knowledge.py --graph-only --force` or `python -c "from graph_seed import seed_knowledge_graph; print(seed_knowledge_graph(force=True)['stats'])"`

---

## Knowledge Base (12,419 nodes)

### Top level
| Layer | Nodes | % of total |
|--------|------:|-----------:|
| Entities | 8,219 | 66.1% |
| Relationships | 4,200 | 33.8% |
| **Total** | **12,419** | ~100% |

### Entities (8,219)
| Type | Nodes | % of entities | Nested types (labels) |
|------|------:|--------------:|------------------------|
| People | 1,911 | 23.2% | Historical figures · Cultural icons · Scientists |
| Places | 1,604 | 19.5% | Countries · Cities · Landmarks |
| Events | 1,201 | 14.6% | Historical events · Cultural festivals · Scientific discoveries |
| Concepts | 3,503 | 42.6% | Ideas · Theories · Cultural practices |

### Relationships (4,200)
| Type | Nodes | % of relationships | Nested kinds (labels) |
|------|------:|-------------------:|------------------------|
| Hierarchical | 1,201 | 28.6% | Entity subclass relationships |
| Associative | 1,005 | 23.9% | Entity associations |
| Causal | 801 | 19% | Cause-and-effect relationships |
| Others | 1,193 | 28.4% | Spatial relationships · Temporal relationships |

---

## Memories (8,219 system-wide)

| Type | Count | Detail |
|------|------:|--------|
| Episodic | 4,311 | User interactions 2,103 · Conversations 452 · User preferences 1,012 · residual ~744 |
| Semantic | 2,903 | Topic knowledge 6,406 *(cross-index)* · Concept relationships 2,201 *(cross-index)* |
| Procedural | 1,005 | Response strategies 501 · Generation algorithms 504 |

`4,311 + 2,903 + 1,005 = 8,219`

---

## Learning Hierarchy

| Level | Name | Overall accuracy | Skills |
|------:|------|----------------:|--------|
| 1 | Pattern Recognition | 70% | Entity recognition 80% · Relationship detection 60% · Entity information 85% |
| 2 | Information Retrieval | 80% | Relationship information 75% |
| 3 | Knowledge Integration | 75% | Entity merging 80% · Relationship resolution 70% |
| 4 | Inference and Reasoning | 60% | Logical reasoning 65% · Analogical reasoning 55% |

L3 check: (80+70)/2 = 75%. L4 check: (65+55)/2 = 60%.

---

## About Myself — HoloKai (identity slice)

| # | Dimension | Count | Detail |
|---|-----------|------:|--------|
| 1 | Knowledge | 501 nodes | African history, culture, and civilizations expert |
| 2 | Memories | 201 episodes | User interactions, conversations, and feedback |
| 3 | Responses | 1,005 | Accurate and informative answers about African topics |

Notes:
- Identity knowledge (501) ≠ full graph (12,419).
- Identity memories (201) ≠ full episodic (4,311).
- Responses (1,005) aligns with Procedural total (501 strategies + 504 generation algorithms).

---

## Vanguards

| # | Dimension | Count | Detail |
|---|-----------|------:|--------|
| 1 | Knowledge | 301 nodes | Elite warriors in African empires like Mali and Songhai |
| 2 | Memories | 101 episodes | User questions about Vanguard history and tactics |
| 3 | Responses | 501 | Detailed answers about Vanguard armor, weapons, and battles |

Notes:
- Vanguard responses (501) aligns with Procedural "Response strategies" (501).
- Vanguard knowledge (301) is a military/elite slice; HoloKai-self knowledge is broader (501).
- Vanguard memories (101) is a tactics Q&A slice vs HoloKai-self episodes (201).

App archetype IDs (for mapping): `oluwa-core`, `naja-7`, `kemet-alpha`, `zamani`, `bantu-node`, `sika-gold`, `asante-v`, `kush-prime`.

---

## African Civilizations

| # | Dimension | Count | Detail |
|---|-----------|------:|--------|
| 1 | Knowledge | 2,011 nodes | Ancient and modern civilizations (Egypt, Nubia, Axum, …) |
| 2 | Memories | 801 episodes | User interactions about African history & culture |
| 3 | Responses | 1,501 | Contributions, achievements, and legacies |

## Other Topics (civilization packs)

| # | Topic | Nodes | Episodes | Responses |
|---|-------|------:|---------:|----------:|
| 1 | Ancient Egypt | 801 | 301 | 1,001 |
| 3 | Nubia | 601 | 201 | 801 |
| 4 | Axum | 501 | 151 | 601 |
| 5 | African Empires (Mali, Songhai, etc.) | 1,001 | 401 | 1,201 |
| 6 | African Culture and Traditions | 1,201 | 501 | 1,401 |
| 7 | African History (general) | 2,001 | 801 | 2,001 |
| 8 | Timbuktu and Trade Networks | 401 | 151 | 501 |

---

## Open items
- Nested counts under entity/relationship subtypes
- Episodic residual ~744
- Semantic index vs node clarification
- Learning promotion rules
- Schema + sample nodes/edges for import
- Topic pack → RAG file mapping completeness

---

## Topic packs seeded in knowledge files (Egypt / Nubia / Axum)

| Pack | File | Nodes | Episodes | Responses |
|------|------|------:|---------:|----------:|
| Ancient Egypt / Kemet | `frontend/public/knowledge/kemet.txt` | 801 | 301 | 1,001 |
| Nubia | `frontend/public/knowledge/nubia-kush.txt` | 601 | 201 | 801 |
| Axum | `frontend/public/knowledge/axum-empire.txt` | 501 | 151 | 601 |

Catalog: `frontend/lib/rag/knowledgeCatalog.js` → `topicPack` + `getTopicPacks()`.

Reseed: `cd frontend && npm run rag:seed` and/or `python seed_knowledge.py --force`.

---

## Integration targets (repo)
- Graph seed → future knowledge graph / `knowledge_base_comprehensive.py`
- Vector RAG → `frontend/public/knowledge/*.txt` + `seed_knowledge.py` + existing `/api/rag/*` (not client-side chromadb npm)
- Personas → `frontend/app/archetypes.js` + `knowledgeCatalog.js`
- Agents → `holokai_backend.py` Supervisor + specialists
- UI → `frontend/app/VanguardModal.js` (tabs: Chat / Voice / Vision)
- TTS → `frontend/app/useTTS.js` (full Voice tab STT + TTS)
