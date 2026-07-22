from __future__ import annotations

import logging
import threading
import traceback
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any, Callable, Dict

from postgres_store import get_postgres_store

logger = logging.getLogger("holokai.jobs")

_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="holokai-job")
_LOCK = threading.Lock()
_MEM_JOBS: Dict[str, Dict[str, Any]] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _set_mem_job(job_id: str, **patch: Any) -> None:
    with _LOCK:
        cur = _MEM_JOBS.get(job_id) or {"id": job_id, "created_at": _now()}
        cur.update(patch)
        cur["updated_at"] = _now()
        _MEM_JOBS[job_id] = cur


def _create_job_record(job_type: str, payload: Dict[str, Any]) -> tuple[str, str]:
    pg = get_postgres_store()
    if pg:
        try:
            db_id = pg.create_job(job_type, payload)
            return ("postgres", str(db_id))
        except Exception as exc:
            logger.warning("Postgres job create failed; using in-memory jobs: %s", exc)

    jid = str(uuid.uuid4())
    _set_mem_job(jid, job_type=job_type, status="queued", payload=payload, result={})
    return ("memory", jid)


def _update_job_record(backend: str, job_id: str, *, status: str, result: Dict[str, Any] | None = None) -> None:
    if backend == "postgres":
        pg = get_postgres_store()
        if pg:
            try:
                pg.update_job(int(job_id), status=status, result=result)
                return
            except Exception as exc:
                logger.warning("Postgres job update failed: %s", exc)

    _set_mem_job(job_id, status=status, result=result or {})


def submit_job(
    *,
    job_type: str,
    payload: Dict[str, Any],
    runner: Callable[[Dict[str, Any]], Dict[str, Any]],
) -> Dict[str, Any]:
    backend, job_id = _create_job_record(job_type, payload)

    def _run():
        _update_job_record(backend, job_id, status="running", result={"started_at": _now()})
        try:
            out = runner(payload) or {}
            _update_job_record(
                backend,
                job_id,
                status="succeeded",
                result={"completed_at": _now(), "output": out},
            )
        except Exception as exc:
            _update_job_record(
                backend,
                job_id,
                status="failed",
                result={
                    "failed_at": _now(),
                    "error": str(exc),
                    "traceback": traceback.format_exc(limit=6),
                },
            )

    _EXECUTOR.submit(_run)
    return {
        "ok": True,
        "job_id": job_id,
        "job_type": job_type,
        "status": "queued",
        "backend": backend,
        "created_at": _now(),
    }


def get_job(job_id: str) -> Dict[str, Any] | None:
    pg = get_postgres_store()
    if pg and job_id.isdigit():
        try:
            row = pg.get_job(int(job_id))
            if row:
                row["backend"] = "postgres"
            return row
        except Exception as exc:
            logger.warning("Postgres job fetch failed: %s", exc)

    with _LOCK:
        row = _MEM_JOBS.get(job_id)
        if row:
            out = dict(row)
            out["backend"] = "memory"
            return out
    return None


def list_jobs(
    *,
    job_type: str | None = None,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    pg = get_postgres_store()
    if pg:
        try:
            out = pg.list_jobs(job_type=job_type, status=status, limit=limit, offset=offset)
            out["backend"] = "postgres"
            return out
        except Exception as exc:
            logger.warning("Postgres list jobs failed: %s", exc)

    with _LOCK:
        rows = [dict(v) for v in _MEM_JOBS.values()]

    if job_type:
        rows = [r for r in rows if str(r.get("job_type") or "") == job_type]
    if status:
        rows = [r for r in rows if str(r.get("status") or "") == status]

    rows.sort(key=lambda r: str(r.get("updated_at") or r.get("created_at") or ""), reverse=True)
    total = len(rows)
    items = rows[offset : offset + max(1, min(int(limit), 200))]
    for item in items:
        item["backend"] = "memory"

    return {
        "backend": "memory",
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": items,
    }
