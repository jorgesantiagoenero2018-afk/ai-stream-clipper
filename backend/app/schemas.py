"""Pydantic models for API requests and responses."""
from __future__ import annotations

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str


class AnalyzeRequest(BaseModel):
    media_id: str
    min_score: float = 55.0
    clip_duration: float = 30.0
    languages: list[str] = ["en", "es"]


class ExportRequest(BaseModel):
    clip_ids: list[str]
    aspect: str = "9:16"
    quality: str = "1080p"
    codec: str = "h264"
    burn_captions: bool = True
    layout: str = "fullscreen"  # fullscreen | facecam-top | facecam-bottom | split


class ReframeRequest(BaseModel):
    media_id: str
    aspect: str = "9:16"
    layout: str = "fullscreen"
    focus_x: float = 0.5
    focus_y: float = 0.5


class CaptionRequest(BaseModel):
    media_id: str
    language: str | None = None
    style: str = "classic"  # classic | karaoke | gaming
