"""Speech-to-text using faster-whisper with word-level timestamps."""
from __future__ import annotations

from typing import Any

_MODEL = None
_MODEL_NAME = None


def _get_model(name: str, device: str):
    global _MODEL, _MODEL_NAME
    if _MODEL is not None and _MODEL_NAME == name:
        return _MODEL
    try:
        from faster_whisper import WhisperModel
    except ImportError as e:
        raise RuntimeError(
            "faster-whisper is not installed. Run: pip install faster-whisper"
        ) from e

    if device == "auto":
        try:
            _MODEL = WhisperModel(name, device="cuda", compute_type="float16")
            _MODEL_NAME = name
            return _MODEL
        except Exception:
            device = "cpu"

    _MODEL = WhisperModel(name, device=device, compute_type="int8")
    _MODEL_NAME = name
    return _MODEL


def transcribe(path: str, model_name: str = "base", device: str = "auto",
               language: str | None = None) -> list[dict[str, Any]]:
    """Return a list of segments with word-level timestamps.

    Each segment is a dict with keys: start, end, text, words (list of
    {word, start, end}).
    """
    model = _get_model(model_name, device)
    segments, _info = model.transcribe(path, language=language, word_timestamps=True)
    out: list[dict[str, Any]] = []
    for seg in segments:
        words = [
            {"word": w.word, "start": w.start, "end": w.end}
            for w in (seg.words or [])
        ]
        out.append({
            "start": seg.start,
            "end": seg.end,
            "text": (seg.text or "").strip(),
            "words": words,
        })
    return out
