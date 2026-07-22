from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("holokai.pg")


def _slugify(text: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", (text or "").strip().lower()).strip("-")
    return value[:120] or "untitled-source"


class PostgresStore:
    def __init__(self, dsn: str):
        self.dsn = dsn

    @staticmethod
    def _import_psycopg():
        try:
            import psycopg  # type: ignore
            from psycopg.rows import dict_row  # type: ignore

            return psycopg, dict_row
        except ImportError as exc:  # pragma: no cover - optional dependency
            raise RuntimeError(
                "psycopg is not installed. Add `psycopg[binary]` to requirements for PostgreSQL mode."
            ) from exc

    def _connect(self):
        psycopg, dict_row = self._import_psycopg()
        return psycopg.connect(self.dsn, row_factory=dict_row)

    def ensure_schema(self) -> Dict[str, Any]:
        sql_path = Path(__file__).resolve().parent / "docs" / "postgres_pgvector_schema.sql"
        if not sql_path.exists():
            raise RuntimeError(f"Schema file not found: {sql_path}")

        script = sql_path.read_text(encoding="utf-8")
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(script)
            conn.commit()
        return {"ok": True, "schema": str(sql_path)}

    def health(self) -> Dict[str, Any]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 AS ok")
                one = cur.fetchone() or {}
        return {"ok": bool(one.get("ok") == 1), "dsn_set": bool(self.dsn)}

    def upsert_sources(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not records:
            return {"inserted": 0, "updated": 0, "total": self._count_sources()}

        slugs = [str(r.get("slug") or "").strip() for r in records if str(r.get("slug") or "").strip()]
        slugs = list(dict.fromkeys(slugs))

        inserted = 0
        updated = 0

        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT slug FROM source_records WHERE slug = ANY(%s)", (slugs,))
                existing = {row["slug"] for row in (cur.fetchall() or [])}

                for rec in records:
                    slug = str(rec.get("slug") or "").strip()
                    if not slug:
                        continue
                    if slug in existing:
                        updated += 1
                    else:
                        inserted += 1

                    cur.execute(
                        """
                        INSERT INTO source_records (
                            slug, title, item_type, authors, canonical_url, doi, region, era,
                            language, evidence_type, peer_reviewed, rights_status, access_status,
                            custodian_notes, content_hash, editorial_status
                        ) VALUES (
                            %s, %s, %s, %s::jsonb, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s
                        )
                        ON CONFLICT (slug) DO UPDATE SET
                            title = EXCLUDED.title,
                            item_type = EXCLUDED.item_type,
                            authors = EXCLUDED.authors,
                            canonical_url = EXCLUDED.canonical_url,
                            doi = EXCLUDED.doi,
                            region = EXCLUDED.region,
                            era = EXCLUDED.era,
                            language = EXCLUDED.language,
                            evidence_type = EXCLUDED.evidence_type,
                            peer_reviewed = EXCLUDED.peer_reviewed,
                            rights_status = EXCLUDED.rights_status,
                            access_status = EXCLUDED.access_status,
                            custodian_notes = EXCLUDED.custodian_notes,
                            content_hash = EXCLUDED.content_hash,
                            editorial_status = EXCLUDED.editorial_status,
                            updated_at = NOW()
                        """,
                        (
                            slug,
                            rec.get("title") or "Untitled source",
                            rec.get("item_type") or "generic",
                            json.dumps(rec.get("authors") or []),
                            rec.get("canonical_url"),
                            rec.get("doi"),
                            rec.get("region"),
                            rec.get("era"),
                            rec.get("language"),
                            rec.get("evidence_type"),
                            rec.get("peer_reviewed"),
                            rec.get("rights_status") or "pending_rights_review",
                            rec.get("access_status") or "unknown",
                            rec.get("custodian_notes"),
                            rec.get("content_hash")
                            or hashlib.sha256((slug + str(rec.get("title") or "")).encode("utf-8", errors="ignore")).hexdigest(),
                            rec.get("editorial_status") or "staged",
                        ),
                    )
            conn.commit()

        return {"inserted": inserted, "updated": updated, "total": self._count_sources()}

    def _count_sources(self) -> int:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) AS c FROM source_records")
                row = cur.fetchone() or {}
        return int(row.get("c") or 0)

    def search_sources(
        self,
        *,
        q: str = "",
        region: str | None = None,
        era: str | None = None,
        language: str | None = None,
        evidence_type: str | None = None,
        editorial_status: str | None = "reviewed",
        peer_reviewed: bool | None = None,
        limit: int = 25,
        offset: int = 0,
    ) -> Dict[str, Any]:
        where = []
        params: List[Any] = []

        if q:
            like = f"%{q}%"
            where.append(
                "(title ILIKE %s OR authors::text ILIKE %s OR COALESCE(region,'') ILIKE %s OR COALESCE(era,'') ILIKE %s OR COALESCE(doi,'') ILIKE %s)"
            )
            params.extend([like, like, like, like, like])

        if region:
            where.append("region = %s")
            params.append(region)
        if era:
            where.append("era = %s")
            params.append(era)
        if language:
            where.append("language = %s")
            params.append(language)
        if evidence_type:
            where.append("evidence_type = %s")
            params.append(evidence_type)
        if editorial_status is not None:
            where.append("editorial_status = %s")
            params.append(editorial_status)
        if peer_reviewed is not None:
            where.append("peer_reviewed = %s")
            params.append(peer_reviewed)

        where_sql = f"WHERE {' AND '.join(where)}" if where else ""

        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(f"SELECT COUNT(*) AS c FROM source_records {where_sql}", tuple(params))
                total = int((cur.fetchone() or {}).get("c") or 0)

                cur.execute(
                    f"""
                    SELECT
                        slug, title, item_type, authors, canonical_url, doi, region, era,
                        language, evidence_type, peer_reviewed, rights_status, access_status,
                        custodian_notes, content_hash, editorial_status, created_at, updated_at
                    FROM source_records
                    {where_sql}
                    ORDER BY updated_at DESC
                    LIMIT %s OFFSET %s
                    """,
                    tuple(params + [max(1, min(int(limit), 200)), max(0, int(offset))]),
                )
                items = cur.fetchall() or []

        return {"total": total, "offset": offset, "limit": limit, "items": items}

    def get_source(self, slug: str) -> Dict[str, Any] | None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        slug, title, item_type, authors, canonical_url, doi, region, era,
                        language, evidence_type, peer_reviewed, rights_status, access_status,
                        custodian_notes, content_hash, editorial_status, created_at, updated_at
                    FROM source_records
                    WHERE slug = %s
                    """,
                    (slug,),
                )
                row = cur.fetchone()

        if not row:
            return None

        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT decision, reviewer_role, notes, created_at
                    FROM review_decisions rd
                    JOIN source_records sr ON sr.id = rd.source_id
                    WHERE sr.slug = %s
                    ORDER BY rd.created_at DESC
                    LIMIT 20
                    """,
                    (slug,),
                )
                row["review_history"] = cur.fetchall() or []

        return row

    def review_source(self, slug: str, decision: str, reviewer_role: str, notes: str = "") -> Dict[str, Any]:
        allowed = {"approved", "rejected", "needs_changes"}
        if decision not in allowed:
            raise ValueError(f"decision must be one of: {sorted(allowed)}")

        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM source_records WHERE slug = %s", (slug,))
                row = cur.fetchone()
                if not row:
                    raise KeyError(f"source not found: {slug}")
                source_id = int(row["id"])

                editorial_status = "reviewed" if decision == "approved" else "staged"
                cur.execute(
                    """
                    UPDATE source_records
                    SET editorial_status = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    """,
                    (editorial_status, source_id),
                )

                cur.execute(
                    """
                    INSERT INTO review_decisions (source_id, decision, reviewer_role, notes)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (source_id, decision, reviewer_role, notes),
                )
            conn.commit()

        out = self.get_source(slug)
        if not out:
            raise KeyError(f"source not found after review: {slug}")
        out["review_decision"] = decision
        out["review_notes"] = notes
        return out

    def facets(self) -> Dict[str, List[str]]:
        def _distinct(col: str) -> List[str]:
            with self._connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        f"SELECT DISTINCT {col} AS v FROM source_records WHERE COALESCE({col}, '') <> '' ORDER BY {col} ASC"
                    )
                    rows = cur.fetchall() or []
            return [str(r["v"]) for r in rows if r.get("v") is not None]

        return {
            "regions": _distinct("region"),
            "eras": _distinct("era"),
            "languages": _distinct("language"),
            "evidence_types": _distinct("evidence_type"),
            "statuses": _distinct("editorial_status"),
        }

    def _resolve_source_id(self, citation: Dict[str, Any]) -> int:
        slug = (citation.get("source_slug") or "").strip()
        title = (citation.get("source_title") or "Untitled Source").strip()

        with self._connect() as conn:
            with conn.cursor() as cur:
                if slug:
                    cur.execute("SELECT id FROM source_records WHERE slug = %s", (slug,))
                    found = cur.fetchone()
                    if found:
                        return int(found["id"])

                cur.execute("SELECT id, slug FROM source_records WHERE title = %s ORDER BY id ASC LIMIT 1", (title,))
                found = cur.fetchone()
                if found:
                    return int(found["id"])

                make_slug = slug or _slugify(title)
                hashv = hashlib.sha256((make_slug + title).encode("utf-8", errors="ignore")).hexdigest()
                cur.execute(
                    """
                    INSERT INTO source_records (
                      slug, title, item_type, authors, canonical_url, doi, region, era,
                      language, evidence_type, peer_reviewed, rights_status, access_status,
                      custodian_notes, content_hash, editorial_status
                    ) VALUES (
                      %s, %s, 'citation_stub', '[]'::jsonb, NULL, NULL, 'unspecified', 'unspecified',
                      'unknown', %s, NULL, 'pending_rights_review', 'unknown',
                      'Auto-created from grounded citation persistence.', %s, 'staged'
                    )
                    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
                    RETURNING id
                    """,
                    (make_slug, title, citation.get("evidence_type") or "unclassified", hashv),
                )
                out = cur.fetchone() or {}
            conn.commit()
        sid = out.get("id")
        if sid is None:
            raise RuntimeError("Failed to resolve source id for citation")
        return int(sid)

    def persist_grounded(self, query: str, grounded: Dict[str, Any]) -> Dict[str, Any]:
        claims = grounded.get("claims") or []
        if not claims:
            return {"persisted": False, "claims": 0, "citations": 0}

        inserted_claims = 0
        inserted_citations = 0

        with self._connect() as conn:
            with conn.cursor() as cur:
                for idx, claim in enumerate(claims, start=1):
                    ctext = str(claim.get("text") or "").strip()
                    if not ctext:
                        continue
                    uid = claim.get("claim_id") or f"claim-{idx}"
                    claim_uid = hashlib.sha1(f"{query}|{uid}|{ctext}".encode("utf-8", errors="ignore")).hexdigest()
                    cur.execute("SELECT id FROM claims WHERE claim_uid = %s", (claim_uid,))
                    exists = cur.fetchone()
                    if not exists:
                        inserted_claims += 1
                    cur.execute(
                        """
                        INSERT INTO claims (claim_uid, text, uncertainty_status, contestation_status)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (claim_uid) DO UPDATE SET
                            text = EXCLUDED.text,
                            uncertainty_status = EXCLUDED.uncertainty_status,
                            contestation_status = EXCLUDED.contestation_status
                        RETURNING id
                        """,
                        (
                            claim_uid,
                            ctext,
                            claim.get("evidence_status") or "open",
                            claim.get("contestation_status") or "open",
                        ),
                    )
                    claim_row = cur.fetchone() or {}
                    claim_id = int(claim_row["id"])

                    for citation in (claim.get("citations") or []):
                        source_id = self._resolve_source_id(citation)
                        citation_uid = citation.get("citation_id") or hashlib.sha1(
                            f"{claim_uid}|{citation.get('source_title')}|{citation.get('passage')}".encode(
                                "utf-8", errors="ignore"
                            )
                        ).hexdigest()[:16]

                        cur.execute(
                            "SELECT id FROM claim_citations WHERE claim_id = %s AND citation_uid = %s",
                            (claim_id, citation_uid),
                        )
                        if not cur.fetchone():
                            inserted_citations += 1

                        cur.execute(
                            """
                            INSERT INTO claim_citations (claim_id, source_id, passage_id, citation_uid, evidence_type, reviewer_notes)
                            VALUES (%s, %s, NULL, %s, %s, %s)
                            ON CONFLICT (claim_id, citation_uid) DO UPDATE SET
                                source_id = EXCLUDED.source_id,
                                evidence_type = EXCLUDED.evidence_type,
                                reviewer_notes = EXCLUDED.reviewer_notes
                            """,
                            (
                                claim_id,
                                source_id,
                                citation_uid,
                                citation.get("evidence_type") or "unclassified",
                                citation.get("uncertainty") or "",
                            ),
                        )
            conn.commit()

        return {
            "persisted": True,
            "claims": inserted_claims,
            "citations": inserted_citations,
            "total_claims_seen": len(claims),
        }

    def create_job(self, job_type: str, payload: Dict[str, Any]) -> int:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO ingest_jobs (job_type, status, payload, result)
                    VALUES (%s, 'queued', %s::jsonb, '{}'::jsonb)
                    RETURNING id
                    """,
                    (job_type, json.dumps(payload or {})),
                )
                row = cur.fetchone() or {}
            conn.commit()
        return int(row["id"])

    def update_job(self, job_id: int, *, status: str, result: Dict[str, Any] | None = None) -> None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                if result is None:
                    cur.execute(
                        "UPDATE ingest_jobs SET status = %s, updated_at = NOW() WHERE id = %s",
                        (status, job_id),
                    )
                else:
                    cur.execute(
                        "UPDATE ingest_jobs SET status = %s, result = %s::jsonb, updated_at = NOW() WHERE id = %s",
                        (status, json.dumps(result), job_id),
                    )
            conn.commit()

    def get_job(self, job_id: int) -> Dict[str, Any] | None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, job_type, status, payload, result, created_at, updated_at FROM ingest_jobs WHERE id = %s",
                    (job_id,),
                )
                row = cur.fetchone()
        return row

    def list_jobs(
        self,
        *,
        job_type: str | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        where = []
        params: List[Any] = []

        if job_type:
            where.append("job_type = %s")
            params.append(job_type)
        if status:
            where.append("status = %s")
            params.append(status)

        where_sql = f"WHERE {' AND '.join(where)}" if where else ""

        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(f"SELECT COUNT(*) AS c FROM ingest_jobs {where_sql}", tuple(params))
                total = int((cur.fetchone() or {}).get("c") or 0)

                cur.execute(
                    f"""
                    SELECT id, job_type, status, payload, result, created_at, updated_at
                    FROM ingest_jobs
                    {where_sql}
                    ORDER BY updated_at DESC, id DESC
                    LIMIT %s OFFSET %s
                    """,
                    tuple(params + [max(1, min(int(limit), 200)), max(0, int(offset))]),
                )
                items = cur.fetchall() or []

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "items": items,
        }


_store_singleton: Optional[PostgresStore] = None
_store_error: Optional[str] = None


def get_postgres_store() -> PostgresStore | None:
    global _store_singleton, _store_error

    if _store_singleton is not None:
        return _store_singleton
    if _store_error is not None:
        return None

    dsn = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_DSN")
    if not dsn:
        _store_error = "DATABASE_URL/POSTGRES_DSN not configured"
        return None

    try:
        _store_singleton = PostgresStore(dsn)
        return _store_singleton
    except Exception as exc:
        logger.warning("Postgres store init failed: %s", exc)
        _store_error = str(exc)
        return None


def postgres_store_status() -> Dict[str, Any]:
    store = get_postgres_store()
    if not store:
        return {"enabled": False, "ready": False, "error": _store_error}
    try:
        h = store.health()
        return {"enabled": True, "ready": bool(h.get("ok")), "health": h}
    except Exception as exc:
        return {"enabled": True, "ready": False, "error": str(exc)}
