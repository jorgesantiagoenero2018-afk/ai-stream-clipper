"""Clip export via FFmpeg with chosen encoder, aspect ratio, and caption burn-in."""
from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Callable

from ..config import load_settings
from .ffmpeg import ffmpeg_path, pick_encoder, pick_encoder_265
from .reframe import crop_filter

QUALITY_MAP = {
    "720p":  {"bitrate": "5M"},
    "1080p": {"bitrate": "8M"},
    "1440p": {"bitrate": "16M"},
    "4k":    {"bitrate": "35M"},
}

FPS_TO_GOP = 2  # keyframe interval = 2 * fps


def _parse_progress(line: str, duration: float) -> float | None:
    """Extract a 0..1 progress value from an ffmpeg stderr line."""
    if "time=" not in line:
        return None
    try:
        t = line.split("time=")[1].split()[0]
        h, m, s = t.split(":")
        elapsed = float(h) * 3600 + float(m) * 60 + float(s)
        if duration <= 0:
            return None
        return min(0.99, elapsed / duration)
    except Exception:
        return None


def _base_command(src: str, start: float, end: float, encoder: str,
                  bitrate: str, fps: int | None, extra: list[str] | None = None) -> list[str]:
    cmd = [ffmpeg_path(), "-y", "-ss", str(start), "-i", src, "-t", str(end - start)]
    if fps:
        cmd += ["-r", str(fps)]
    cmd += ["-c:v", encoder, "-preset", "fast", "-b:v", bitrate]
    cmd += ["-g", str((fps or 30) * FPS_TO_GOP), "-c:a", "aac", "-b:a", "192k"]
    cmd += ["-movflags", "+faststart"]
    if extra:
        cmd += extra
    return cmd


def export_clip(src: str, out: str, start: float, end: float, aspect: str,
                quality: str, codec: str, burn_captions: bool,
                subtitles_path: str | None, video_w: int = 1920,
                video_h: int = 1080, fps: int | None = None,
                prog_cb: Callable[[float], None] | None = None) -> str:
    """Export a single clip. Returns the output path."""
    cfg = load_settings()
    q = QUALITY_MAP.get(quality, QUALITY_MAP["1080p"])
    encoder = pick_encoder(cfg.hw_accel) if codec in ("h264", "h265") else "libx264"
    if codec == "h265":
        encoder = pick_encoder_265(cfg.hw_accel)

    duration = end - start
    vf = crop_filter(video_w, video_h, aspect)
    if burn_captions and subtitles_path and Path(subtitles_path).exists():
        sub = str(Path(subtitles_path).resolve()).replace(":", r"\:").replace("\\", "/")
        # escape quotes and special chars for the subtitles filter
        vf += f",subtitles='{sub}'"

    cmd = _base_command(src, start, end, encoder, q["bitrate"], fps, ["-vf", vf])
    proc = subprocess.Popen(cmd, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace")
    if prog_cb:
        for line in proc.stderr:
            p = _parse_progress(line, duration)
            if p is not None:
                prog_cb(p)
    proc.wait()
    if proc.returncode != 0:
        raise RuntimeError("Export failed (FFmpeg returned non-zero)")
    if prog_cb:
        prog_cb(1.0)
    return out


def export_with_layout(src: str, facecam: str | None, out: str, start: float,
                       end: float, aspect: str, layout: str, quality: str,
                       codec: str, prog_cb: Callable[[float], None] | None = None) -> str:
    """Export with a facecam/layout filter graph (two inputs)."""
    cfg = load_settings()
    q = QUALITY_MAP.get(quality, QUALITY_MAP["1080p"])
    encoder = pick_encoder(cfg.hw_accel) if codec in ("h264", "h265") else "libx264"

    from .reframe import layout_filter
    duration = end - start
    if facecam:
        cmd = [ffmpeg_path(), "-y", "-ss", str(start), "-i", src,
               "-ss", str(start), "-i", facecam, "-t", str(duration)]
        cmd += ["-filter_complex", layout_filter(layout, 1920, 1080)]
    else:
        cmd = [ffmpeg_path(), "-y", "-ss", str(start), "-i", src, "-t", str(duration)]
        cmd += ["-vf", crop_filter(1920, 1080, aspect)]
    cmd += ["-map", "0:a?", "-c:v", encoder, "-preset", "fast", "-b:v", q["bitrate"],
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]

    proc = subprocess.Popen(cmd, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace")
    if prog_cb:
        for line in proc.stderr:
            p = _parse_progress(line, duration)
            if p is not None:
                prog_cb(p)
    proc.wait()
    if proc.returncode != 0:
        raise RuntimeError("Export failed (FFmpeg returned non-zero)")
    if prog_cb:
        prog_cb(1.0)
    return out
