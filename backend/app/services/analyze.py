"""Moment detection: combine transcript emphasis + audio energy + scene changes
into scored candidate clips (0-100)."""
from __future__ import annotations

from typing import Any

EXCITED_PHRASES = [
    "let's go", "lets go", "no way", "oh my god", "oh my", "holy",
    "what the", "letss go", "insane", "clutch", "wiped", "squad wipe",
    "vamos", "no manches", "dios", "ganamos", "no way",
]


def transcript_signals(segments: list[dict]) -> list[dict]:
    """Score each transcript segment on how 'exciting' it sounds."""
    signals = []
    for seg in segments:
        t = (seg.get("text") or "").lower()
        s = 0.0
        for phrase in EXCITED_PHRASES:
            if phrase in t:
                s += 15.0
        if "!" in t:
            s += 5.0
        if len(t) > 50:
            s += 3.0
        if s > 0:
            signals.append({
                "start": seg["start"],
                "end": seg["end"],
                "transcript_signal": s,
                "text": t,
            })
    return signals


def _rms_energy(wav_path: str) -> list[dict]:
    """Compute short-window RMS energy to find loud moments (z-scores)."""
    try:
        import numpy as np
        from scipy.io import wavfile
    except ImportError:
        return []
    try:
        sr, data = wavfile.read(wav_path)
    except Exception:
        return []
    if data.ndim > 1:
        data = data.mean(axis=1)
    data = data.astype(np.float32) / 32768.0
    win = max(1, int(sr * 0.5))
    energies = []
    for i in range(0, len(data) - win, win):
        chunk = data[i:i + win]
        rms = float(np.sqrt(np.mean(chunk ** 2)))
        energies.append({"start": i / sr, "end": (i + win) / sr, "rms": rms})
    if not energies:
        return []
    rms_vals = np.array([e["rms"] for e in energies])
    mean, std = rms_vals.mean(), rms_vals.std() or 1e-6
    for e in energies:
        e["z"] = float((e["rms"] - mean) / std)
    return energies


def scene_changes(video_path: str) -> list[float]:
    """Optional scene-change detection via PySceneDetect. Returns timestamps."""
    try:
        from scenedetect import ContentDetector, detect
    except ImportError:
        return []
    try:
        scenes = detect(video_path, ContentDetector(threshold=30.0))
    except Exception:
        return []
    return [float(s[0].get_seconds()) for s in scenes if s[0].get_seconds() > 0]


def detect_moments(video_path: str, audio_path: str, segments: list[dict],
                   min_score: float = 55.0, clip_duration: float = 30.0,
                   context_before: float = 3.0, context_after: float = 4.0) -> list[dict[str, Any]]:
    """Combine signals and return scored candidate clips."""
    sig_speech = transcript_signals(segments)
    sig_audio = _rms_energy(audio_path)
    cuts = scene_changes(video_path)

    candidates: dict[int, dict] = {}

    for s in sig_speech:
        t = (s["start"] + s["end"]) / 2
        candidates.setdefault(round(t), {"t": t, "score": 0.0, "reasons": []})
        c = candidates[round(t)]
        c["score"] += s["transcript_signal"]
        c["reasons"].append(f"speech: {s['text'][:60]}")

    for e in sig_audio:
        if e.get("z", 0) > 1.5:
            t = (e["start"] + e["end"]) / 2
            candidates.setdefault(round(t), {"t": t, "score": 0.0, "reasons": []})
            candidates[round(t)]["score"] += 8.0 * min(e["z"], 4)
            candidates[round(t)]["reasons"].append("audio spike")

    for cut in cuts:
        candidates.setdefault(round(cut), {"t": cut, "score": 0.0, "reasons": []})
        candidates[round(cut)]["score"] += 6.0
        candidates[round(cut)]["reasons"].append("scene change")

    clips: list[dict[str, Any]] = []
    seen: list[tuple[float, float]] = []
    for cand in sorted(candidates.values(), key=lambda c: c["t"]):
        score = min(100.0, cand["score"])
        if score < min_score:
            continue
        start = max(0.0, cand["t"] - context_before)
        end = start + clip_duration
        if any(max(start, a) < min(end, b) for a, b in seen):
            continue
        seen.append((start, end))
        clips.append({
            "start": round(start, 2),
            "end": round(end, 2),
            "score": round(score, 1),
            "event": "; ".join(cand["reasons"][:3]),
        })
    return clips
