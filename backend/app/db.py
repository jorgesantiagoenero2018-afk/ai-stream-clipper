"""Minimal SQLite layer using the stdlib with a single writer guarded by a lock."""
from __future__ import annotations

import sqlite3
import threading
import uuid
from pathlib import Path
from typing import Any

_LOCK = threading.Lock()
_CONN: sqlite3.Connection | None = None
_DB_PATH: str = ""

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    duration REAL,
    width INTEGER,
    height INTEGER,
    fps REAL,
    size_bytes INTEGER,
    thumbnail TEXT,
    proxy TEXT,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS clips (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    media_id TEXT NOT NULL,
    start REAL NOT NULL,
    end REAL NOT NULL,
    duration REAL NOT NULL,
    score REAL DEFAULT 0,
    event TEXT,
    transcript TEXT,
    status TEXT DEFAULT 'suggested',
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    progress REAL DEFAULT 0,
    error TEXT,
    payload TEXT,
    created_at TEXT NOT NULL
);
"""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db(db_path: str) -> None:
    global _CONN, _DB_PATH
    _DB_PATH = db_path
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    _CONN = _connect()
    _CONN.executescript(SCHEMA)
    _CONN.commit()


def _now() -> str:
    import datetime
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def insert(table: str, **values: Any) -> str:
    row_id = values.get("id") or str(uuid.uuid4())
    values["id"] = row_id
    cols = ", ".join(values.keys())
    marks = ", ".join("?" for _ in values)
    with _LOCK:
        _CONN.execute(f"INSERT INTO {table} ({cols}) VALUES ({marks})", list(values.values()))
        _CONN.commit()
    return row_id


def query(sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    with _LOCK:
        cur = _CONN.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def execute(sql: str, params: tuple = ()) -> int:
    with _LOCK:
        cur = _CONN.execute(sql, params)
        _CONN.commit()
        return cur.rowcount


def update_job(job_id: str, **fields: Any) -> None:
    cols = ", ".join(f"{k}=?" for k in fields)
    execute(f"UPDATE jobs SET {cols} WHERE id=?", (*fields.values(), job_id))
