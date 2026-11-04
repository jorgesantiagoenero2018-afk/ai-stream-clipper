"""Application configuration with on-disk JSON persistence.

No external config service is required; settings live in a JSON file under
the user's home directory (``~/.ai-stream-clipper/config.json``).
"""
from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel, Field

APP_DIR = Path.home() / ".ai-stream-clipper"
CONFIG_PATH = APP_DIR / "config.json"
DEFAULT_MEDIA = APP_DIR / "media"
DEFAULT_EXPORT = APP_DIR / "exports"


class Settings(BaseModel):
    """User-configurable application settings."""

    media_dir: str = str(DEFAULT_MEDIA)
    export_dir: str = str(DEFAULT_EXPORT)
    db_path: str = str(APP_DIR / "clipper.db")

    # FFmpeg
    ffmpeg_path: str = "ffmpeg"
    ffprobe_path: str = "ffprobe"
    hw_accel: str = "auto"  # auto | nvenc | qsv | amd | none

    # AI
    whisper_model: str = "base"        # tiny/base/small/medium/large-v3
    whisper_device: str = "auto"       # auto/cpu/cuda
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    # Languages
    languages: list[str] = Field(default_factory=lambda: ["en", "es"])

    # Clipping defaults
    default_aspect: str = "9:16"
    default_quality: str = "1080p"
    auto_clip_duration: float = 30.0
    min_score: float = 55.0
    context_before: float = 3.0
    context_after: float = 4.0

    # Export
    default_codec: str = "h264"
    default_fps: int = 30
    default_bitrate: str = "8M"

    # Subtitles
    burn_captions: bool = True
    caption_font: str = "Arial"
    caption_size: int = 18


def load_settings() -> Settings:
    """Load settings from disk, falling back to defaults on any error."""
    if CONFIG_PATH.exists():
        try:
            data = json.loads(CONFIG_PATH.read_text("utf-8"))
            return Settings(**data)
        except Exception:
            # Corrupt config -> fall back to defaults but keep the file for diagnostics
            return Settings()
    return Settings()


def save_settings(s: Settings) -> None:
    APP_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(s.model_dump(), indent=2), "utf-8")
