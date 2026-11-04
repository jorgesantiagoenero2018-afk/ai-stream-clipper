"""Background job queue executed in worker threads, with progress callbacks."""
from __future__ import annotations

import json
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable

from . import db

_executor = ThreadPoolExecutor(max_workers=2)
_progress: dict[str, Callable[[float], None]] = {}


def start_job(kind: str, func: Callable[[Callable[[float], None]], Any], payload: dict) -> str:
    """Run ``func(progress_cb)`` in a worker thread and return the job id."""
    job_id = db.insert(
        "jobs",
        kind=kind,
        status="queued",
        progress=0.0,
        payload=json.dumps(payload),
        created_at=db._now(),
    )

    def _p(p: float):
        db.update_job(job_id, progress=round(p, 4))
        cb = _progress.get(job_id)
        if cb:
            try:
                cb(p)
            except Exception:
                pass

    def _run():
        db.update_job(job_id, status="running")
        try:
            func(_p)
            db.update_job(job_id, status="done", progress=1.0)
        except Exception as e:  # noqa: BLE001
            db.update_job(job_id, status="error", error=str(e))

    _executor.submit(_run)
    return job_id


def set_progress_callback(job_id: str, cb: Callable[[float], None]) -> None:
    _progress[job_id] = cb
