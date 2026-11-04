"""FFmpeg/ffprobe wrappers and hardware-acceleration detection."""
from __future__ import annotations

import json
import shutil
import subprocess
from typing import Any


class FFmpegError(RuntimeError):
    pass


def _run(cmd: list[str]) -> str:
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
    except FileNotFoundError as e:
        raise FFmpegError(
            "FFmpeg not found — install it or set ffmpeg_path in Settings."
        ) from e
    if out.returncode != 0:
        raise FFmpegError((out.stderr or out.stdout or "")[-2000:])
    return out.stdout or out.stderr or ""


def ffmpeg_path() -> str:
    from ..config import load_settings
    return load_settings().ffmpeg_path


def ffprobe_path() -> str:
    from ..config import load_settings
    return load_settings().ffprobe_path


def probe(path: str) -> dict[str, Any]:
    """Return normalized media metadata."""
    cmd = [
        ffprobe_path(), "-v", "error", "-print_format", "json",
        "-show_format", "-show_streams", path,
    ]
    raw = json.loads(_run(cmd))
    info: dict[str, Any] = {
        "streams": raw.get("streams", []),
        "format": raw.get("format", {}),
    }
    vstream = next((s for s in info["streams"] if s.get("codec_type") == "video"), None)
    astream = next((s for s in info["streams"] if s.get("codec_type") == "audio"), None)
    info["video"] = vstream
    info["audio"] = astream
    info["duration"] = float(info["format"].get("duration", 0) or 0)
    if vstream:
        info["width"] = vstream.get("width")
        info["height"] = vstream.get("height")
        num, den = (vstream.get("avg_frame_rate", "0/1") or "0/1").split("/")
        try:
            info["fps"] = float(num) / float(den) if float(den) else 0.0
        except (ValueError, ZeroDivisionError):
            info["fps"] = 0.0
    info["size_bytes"] = int(info["format"].get("size", 0) or 0)
    return info


def detect_encoders() -> dict[str, bool]:
    """Detect available hardware encoders."""
    if shutil.which(ffmpeg_path()) is None:
        return {"nvenc": False, "qsv": False, "amd": False}
    try:
        out = _run([ffmpeg_path(), "-hide_banner", "-encoders"])
    except FFmpegError:
        return {"nvenc": False, "qsv": False, "amd": False}
    return {
        "nvenc": "h264_nvenc" in out,
        "qsv": "h264_qsv" in out,
        "amd": "h264_amf" in out,
    }


def pick_encoder(settings_hw: str) -> str:
    """Return the H.264 encoder string for the chosen accelerator."""
    enc = detect_encoders()
    if settings_hw == "nvenc" and enc["nvenc"]:
        return "h264_nvenc"
    if settings_hw == "qsv" and enc["qsv"]:
        return "h264_qsv"
    if settings_hw == "amd" and enc["amd"]:
        return "h264_amf"
    if settings_hw == "auto":
        if enc["nvenc"]:
            return "h264_nvenc"
        if enc["qsv"]:
            return "h264_qsv"
        if enc["amd"]:
            return "h264_amf"
    return "libx264"


def pick_encoder_265(settings_hw: str) -> str:
    """Return an H.265/HEVC encoder string when available."""
    enc = detect_encoders()
    if settings_hw in ("nvenc", "auto") and enc["nvenc"]:
        return "hevc_nvenc"
    if settings_hw in ("qsv", "auto") and enc["qsv"]:
        return "hevc_qsv"
    if settings_hw in ("amd", "auto") and enc["amd"]:
        return "hevc_amf"
    return "libx265"
