"""Subtitle/caption generation: SRT export with word-level timestamps and
burn-in styling presets."""
from __future__ import annotations

from typing import Any


def _fmt_ts(seconds: float) -> str:
    """Format seconds as SRT timestamp ``HH:MM:SS,mmm``."""
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def segments_to_srt(segments: list[dict], max_chars: int = 42) -> str:
    """Convert transcript segments to SRT text. Splits long segments."""
    blocks: list[str] = []
    idx = 1
    for seg in segments:
        text = (seg.get("text") or "").strip()
        if not text:
            continue
        # split on sentence-ish boundaries if too long
        chunks = _split_text(text, max_chars)
        start = seg["start"]
        end = seg["end"]
        dur = max(0.001, end - start)
        for i, chunk in enumerate(chunks):
            c_start = start + dur * (i / len(chunks))
            c_end = start + dur * ((i + 1) / len(chunks))
            blocks.append(f"{idx}\n{_fmt_ts(c_start)} --> {_fmt_ts(c_end)}\n{chunk}\n")
            idx += 1
    return "\n".join(blocks)


def _split_text(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    words = text.split()
    chunks: list[str] = []
    cur = ""
    for w in words:
        if len(cur) + len(w) + 1 > max_chars and cur:
            chunks.append(cur)
            cur = w
        else:
            cur = (cur + " " + w) if cur else w
    if cur:
        chunks.append(cur)
    return chunks


def word_timestamps(segments: list[dict], start: float, end: float) -> list[dict]:
    """Return word-level (word, start, end) rows within [start, end)."""
    rows: list[dict] = []
    for seg in segments:
        for w in seg.get("words", []):
            if w["start"] >= start and w["end"] <= end:
                rows.append(w)
    return rows


def build_ass_style(style: str = "classic", font: str = "Arial",
                    size: int = 18, outline: int = 2) -> dict[str, Any]:
    """Return styling parameters for the chosen caption preset."""
    presets = {
        "classic": {"font": font, "size": size, "color": "&H00FFFFFF",
                    "outline": outline, "bold": 1},
        "gaming": {"font": font, "size": size + 6, "color": "&H0000FF00",
                   "outline": 3, "bold": 1},
        "karaoke": {"font": font, "size": size + 4, "color": "&H0000FFFF",
                    "outline": 2, "bold": 1},
    }
    return presets.get(style, presets["classic"])
