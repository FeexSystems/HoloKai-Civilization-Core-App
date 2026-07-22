#!/usr/bin/env python3
"""
Ingest docs/ folder into HoloKai:
  - Vector store (KnowledgeBase via nomic-embed-text)
  - Knowledge graph (nodes + relationships)
  - Live memory bootstrap

Usage:
  python ingest_docs.py                     # ingest all markdown volumes + JSONL
  python ingest_docs.py --jsonl-only        # only the pre-chunked JSONL
  python ingest_docs.py --md-only           # only markdown volumes
  python ingest_docs.py --force             # clear vector store first
  python ingest_docs.py --status            # print what's in docs/ and exit
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("holokai.ingest")

DOCS_DIR = Path(__file__).resolve().parent / "docs"

# Volumes we want to chunk (key=filename, value=metadata overrides)
VOLUME_META: Dict[str, Dict[str, Any]] = {
    "HoloKai_Volume2_Classical_Empires.md": {
        "volume": "V2",
        "volume_title": "Classical African Empires & City-States",
        "domain": "historian",
    },
    "HoloKai_Volume3_Science_Universities.md": {
        "volume": "V3",
        "volume_title": "Science, Mathematics & Universities",
        "domain": "historian",
    },
    "HoloKai_Volume5_Queens_Matriarchy.md": {
        "volume": "V5",
        "volume_title": "Queens, Matriarchy & Warrior Women",
        "domain": "historian",
    },
    "HoloKai_Volume6_Spirituality_Cosmology.md": {
        "volume": "V6",
        "volume_title": "Spirituality, Cosmology & Philosophy",
        "domain": "anthropology",
    },
    "HoloKai_Volume7_Architecture_Cities.md": {
        "volume": "V7",
        "volume_title": "Architecture, Engineering & Cities",
        "domain": "archaeology",
    },
    "HoloKai_Volume9_Warfare_Strategy.md": {
        "volume": "V9",
        "volume_title": "Warfare, Strategy & Military Systems",
        "domain": "historian",
    },
    "HoloKai_Volume10_Oral_Libraries_Griots.md": {
        "volume": "V10",
        "volume_title": "Oral Libraries, Griots & Knowledge Systems",
        "domain": "anthropology",
    },
    "HoloKai_Volume11_Languages.md": {
        "volume": "V11",
        "volume_title": "Languages & Writing Systems",
        "domain": "linguistics",
    },
    "HoloKai_Volume12_Agriculture.md": {
        "volume": "V12",
        "volume_title": "Agriculture, Food Systems & Ecology",
        "domain": "anthropology",
    },
    "HoloKai_Volume13_Art_Music.md": {
        "volume": "V13",
        "volume_title": "Art, Music & Performance",
        "domain": "anthropology",
    },
    "HoloKai_Volume14_Thunder_Code.md": {
        "volume": "V14",
        "volume_title": "Thunder Code — Science & Hidden Knowledge",
        "domain": "historian",
    },
    "HoloKai_Volume15_Legal_Systems.md": {
        "volume": "V15",
        "volume_title": "Legal Systems, Ethics & Governance",
        "domain": "ethics",
    },
    "HoloKai_Volume16_Diaspora.md": {
        "volume": "V16",
        "volume_title": "Diaspora, Resistance & Pan-Africanism",
        "domain": "historian",
    },
    "HoloKai_Ancient_Africa_KB.md": {
        "volume": "V0",
        "volume_title": "Ancient Africa — Foundations",
        "domain": "historian",
    },
    "HoloKai_ULTIMATE_Master_Seed.md": {
        "volume": "MASTER",
        "volume_title": "Ultimate Master Seed — Cross-Volume Synthesis",
        "domain": "historian",
    },
    "HoloKai_16Volume_COMPLETE_LIBRARY.md": {
        "volume": "ALL",
        "volume_title": "Complete 16-Volume Library (single doc)",
        "domain": "historian",
    },
    "EXTRACTED_META_AGENT_KB.md": {
        "volume": "META",
        "volume_title": "Extracted Meta Agent Knowledge Base",
        "domain": "ethics",
    },
}


def _parse_tags(text: str) -> List[str]:
    """Extract tags list from metadata block."""
    m = re.search(r"- tags:\s*\[([^\]]+)\]", text)
    if m:
        return [t.strip() for t in m.group(1).split(",") if t.strip()]
    return []


def _parse_empire(text: str, filename: str) -> str:
    """Infer empire from content or filename."""
    known = re.findall(
        r"\b(Ghana|Mali|Songhai|Kongo|Axum|Kush|Kemet|Nubia|Ife|Benin|"
        r"Zimbabwe|Mapungubwe|Swahili|Ethiopia|Carthage|Wagadou)\b",
        text[:500],
    )
    if known:
        return known[0]
    for kw in ["kemet", "egypt", "nubia", "kush"]:
        if kw in filename.lower():
            return kw.title()
    return ""


def _parse_region(text: str) -> str:
    known = re.findall(
        r"\b(West Africa|East Africa|North Africa|Southern Africa|"
        r"Central Africa|Horn of Africa|Sahel|Nile Valley)\b",
        text[:500],
    )
    return known[0] if known else ""


def _chunk_markdown(filepath: Path, meta: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Split markdown by H2/## sections into embeddable chunks."""
    text = filepath.read_text(encoding="utf-8")
    chunks: List[Dict[str, Any]] = []
    tags = _parse_tags(text)
    empire = _parse_empire(text, filepath.name)
    region = _parse_region(text)

    lines = text.split("\n")
    current_h2 = ""
    current_h2_lines: List[str] = []
    current_h3 = ""
    current_block: List[str] = []
    in_graph_section = False

    def flush_block():
        nonlocal current_block
        if not current_block:
            return
        content = "\n".join(current_block).strip()
        if len(content) < 40:
            current_block = []
            return
        if in_graph_section:
            current_block = []
            return
        title_parts = [current_h2, current_h3]
        title = " — ".join(p for p in title_parts if p)
        m = {}
        m.update(meta)
        if tags:
            m["tags"] = "|".join(tags)
        if empire:
            m["empire"] = empire
        if region:
            m["region"] = region
        m["source"] = filepath.stem
        m["title"] = title
        chunks.append({"text": content, "metadata": m})
        current_block = []

    for line in lines:
        if re.match(r"^##\s+RELATIONSHIPS|^```", line):
            flush_block()
            in_graph_section = "RELATIONSHIPS" in line
            continue
        if in_graph_section:
            if line.strip().startswith("END") or line.strip().startswith("---"):
                in_graph_section = False
            continue
        h2 = re.match(r"^##\s+(.+)", line)
        if h2:
            flush_block()
            current_h2 = h2.group(1).strip()
            current_h3 = ""
            current_block = [line]
            continue
        h3 = re.match(r"^###\s+(.+)", line)
        if h3:
            flush_block()
            current_h3 = h3.group(1).strip()
            current_block = [line]
            continue
        current_block.append(line)

    flush_block()
    return chunks


def _parse_graph_relationships(filepath: Path) -> List[Dict[str, Any]]:
    """Extract RELATIONSHIPS FOR GRAPH blocks → nodes + edges."""
    text = filepath.read_text(encoding="utf-8")
    nodes: Dict[str, Dict[str, Any]] = {}
    edges: List[Dict[str, Any]] = {}

    # Find relationship block
    rel_block = re.search(
        r"##\s+RELATIONSHIPS FOR GRAPH\s*\n(.*?)(?:\nEND|\Z)",
        text,
        re.DOTALL,
    )
    if not rel_block:
        return {"nodes": [], "edges": []}

    for line in rel_block.group(1).split("\n"):
        line = line.strip()
        if not line or line.startswith("```"):
            continue
        # Parse edges: NodeA --[relation]--> NodeB
        m = re.match(r"(\w[\w\s]*) --\[(\w+)\]--> (\w[\w\s]*)", line)
        if m:
            src_name = m.group(1).strip()
            rel = m.group(2).strip()
            tgt_name = m.group(3).strip()
            for name in (src_name, tgt_name):
                if name not in nodes:
                    node_id = f"doc_{re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')}"
                    nodes[name] = {
                        "node_id": node_id,
                        "name": name,
                        "node_type": "concept",
                        "summary": name,
                        "empire": _parse_empire(name, filepath.name),
                        "domain": "historian",
                    }
            eid = f"e_{re.sub(r'[^a-z0-9]+', '_', f'{src_name}_{rel}_{tgt_name}'.lower()).strip('_')}"
            edges[eid] = {
                "source": nodes[src_name]["node_id"],
                "target": nodes[tgt_name]["node_id"],
                "rel_type": rel,
                "label": rel,
                "weight": 1.0,
                "metadata": {"source_file": filepath.name},
            }

    return {"nodes": list(nodes.values()), "edges": list(edges.values())}


def _ingest_jsonl(filepath: Path) -> List[Dict[str, Any]]:
    """Ingest pre-chunked JSONL file."""
    docs: List[Dict[str, Any]] = []
    for line in filepath.read_text(encoding="utf-8").strip().split("\n"):
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError as exc:
            logger.warning("Skipping bad JSONL line: %s", exc)
            continue
        text = entry.get("text", "")
        meta = dict(entry.get("metadata") or {})
        meta["origin"] = "jsonl_seed"
        meta["source"] = filepath.stem
        docs.append({"text": text, "metadata": meta})
    return docs


def _ingest_pdf(filepath: Path) -> List[Dict[str, Any]]:
    """Extract text from PDF. Returns empty if no PDF support."""
    try:
        import pdfminer.high_level
    except ImportError:
        logger.warning("pdfminer.six not installed — skipping %s", filepath.name)
        return []
    try:
        text = pdfminer.high_level.extract_text(str(filepath))
    except Exception as exc:
        logger.warning("PDF extract failed for %s: %s", filepath.name, exc)
        return []
    if not text.strip():
        return []
    chunks = []
    meta = {"origin": "pdf", "source": filepath.stem, "domain": "historian"}
    for i, para in enumerate(re.split(r"\n\s*\n", text)):
        p = para.strip()
        if len(p) < 60:
            continue
        chunks.append({
            "text": p[:2000],
            "metadata": {**meta, "chunk": i},
        })
    return chunks


def status() -> None:
    """Print doc status."""
    print(f"{'File':<55} {'Size':>8} {'Chunks':>7}  Notes")
    print("-" * 80)
    for f in sorted(DOCS_DIR.iterdir()):
        if f.is_dir() or f.name.startswith("."):
            continue
        size = f.stat().st_size
        meta = VOLUME_META.get(f.name, {})
        vol = meta.get("volume", "")
        domain = meta.get("domain", "")
        note = f"vol={vol} domain={domain}" if vol else ""
        print(f"{f.name:<55} {size:>8} {'?':>7}  {note}")
    print()


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest docs into HoloKai")
    parser.add_argument("--jsonl-only", action="store_true")
    parser.add_argument("--md-only", action="store_true")
    parser.add_argument("--force", action="store_true", help="Clear vector store first")
    parser.add_argument("--status", action="store_true", help="Print doc inventory")
    parser.add_argument("--skip-graph", action="store_true", help="Skip graph ingestion")
    args = parser.parse_args()

    if args.status:
        status()
        return 0

    logger.info("=== HoloKai Doc Ingestion ===")

    # ------------------------------------------------------------------
    # 0. Gather documents
    # ------------------------------------------------------------------
    all_docs: List[Dict[str, Any]] = []
    graph_nodes: List[Dict[str, Any]] = []
    graph_edges: List[Dict[str, Any]] = []

    jsonl_path = DOCS_DIR / "HoloKai_16Volume_MASTER_JSONL 2.jsonl"
    if jsonl_path.exists():
        logger.info("Found pre-chunked JSONL: %s", jsonl_path.name)
        if not args.md_only:
            jsonl_docs = _ingest_jsonl(jsonl_path)
            logger.info("  JSONL entries: %s", len(jsonl_docs))
            all_docs.extend(jsonl_docs)

    if not args.jsonl_only:
        for f in sorted(DOCS_DIR.iterdir()):
            if f.name.startswith(".") or f.is_dir():
                continue
            if f.name in ("RAG.md",):
                continue
            if f.name.endswith(".jsonl"):
                continue
            if f.suffix.lower() == ".pdf":
                pdf_docs = _ingest_pdf(f)
                logger.info("  %s → %s chunks", f.name, len(pdf_docs))
                all_docs.extend(pdf_docs)
                continue
            if f.suffix.lower() not in (".md", ".txt"):
                continue
            meta = VOLUME_META.get(f.name, {"domain": "historian"})
            chunks = _chunk_markdown(f, meta)
            logger.info("  %s → %s chunks (%s tags)", f.name, len(chunks),
                        meta.get("volume", "?"))
            all_docs.extend(chunks)
            if not args.skip_graph:
                gr = _parse_graph_relationships(f)
                graph_nodes.extend(gr["nodes"])
                graph_edges.extend(gr["edges"])
                if gr["nodes"]:
                    logger.info("    → %s graph nodes, %s edges",
                                len(gr["nodes"]), len(gr["edges"]))

    logger.info("Total documents to ingest: %s", len(all_docs))
    if graph_nodes:
        logger.info("Total graph nodes: %s, edges: %s",
                    len(graph_nodes), len(graph_edges))

    if not all_docs and not graph_nodes:
        logger.warning("Nothing to ingest!")
        return 1

    # ------------------------------------------------------------------
    # 1. Vector store
    # ------------------------------------------------------------------
    from knowledge_base import KnowledgeBase

    kb = KnowledgeBase()
    if args.force and kb.count() > 0:
        logger.info("Clearing vector store (%s docs)...", kb.count())
        kb.clear()

    existing = kb.count()
    if existing > 0:
        logger.info("Vector store already has %s docs (use --force to re-seed)", existing)

    if all_docs:
        n = kb.add_documents(all_docs)
        logger.info("Vector store: added %s docs (total now %s)", n, kb.count())
    else:
        logger.info("Vector store: no new documents (total %s)", kb.count())

    # ------------------------------------------------------------------
    # 2. Knowledge graph
    # ------------------------------------------------------------------
    if graph_nodes and not args.skip_graph:
        from knowledge_graph import get_graph

        g = get_graph()
        node_count = 0
        edge_count = 0
        for nd in graph_nodes:
            g.upsert_node(
                node_id=nd.get("node_id"),
                name=nd["name"],
                node_type=nd.get("node_type", "concept"),
                summary=nd.get("summary", ""),
                text=nd.get("text", nd["name"]),
                domain=nd.get("domain", "historian"),
                empire=nd.get("empire", ""),
                region=nd.get("region", ""),
                confidence=nd.get("confidence", 0.9),
                metadata={"origin": "doc_ingest"},
            )
            node_count += 1
        for ed in graph_edges:
            g.add_edge(
                ed["source"],
                ed["target"],
                rel_type=ed.get("rel_type", "associative"),
                label=ed.get("label", ""),
                weight=ed.get("weight", 1.0),
                metadata=ed.get("metadata", {}),
            )
            edge_count += 1
        if node_count or edge_count:
            g.save()
            stats = g.stats() if hasattr(g, "stats") else {"nodes": node_count, "edges": edge_count}
            logger.info("Knowledge graph: %s nodes, %s edges (total %s)", node_count, edge_count, stats)
    else:
        logger.info("Knowledge graph: skipped")

    # ------------------------------------------------------------------
    # 3. Summary
    # ------------------------------------------------------------------
    result = {
        "docs_ingested": len(all_docs),
        "vector_total": kb.count(),
        "graph_nodes": len(graph_nodes),
        "graph_edges": len(graph_edges),
        "collection": kb.collection_name,
        "backend": kb.backend,
        "embeddings": kb.embedder.status(),
    }
    print(json.dumps(result, indent=2, default=str))
    logger.info("Ingestion complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
