from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parent
CATALOG_PATH = ROOT / "holokai_memory" / "catalog_sources.json"
AUDIT_LOG_PATH = ROOT / "holokai_memory" / "editorial_audit.jsonl"

_LOCK = threading.Lock()


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _default_catalog() -> Dict[str, Any]:
    return {
        "version": 1,
        "updated_at": _utc_now(),
        "sources": [
            {
                "slug": "axum-empire",
                "title": "Axum (Aksumite Empire)",
                "authors": ["Curated by HoloKai editorial team"],
                "item_type": "reference_entry",
                "region": "Horn of Africa",
                "era": "ancient",
                "language": "English",
                "evidence_type": "historical_consensus",
                "peer_reviewed": False,
                "access_status": "open",
                "rights_status": "editorial_original",
                "canonical_url": "https://en.wikipedia.org/wiki/Kingdom_of_Aksum",
                "doi": None,
                "content_hash": "seed-axum-1",
                "custodian_notes": "Starter entry pending external reviewed bibliography linking.",
                "editorial_status": "reviewed",
                "related_scholarship": [],
            },
            {
                "slug": "nubia-kush",
                "title": "Nubia & Kingdom of Kush",
                "authors": ["Curated by HoloKai editorial team"],
                "item_type": "reference_entry",
                "region": "Northeast Africa",
                "era": "ancient",
                "language": "English",
                "evidence_type": "historical_consensus",
                "peer_reviewed": False,
                "access_status": "open",
                "rights_status": "editorial_original",
                "canonical_url": "https://en.wikipedia.org/wiki/Kingdom_of_Kush",
                "doi": None,
                "content_hash": "seed-kush-1",
                "custodian_notes": "Starter entry pending external reviewed bibliography linking.",
                "editorial_status": "reviewed",
                "related_scholarship": [],
            },
            {
                "slug": "mali-empire",
                "title": "Mali Empire",
                "authors": ["Curated by HoloKai editorial team"],
                "item_type": "reference_entry",
                "region": "West Africa",
                "era": "medieval",
                "language": "English",
                "evidence_type": "historical_consensus",
                "peer_reviewed": False,
                "access_status": "open",
                "rights_status": "editorial_original",
                "canonical_url": "https://en.wikipedia.org/wiki/Mali_Empire",
                "doi": None,
                "content_hash": "seed-mali-1",
                "custodian_notes": "Starter entry pending external reviewed bibliography linking.",
                "editorial_status": "reviewed",
                "related_scholarship": [],
            },
        ],
    }


def _ensure_catalog() -> Dict[str, Any]:
    if not CATALOG_PATH.exists():
        CATALOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        payload = _default_catalog()
        CATALOG_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        return payload
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def _save_catalog(payload: Dict[str, Any]) -> None:
    payload["updated_at"] = _utc_now()
    CATALOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CATALOG_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _matches(source: Dict[str, Any], q: str) -> bool:
    if not q:
        return True
    target = " ".join(
        [
            str(source.get("title") or ""),
            " ".join(source.get("authors") or []),
            str(source.get("region") or ""),
            str(source.get("era") or ""),
            str(source.get("language") or ""),
            str(source.get("evidence_type") or ""),
            str(source.get("doi") or ""),
        ]
    ).lower()
    return q.lower() in target


def _apply_filters(source: Dict[str, Any], filters: Dict[str, Any]) -> bool:
    for key, value in filters.items():
        if value in (None, "", []):
            continue
        if key == "peer_reviewed":
            if bool(source.get(key)) != bool(value):
                return False
            continue
        if str(source.get(key) or "").lower() != str(value).lower():
            return False
    return True


def search_sources(
    *,
    q: str = "",
    region: str | None = None,
    era: str | None = None,
    language: str | None = None,
    evidence_type: str | None = None,
    editorial_status: str | None = "reviewed",
    peer_reviewed: bool | None = None,
    civilization: str | None = None,
    item_type: str | None = None,
    limit: int = 25,
    offset: int = 0,
) -> Dict[str, Any]:
    with _LOCK:
        payload = _ensure_catalog()
        rows = payload.get("sources") or []

    filters = {
        "region": region,
        "era": era,
        "language": language,
        "evidence_type": evidence_type,
        "editorial_status": editorial_status,
    }
    if item_type:
        filters["item_type"] = item_type
    if peer_reviewed is not None:
        filters["peer_reviewed"] = peer_reviewed

    # civilization is a soft text filter — records may lack the field,
    # so we do a case-insensitive substring check against the title + authors text.
    civ_lower = civilization.lower() if civilization else None

    def _matches_civ(source: Dict[str, Any]) -> bool:
        if not civ_lower:
            return True
        haystack = " ".join([
            str(source.get("civilization") or ""),
            str(source.get("title") or ""),
        ]).lower()
        return civ_lower in haystack

    kept = [s for s in rows if _matches(s, q) and _apply_filters(s, filters) and _matches_civ(s)]
    total = len(kept)
    paged = kept[offset : offset + max(1, min(limit, 200))]

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "items": paged,
    }


def get_source(slug: str) -> Dict[str, Any] | None:
    with _LOCK:
        payload = _ensure_catalog()
    for row in payload.get("sources") or []:
        if row.get("slug") == slug:
            return row
    return None


def upsert_sources(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    with _LOCK:
        payload = _ensure_catalog()
        rows = payload.get("sources") or []
        by_slug = {r.get("slug"): r for r in rows}

        inserted = 0
        updated = 0
        for record in records:
            slug = record.get("slug")
            if not slug:
                continue
            if slug in by_slug:
                by_slug[slug].update(record)
                updated += 1
            else:
                rows.append(record)
                by_slug[slug] = record
                inserted += 1

        payload["sources"] = rows
        _save_catalog(payload)

    return {"inserted": inserted, "updated": updated, "total": len(payload.get("sources") or [])}


def review_source(slug: str, decision: str, reviewer_role: str, notes: str = "") -> Dict[str, Any]:
    allowed = {"approved", "rejected", "needs_changes"}
    if decision not in allowed:
        raise ValueError(f"decision must be one of: {sorted(allowed)}")

    with _LOCK:
        payload = _ensure_catalog()
        target = None
        for row in payload.get("sources") or []:
            if row.get("slug") == slug:
                target = row
                break
        if not target:
            raise KeyError(f"source not found: {slug}")

        target["editorial_status"] = "reviewed" if decision == "approved" else "staged"
        target["review_decision"] = decision
        target["review_notes"] = notes
        target["reviewed_at"] = _utc_now()
        _save_catalog(payload)

        AUDIT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        audit = {
            "at": _utc_now(),
            "slug": slug,
            "decision": decision,
            "notes": notes,
            "reviewer_role": reviewer_role,
        }
        with AUDIT_LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(audit, ensure_ascii=False) + "\n")

    return target


def facets() -> Dict[str, List[str]]:
    with _LOCK:
        payload = _ensure_catalog()
        rows = payload.get("sources") or []

    def uniq(key: str) -> List[str]:
        vals = sorted({str(r.get(key) or "").strip() for r in rows if str(r.get(key) or "").strip()})
        return vals

    return {
        "regions": uniq("region"),
        "eras": uniq("era"),
        "languages": uniq("language"),
        "evidence_types": uniq("evidence_type"),
        "statuses": uniq("editorial_status"),
    }
