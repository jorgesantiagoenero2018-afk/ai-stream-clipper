"""FastAPI application: REST API + WebSocket progress + static media serving."""
from __future__ import annotations

import json
import shutil
import uuid
from pathlib import Path
from typing import Any

import aiofiles
from fastapi import (FastAPI, File, HTTPException, UploadFile, WebSocket,
                     WebSocketDisconnect)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import db
from .config import Settings, load_settings, save_settings
from .jobs import set_progress_callback, start_job
from .schemas import (AnalyzeRequest, CaptionRequest, ExportRequest,
                      ProjectCreate, ReframeRequest)
from .services import ai_text, analyze, captions, exporter, ffmpeg, reframe, transcribe, video

SETTINGS = load_settings()

app = FastAPI(title="AI Stream Clipper")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    db.init_db(SETTINGS.db_path)
    Path(SETTINGS.media_dir).mkdir(parents=True, exist_ok=True)
    Path(SETTINGS.export_dir).mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=SETTINGS.media_dir), name="media")
    app.mount("/exports", StaticFiles(directory=SETTINGS.export_dir), name="exports")


# ---------- Settings ----------
@app.get("/api/settings")
def get_settings():
    return SETTINGS.model_dump()


@app.put("/api/settings")
def put_settings(payload: dict[str, Any]):
    global SETTINGS
    SETTINGS = Settings(**{**SETTINGS.model_dump(), **payload})
    save_settings(SETTINGS)
    return SETTINGS.model_dump()


@app.get("/api/diagnostics")
def diagnostics():
    return {
        "ffmpeg": shutil.which(SETTINGS.ffmpeg_path) is not None or _bin_exists(SETTINGS.ffmpeg_path),
        "ffprobe": shutil.which(SETTINGS.ffprobe_path) is not None or _bin_exists(SETTINGS.ffprobe_path),
        "encoders": ffmpeg.detect_encoders(),
        "whisper": _whisper_available(),
        "ollama": _ollama_available(SETTINGS.ollama_url),
        "media_dir": SETTINGS.media_dir,
        "export_dir": SETTINGS.export_dir,
    }


def _bin_exists(path: str) -> bool:
    return bool(path) and Path(path).exists()


def _whisper_available() -> bool:
    try:
        import faster_whisper  # noqa: F401
        return True
    except ImportError:
        return False


def _ollama_available(url: str) -> bool:
    try:
        from .services.ai_text import _ollama_available
        return _ollama_available(url)
    except Exception:
        return False


# ---------- Projects ----------
@app.get("/api/projects")
def list_projects():
    return db.query("SELECT * FROM projects ORDER BY updated_at DESC")


@app.post("/api/projects")
def create_project(body: ProjectCreate):
    now = db._now()
    pid = db.insert("projects", name=body.name, created_at=now, updated_at=now)
    return db.query("SELECT * FROM projects WHERE id=?", (pid,))[0]


@app.put("/api/projects/{pid}")
def rename_project(pid: str, body: ProjectCreate):
    db.execute("UPDATE projects SET name=?, updated_at=? WHERE id=?",
               (body.name, db._now(), pid))
    return db.query("SELECT * FROM projects WHERE id=?", (pid,))[0]


@app.delete("/api/projects/{pid}")
def delete_project(pid: str):
    db.execute("DELETE FROM clips WHERE project_id=?", (pid,))
    db.execute("DELETE FROM projects WHERE id=?", (pid,))
    return {"ok": True}


# ---------- Media import ----------
SUPPORTED_EXT = {".mp4", ".mov", ".mkv", ".webm", ".avi", ".ts", ".m4v", ".flv"}


@app.post("/api/import")
async def import_video(file: UploadFile = File(...), project_id: str = "inbox"):
    ext = Path(file.filename or "upload.mp4").suffix.lower()
    if ext not in SUPPORTED_EXT:
        raise HTTPException(400, f"Unsupported extension: {ext}")

    media_id = str(uuid.uuid4())
    dest = Path(SETTINGS.media_dir) / f"{media_id}{ext}"
    async with aiofiles.open(dest, "wb") as out:
        while chunk := await file.read(1024 * 1024):
            await out.write(chunk)

    db.insert(
        "media",
        id=media_id,
        project_id=project_id,
        filename=file.filename or dest.name,
        path=str(dest),
        created_at=db._now(),
    )

    def _probe(prog) -> dict[str, Any]:
        prog(0.1)
        info = ffmpeg.probe(str(dest))
        thumb = str(dest.with_suffix(".jpg"))
        try:
            video.make_thumbnail(str(dest), thumb)
        except Exception:
            thumb = ""
        db.execute(
            "UPDATE media SET duration=?, width=?, height=?, fps=?, size_bytes=?, thumbnail=? WHERE id=?",
            (info.get("duration"), info.get("width"), info.get("height"),
             info.get("fps"), info.get("size_bytes"), thumb, media_id),
        )
        prog(1.0)
        return info

    job_id = start_job("probe", _probe, {"media_id": media_id})
    return {"media_id": media_id, "job_id": job_id, "path": str(dest)}


@app.get("/api/media")
def list_media(project_id: str | None = None):
    if project_id and project_id != "inbox":
        return db.query("SELECT * FROM media WHERE project_id=? ORDER BY created_at DESC", (project_id,))
    return db.query("SELECT * FROM media ORDER BY created_at DESC")


@app.get("/api/media/{mid}")
def get_media(mid: str):
    rows = db.query("SELECT * FROM media WHERE id=?", (mid,))
    if not rows:
        raise HTTPException(404, "Media not found")
    return rows[0]


@app.delete("/api/media/{mid}")
def delete_media(mid: str):
    rows = db.query("SELECT * FROM media WHERE id=?", (mid,))
    if rows:
        try:
            Path(rows[0]["path"]).unlink(missing_ok=True)
        except Exception:
            pass
    db.execute("DELETE FROM media WHERE id=?", (mid,))
    return {"ok": True}


# ---------- Analysis (AI clipping) ----------
@app.post("/api/analyze")
def analyze_video(req: AnalyzeRequest):
    rows = db.query("SELECT * FROM media WHERE id=?", (req.media_id,))
    if not rows:
        raise HTTPException(404, "Media not found")
    m = rows[0]

    def _run(prog) -> list[dict[str, Any]]:
        audio = str(Path(m["path"]).with_suffix(".wav"))
        video.extract_audio(m["path"], audio)
        prog(0.15)
        segs = transcribe.transcribe(audio, SETTINGS.whisper_model, SETTINGS.whisper_device)
        prog(0.55)
        moments = analyze.detect_moments(
            m["path"], audio, segs,
            min_score=req.min_score, clip_duration=req.clip_duration,
            context_before=SETTINGS.context_before, context_after=SETTINGS.context_after,
        )
        prog(0.9)
        project_id = m["project_id"] or "inbox"
        for mo in moments:
            db.insert(
                "clips", project_id=project_id, media_id=m["id"],
                start=mo["start"], end=mo["end"], duration=mo["end"] - mo["start"],
                score=mo["score"], event=mo["event"], created_at=db._now(),
            )
        prog(1.0)
        return moments

    job_id = start_job("analyze", _run, {"media_id": req.media_id})
    return {"job_id": job_id}


@app.get("/api/clips")
def list_clips(project_id: str | None = None):
    if project_id:
        return db.query("SELECT * FROM clips WHERE project_id=? ORDER BY score DESC", (project_id,))
    return db.query("SELECT * FROM clips ORDER BY score DESC")


@app.post("/api/clips/{cid}/status")
def set_clip_status(cid: str, payload: dict[str, Any]):
    status = payload.get("status", "suggested")
    db.execute("UPDATE clips SET status=? WHERE id=?", (status, cid))
    return {"ok": True}


@app.delete("/api/clips/{cid}")
def delete_clip(cid: str):
    db.execute("DELETE FROM clips WHERE id=?", (cid,))
    return {"ok": True}


# ---------- Manual clip ----------
@app.post("/api/clips/manual")
def create_manual_clip(payload: dict[str, Any]):
    media_id = payload["media_id"]
    start = float(payload["start"])
    end = float(payload["end"])
    project_id = payload.get("project_id", "inbox")
    cid = db.insert(
        "clips", project_id=project_id, media_id=media_id,
        start=start, end=end, duration=end - start, score=0.0,
        status="suggested", created_at=db._now(),
    )
    return db.query("SELECT * FROM clips WHERE id=?", (cid,))[0]


# ---------- Captions ----------
@app.post("/api/captions")
def generate_captions(req: CaptionRequest):
    rows = db.query("SELECT * FROM media WHERE id=?", (req.media_id,))
    if not rows:
        raise HTTPException(404, "Media not found")
    m = rows[0]
    audio = str(Path(m["path"]).with_suffix(".wav"))
    if not Path(audio).exists():
        video.extract_audio(m["path"], audio)
    segs = transcribe.transcribe(audio, SETTINGS.whisper_model, SETTINGS.whisper_device,
                                 language=req.language)
    srt = captions.segments_to_srt(segs)
    srt_path = Path(m["path"]).with_suffix(".srt")
    srt_path.write_text(srt, "utf-8")
    return {"srt_path": str(srt_path), "segments": segs, "style": req.style}


# ---------- Reframe (vertical conversion) ----------
@app.post("/api/reframe")
def reframe_video(req: ReframeRequest):
    rows = db.query("SELECT * FROM media WHERE id=?", (req.media_id,))
    if not rows:
        raise HTTPException(404, "Media not found")
    m = rows[0]
    w = m["width"] or 1920
    h = m["height"] or 1080
    vf = reframe.crop_filter(w, h, req.aspect, req.focus_x, req.focus_y)
    return {"filter": vf, "layout": req.layout, "aspect": req.aspect}


# ---------- AI text ----------
@app.post("/api/ai-text")
def generate_ai_text(payload: dict[str, Any]):
    transcript = payload.get("transcript", "")
    return ai_text.clip_metadata(SETTINGS.ollama_url, SETTINGS.ollama_model, transcript)


# ---------- Export ----------
@app.post("/api/export")
def export_clips(req: ExportRequest):
    if not req.clip_ids:
        raise HTTPException(404, "No clips selected")
    placeholders = ",".join("?" for _ in req.clip_ids)
    clips = db.query(
        f"SELECT * FROM clips WHERE id IN ({placeholders})", tuple(req.clip_ids)
    )
    if not clips:
        raise HTTPException(404, "No clips found")

    def _run(prog) -> dict[str, Any]:
        total = len(clips)
        for i, c in enumerate(clips):
            media_rows = db.query("SELECT * FROM media WHERE id=?", (c["media_id"],))
            if not media_rows:
                continue
            media = media_rows[0]
            out = Path(SETTINGS.export_dir) / f"clip_{c['id']}.mp4"
            srt = Path(media["path"]).with_suffix(".srt")
            subtitles = str(srt) if (req.burn_captions and srt.exists()) else None

            def _cb(p, i=i, total=total):
                prog((i + p) / total)

            exporter.export_clip(
                media["path"], str(out), c["start"], c["end"],
                req.aspect, req.quality, req.codec, req.burn_captions,
                subtitles, media.get("width") or 1920, media.get("height") or 1080,
                fps=None, prog_cb=_cb,
            )
            db.execute("UPDATE clips SET status='exported' WHERE id=?", (c["id"],))
        prog(1.0)
        return {"count": total}

    job_id = start_job("export", _run, {"clip_ids": req.clip_ids})
    return {"job_id": job_id}


# ---------- Jobs ----------
@app.get("/api/jobs")
def list_jobs():
    return db.query("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100")


@app.get("/api/jobs/{jid}")
def get_job(jid: str):
    rows = db.query("SELECT * FROM jobs WHERE id=?", (jid,))
    if not rows:
        raise HTTPException(404, "Job not found")
    return rows[0]


# ---------- WebSocket progress ----------
@app.websocket("/ws/progress")
async def ws_progress(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            msg = await ws.receive_text()
            data = json.loads(msg)
            job_id = str(data.get("job_id", ""))
            if job_id:
                def _cb(p: float, jid: str = job_id):
                    import asyncio
                    asyncio.get_event_loop().create_task(
                        ws.send_text(json.dumps({"job_id": jid, "progress": p}))
                    )
                set_progress_callback(job_id, _cb)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
