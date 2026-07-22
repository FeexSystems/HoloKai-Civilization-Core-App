from __future__ import annotations

import hashlib
import json
import re
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List

from catalog_backend import upsert_sources

RIS_TYPE_MAP = {
    "JOUR": "journal_article",
    "JFULL": "journal_article",
    "BOOK": "book",
    "CHAP": "book_chapter",
    "CONF": "conference_paper",
    "THES": "thesis",
    "RPRT": "report",
    "ELEC": "web_resource",
    "GEN": "generic",
}

EVIDENCE_BY_TYPE = {
    "journal_article": "peer_reviewed_scholarship",
    "book": "scholarly_book",
    "book_chapter": "scholarly_book",
    "conference_paper": "conference_proceeding",
    "thesis": "thesis",
    "report": "report",
    "web_resource": "web_archive",
    "generic": "unclassified",
}


def _read_text_guess(path: Path) -> str:
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "utf-16", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def _slugify(text: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", (text or "").strip().lower()).strip("-")
    return s[:120] or "untitled-source"


def _normalize_doi(value: str | None) -> str | None:
    if not value:
        return None
    v = value.strip()
    v = v.replace("https://doi.org/", "").replace("http://doi.org/", "")
    v = v.replace("doi:", "")
    m = re.search(r"10\.\d{4,9}/[-._;()/:A-Z0-9]+", v, re.IGNORECASE)
    return m.group(0).lower() if m else None


def _canonical_url(doi: str | None, urls: List[str]) -> str | None:
    if doi:
        return f"https://doi.org/{doi}"
    for u in urls:
        if "consensus.app" in u.lower():
            continue
        if u.startswith("http"):
            return u
    return None


def _verify_doi(doi: str, timeout: float = 8.0) -> Dict[str, Any]:
    doi_url = f"https://doi.org/{doi}"
    req = urllib.request.Request(
        doi_url,
        headers={"Accept": "application/vnd.citationstyles.csl+json"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            final_url = res.geturl()
            payload = json.loads(res.read().decode("utf-8", errors="replace"))
            return {
                "ok": True,
                "final_url": final_url,
                "title": payload.get("title"),
                "publisher": payload.get("publisher"),
                "type": payload.get("type"),
            }
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return {"ok": False, "error": str(exc), "final_url": doi_url}


def parse_ris_records(text: str) -> List[Dict[str, List[str]]]:
    records: List[Dict[str, List[str]]] = []
    current: Dict[str, List[str]] = {}

    for line in text.splitlines():
        if not line.strip():
            continue
        if re.match(r"^[A-Z0-9]{2}\s+-\s+", line):
            tag = line[:2]
            value = line[6:].strip()
            current.setdefault(tag, []).append(value)
            if tag == "ER":
                records.append(current)
                current = {}
    if current:
        records.append(current)
    return records


def normalize_record(record: Dict[str, List[str]], verify_doi: bool = False) -> Dict[str, Any]:
    ty = (record.get("TY") or ["GEN"])[0].upper()
    item_type = RIS_TYPE_MAP.get(ty, "generic")

    title = (record.get("TI") or record.get("T1") or ["Untitled source"])[0]
    authors = record.get("AU") or record.get("A1") or []
    year = (record.get("PY") or record.get("Y1") or [None])[0]
    journal = (record.get("JO") or record.get("JF") or record.get("T2") or [None])[0]

    urls = record.get("UR") or []
    doi = _normalize_doi((record.get("DO") or [None])[0])
    canonical_url = _canonical_url(doi, urls)

    if item_type == "generic" and journal:
        item_type = "journal_article"

    peer_reviewed = item_type in {"journal_article", "conference_paper"}
    evidence_type = EVIDENCE_BY_TYPE.get(item_type, "unclassified")

    hash_basis = "|".join([
        title.strip().lower(),
        ",".join(sorted(a.strip().lower() for a in authors)),
        str(year or ""),
        str(doi or ""),
    ])
    content_hash = hashlib.sha256(hash_basis.encode("utf-8", errors="ignore")).hexdigest()

    doi_check = None
    if verify_doi and doi:
        doi_check = _verify_doi(doi)
        if doi_check.get("ok") and doi_check.get("final_url"):
            canonical_url = doi_check["final_url"]

    slug = _slugify(f"{title}-{year or ''}")

    return {
        "slug": slug,
        "title": title,
        "authors": authors,
        "item_type": item_type,
        "region": "unspecified",
        "era": "unspecified",
        "language": (record.get("LA") or ["unknown"])[0],
        "evidence_type": evidence_type,
        "peer_reviewed": peer_reviewed,
        "access_status": "unknown",
        "rights_status": "pending_rights_review",
        "canonical_url": canonical_url,
        "doi": doi,
        "year": year,
        "journal": journal,
        "content_hash": content_hash,
        "custodian_notes": "Imported from RIS as candidate-source bibliography; not public canon text.",
        "editorial_status": "staged",
        "doi_verification": doi_check,
        "related_scholarship": [],
    }


def import_ris_file(ris_path: str, verify_doi: bool = False) -> Dict[str, Any]:
    path = Path(ris_path)
    if not path.exists():
        raise FileNotFoundError(f"RIS file not found: {ris_path}")

    text = _read_text_guess(path)
    raw_records = parse_ris_records(text)
    normalized = [normalize_record(r, verify_doi=verify_doi) for r in raw_records]

    deduped: List[Dict[str, Any]] = []
    seen = set()
    for row in normalized:
        key = row.get("doi") or row.get("content_hash")
        if key in seen:
            continue
        seen.add(key)
        deduped.append(row)

    upsert = upsert_sources(deduped)
    return {
        "ok": True,
        "file": str(path),
        "records_raw": len(raw_records),
        "records_deduped": len(deduped),
        "upsert": upsert,
    }
