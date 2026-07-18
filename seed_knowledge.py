#!/usr/bin/env python3
"""
Seed HoloKai Python vector knowledge base (Ollama nomic-embed-text + Chroma).

Prerequisites:
  ollama pull nomic-embed-text
  pip install -r requirements.txt

Usage:
  python seed_knowledge.py
  python seed_knowledge.py --force     # wipe collection and re-seed
  python seed_knowledge.py --status
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
    parser = argparse.ArgumentParser(description="Seed HoloKai RAG knowledge base")
    parser.add_argument("--force", action="store_true", help="Clear and re-seed")
    parser.add_argument("--status", action="store_true", help="Print status only")
    parser.add_argument(
        "--persist",
        default=None,
        help="Chroma persist directory (default: ./holokai_chroma)",
    )
    args = parser.parse_args()

    try:
        from embeddings_ollama import check_embeddings
        from knowledge_base import KnowledgeBase, ensure_seeded
    except ImportError as exc:
        logger.error("Import failed: %s — run pip install -r requirements.txt", exc)
        return 1

    emb = check_embeddings()
    if not emb.get("ok"):
        logger.error("Embeddings not ready: %s", emb.get("error"))
        logger.error("Fix: ollama pull nomic-embed-text  (and ensure Ollama is running)")
        return 1

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
        print(json.dumps(kb.status(), indent=2))
        return 0

    summary = ensure_seeded(kb, force=args.force)
    print(json.dumps(summary, indent=2))
    print(f"\n✓ Ancestral memory ready · {kb.count()} chunks · {kb.collection_name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
