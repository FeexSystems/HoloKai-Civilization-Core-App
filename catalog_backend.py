from __future__ import annotations

import logging
from typing import Any, Dict, List

from library_catalog import (
    facets as json_facets,
    get_source as json_get_source,
    review_source as json_review_source,
    search_sources as json_search_sources,
    upsert_sources as json_upsert_sources,
)
from postgres_store import get_postgres_store, postgres_store_status

logger = logging.getLogger("holokai.catalog")


def _pg():
    return get_postgres_store()


def ensure_storage_ready() -> Dict[str, Any]:
    pg = _pg()
    if not pg:
        return {"backend": "json", "ready": True}
    try:
        schema = pg.ensure_schema()
        return {"backend": "postgres", "ready": True, "schema": schema}
    except Exception as exc:
        logger.warning("Postgres schema init failed; falling back to JSON: %s", exc)
        return {"backend": "json", "ready": True, "fallback_reason": str(exc)}


def storage_status() -> Dict[str, Any]:
    pg = postgres_store_status()
    if pg.get("enabled") and pg.get("ready"):
        return {"backend": "postgres", **pg}
    return {"backend": "json", **pg}


def search_sources(**kwargs) -> Dict[str, Any]:
    pg = _pg()
    if pg:
        try:
            return pg.search_sources(**kwargs)
        except Exception as exc:
            logger.warning("Postgres search failed; fallback JSON: %s", exc)
    return json_search_sources(**kwargs)


def get_source(slug: str) -> Dict[str, Any] | None:
    pg = _pg()
    if pg:
        try:
            return pg.get_source(slug)
        except Exception as exc:
            logger.warning("Postgres get_source failed; fallback JSON: %s", exc)
    return json_get_source(slug)


def upsert_sources(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    pg = _pg()
    if pg:
        try:
            return pg.upsert_sources(records)
        except Exception as exc:
            logger.warning("Postgres upsert failed; fallback JSON: %s", exc)
    return json_upsert_sources(records)


def review_source(slug: str, decision: str, reviewer_role: str, notes: str = "") -> Dict[str, Any]:
    pg = _pg()
    if pg:
        try:
            return pg.review_source(slug, decision, reviewer_role, notes)
        except Exception as exc:
            logger.warning("Postgres review failed; fallback JSON: %s", exc)
    return json_review_source(slug, decision, reviewer_role, notes)


def facets() -> Dict[str, List[str]]:
    pg = _pg()
    if pg:
        try:
            return pg.facets()
        except Exception as exc:
            logger.warning("Postgres facets failed; fallback JSON: %s", exc)
    return json_facets()


def persist_grounded(query: str, grounded: Dict[str, Any]) -> Dict[str, Any]:
    pg = _pg()
    if not pg:
        return {"persisted": False, "backend": "json"}
    try:
        out = pg.persist_grounded(query, grounded)
        out["backend"] = "postgres"
        return out
    except Exception as exc:
        logger.warning("Postgres grounded persistence failed: %s", exc)
        return {"persisted": False, "backend": "postgres", "error": str(exc)}
