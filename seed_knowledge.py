#!/usr/bin/env python3
"""
Seed HoloKai full intelligence stack:
  • Knowledge graph (nodes + relationships)
  • Live memory bootstrap (episodic / semantic / procedural)
  • Vector active reply store (classic + comprehensive + files + graph docs)

Embeddings go through ollama-python (`ollama_client` / `embeddings_ollama`).
With HOLAKAI_FULL_RAG=1, hashing/minilm fallbacks allow offline seed.

Usage:
  python seed_knowledge.py
  python seed_knowledge.py --force     # wipe vector collection and re-seed
  python seed_knowledge.py --alive     # full Alive Engine seed
  python seed_knowledge.py --status
  python seed_knowledge.py --graph-only
"""

from __future__ import annotations

import argparse
import json
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("holokai.seed")


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed HoloKai RAG + graph + memory")
    parser.add_argument("--force", action="store_true", help="Clear and re-seed")
    parser.add_argument("--status", action="store_true", help="Print status only")
    parser.add_argument("--alive", action="store_true", help="Use Alive Engine seed")
    parser.add_argument("--graph-only", action="store_true", help="Only seed knowledge graph")
    parser.add_argument(
        "--full-graph-vectors",
        action="store_true",
        help="Embed entire graph inventory (~12k) into vector cosine store",
    )
    parser.add_argument(
        "--persist",
        default=None,
        help="Chroma persist directory (default: ./holokai_chroma)",
    )
    args = parser.parse_args()

    if args.graph_only:
        from graph_seed import seed_knowledge_graph

        summary = seed_knowledge_graph(force=args.force, dense=True)
        print(json.dumps(summary, indent=2, default=str))
        return 0

    if args.full_graph_vectors:
        import os

        # No cap — full inventory
        os.environ["HOLAKAI_GRAPH_VECTOR_MAX"] = "0"
        from graph_seed import seed_knowledge_graph
        from knowledge_base import KnowledgeBase, seed_from_graph, ensure_seeded
        from knowledge_graph import get_graph

        # Ensure graph is full 12k
        gsum = seed_knowledge_graph(force=False, dense=True)
        g = get_graph()
        print(json.dumps({"graph": g.stats() if hasattr(g, "stats") else gsum}, indent=2, default=str))

        kwargs = {}
        if args.persist:
            kwargs["persist_directory"] = args.persist
        kb = KnowledgeBase(**kwargs)
        if args.force and kb.count() > 0:
            print(f"Clearing vector store ({kb.count()} docs)...")
            kb.clear()
            # classic + comprehensive + files first, then full graph
            from knowledge_base import (
                seed_classic_fragments,
                seed_from_comprehensive,
                seed_from_knowledge_files,
            )

            c = seed_classic_fragments(kb)
            comp = seed_from_comprehensive(kb)
            files = seed_from_knowledge_files(kb)
            print(f"base seed classic={c} comprehensive={comp} files={files}")
        print(f"Embedding full graph inventory into {kb.collection_name} ...")
        n = seed_from_graph(kb, max_nodes=0)
        print(
            json.dumps(
                {
                    "graph_docs_embedded": n,
                    "vector_total": kb.count(),
                    "collection": kb.collection_name,
                    "backend": kb.backend,
                    "embeddings": kb.embedder.status(),
                    "graph_nodes": len(g.nodes),
                },
                indent=2,
                default=str,
            )
        )
        print(f"\n✓ Full inventory cosine store · {kb.count()} vectors · graph={len(g.nodes)}")
        return 0 if n > 0 or kb.count() > 0 else 1

    if args.alive:
        from holokai_alive import ensure_alive_seeded, alive_status

        summary = ensure_alive_seeded(force=args.force)
        print(json.dumps({"seed": summary, "status": alive_status()}, indent=2, default=str))
        print("\n✓ HoloKai Alive seeded")
        return 0

    try:
        from embeddings_ollama import check_embeddings
        from knowledge_base import KnowledgeBase, ensure_seeded
    except ImportError as exc:
        logger.error("Import failed: %s — run pip install -r requirements.txt", exc)
        return 1

    emb = check_embeddings()
    if not emb.get("ok"):
        logger.error("Embeddings not ready: %s", emb.get("error"))
        logger.error("Fix: ollama pull nomic-embed-text  (or rely on HOLAKAI_FULL_RAG hashing fallback)")
        # Continue anyway if full rag hashing may work inside Embedder
        logger.warning("Continuing seed attempt with available embed backend...")

    print(json.dumps({"embeddings": emb}, indent=2))

    kwargs = {}
    if args.persist:
        kwargs["persist_directory"] = args.persist

    try:
        kb = KnowledgeBase(**kwargs)
    except Exception as exc:
        logger.error("Failed to open KnowledgeBase: %s", exc)
        return 1

    if args.status:
        status = {"vector": kb.status()}
        try:
            from knowledge_graph import get_graph
            from memory_store import get_memory
            from reply_store import get_reply_store

            status["graph"] = get_graph().status()
            status["memory"] = get_memory().status()
            status["replies"] = get_reply_store().status()
        except Exception as exc:
            status["aux_error"] = str(exc)
        print(json.dumps(status, indent=2, default=str))
        return 0

    summary = ensure_seeded(kb, force=args.force)
    print(json.dumps(summary, indent=2, default=str))
    print(f"\n✓ Ancestral memory ready · {kb.count()} chunks · {kb.collection_name}")
    try:
        from knowledge_graph import get_graph
        from memory_store import get_memory

        g = get_graph().stats()
        m = get_memory().counts()
        print(f"✓ Knowledge graph · {g.get('nodes')} nodes · {g.get('edges')} edges")
        print(f"✓ Live memory · {m.get('total')} memories")
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
