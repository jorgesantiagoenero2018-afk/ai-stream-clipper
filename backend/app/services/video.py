"""Video import helpers: probe, thumbnail, proxy, and audio extraction."""
from __future__ import annotations

import subprocess

from .ffmpeg import ffmpeg_path, probe


def is_supported(path: str) -> bool:
    try:
        probe(path)
        return True
    except Exception:
        return False


def make_thumbnail(src: str, out: str, at: float = 1.0) -> str:
    subprocess.run(
        [ffmpeg_path(), "-y", "-ss", str(at), "-i", src, "-frames:v", "1",
         "-vf", "scale=480:-2", out],
        capture_output=True, check=True,
    )
    return out


def make_proxy(src: str, out: str, width: int = 720) -> str:
    """Low-res H.264 proxy for smooth timeline scrubbing with long recordings."""
    subprocess.run(
        [ffmpeg_path(), "-y", "-i", src, "-vf", f"scale={width}:-2",
         "-c:v", "libx264", "-preset", "ultrafast", "-crf", "30",
         "-c:a", "aac", "-b:a", "96k", out],
        capture_output=True, check=True,
    )
    return out


def extract_audio(src: str, out: str) -> str:
    """Extract mono 16 kHz PCM WAV for transcription and energy analysis."""
    subprocess.run(
        [ffmpeg_path(), "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000",
         "-c:a", "pcm_s16le", out],
        capture_output=True, check=True,
    )
    return out
