"""Optional AI text generation (titles, descriptions, hashtags) via Ollama.

Gracefully falls back when Ollama is not running or not installed. This is
used only for clip metadata enhancement and never auto-publishes anything.
"""
from __future__ import annotations

import json
from typing import Any


def _ollama_available(url: str) -> bool:
    try:
        import urllib.request
        req = urllib.request.Request(f"{url}/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=2) as resp:
            return resp.status == 200
    except Exception:
        return False


def _generate(url: str, model: str, prompt: str) -> str | None:
    try:
        import urllib.request
        payload = json.dumps({
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.7},
        }).encode("utf-8")
        req = urllib.request.Request(
            f"{url}/api/generate", data=payload,
            headers={"Content-Type": "application/json"}, method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data.get("response")
    except Exception:
        return None


def clip_metadata(url: str, model: str, transcript: str) -> dict[str, Any]:
    """Generate a catchy title, description, and hashtags for a clip.

    Returns empty values if Ollama is unavailable rather than failing.
    """
    if not transcript or not _ollama_available(url):
        return {"title": "", "description": "", "hashtags": []}

    prompt = (
        "You are a social media clip editor. Given this short transcript, "
        "produce a catchy title (max 8 words), a one-sentence description, "
        "and 5 relevant hashtags. Respond as JSON only with keys title, "
        "description, hashtags (array of strings, without #).\n\n"
        f"Transcript:\n{transcript}"
    )
    raw = _generate(url, model, prompt)
    if not raw:
        return {"title": "", "description": "", "hashtags": []}
    try:
        # strip any markdown fences
        txt = raw.strip().strip("`")
        if txt.startswith("json"):
            txt = txt[4:]
        data = json.loads(txt)
        return {
            "title": str(data.get("title", "")).strip(),
            "description": str(data.get("description", "")).strip(),
            "hashtags": [str(h).replace("#", "").strip() for h in data.get("hashtags", [])],
        }
    except Exception:
        return {"title": "", "description": "", "hashtags": []}
