"""Automatic reframing: aspect-ratio conversion and facecam layout presets."""
from __future__ import annotations

from typing import Any


# target dims per aspect ratio (width x height)
ASPECT_DIMS = {
    "16:9": (1920, 1080),
    "9:16": (1080, 1920),
    "1:1":  (1080, 1080),
    "4:5":  (1080, 1350),
}


def crop_filter(video_w: int, video_h: int, aspect: str,
                focus_x: float = 0.5, focus_y: float = 0.5) -> str:
    """Return an FFmpeg -vf crop/scale filter for the target aspect ratio.

    Crops the source around (focus_x, focus_y) which are normalized 0..1.
    """
    tw, th = ASPECT_DIMS.get(aspect, ASPECT_DIMS["9:16"])
    target_ratio = tw / th
    src_ratio = video_w / video_h

    if src_ratio > target_ratio:
        # source is wider -> crop width
        new_w = int(video_h * target_ratio)
        new_w -= new_w % 2
        x = int((video_w - new_w) * focus_x)
        x = max(0, min(x, video_w - new_w))
        return f"crop={new_w}:{video_h}:{x}:0,scale={tw}:{th}"
    else:
        # source is taller -> crop height
        new_h = int(video_w / target_ratio)
        new_h -= new_h % 2
        y = int((video_h - new_h) * focus_y)
        y = max(0, min(y, video_h - new_h))
        return f"crop={video_w}:{new_h}:0:{y},scale={tw}:{th}"


def layout_filter(layout: str, main_w: int, main_h: int,
                  face_w: int = 320, face_h: int = 320) -> str:
    """Return an FFmpeg filter graph for combining gameplay + facecam layers.

    Layouts:
      - fullscreen: gameplay only
      - facecam-top / facecam-bottom: pip overlay
      - split: facecam stacked above/below gameplay
    """
    sw, sh = ASPECT_DIMS["9:16"]  # assume vertical target for pip/split
    if layout == "fullscreen":
        return "null"
    if layout == "facecam-top":
        # scale main to full, overlay facecam (second input) top-center
        return (
            f"[0:v]scale={sw}:{sh}[main];"
            f"[1:v]scale={face_w}:{face_h}[face];"
            f"[main][face]overlay=(W-w)/2:20"
        )
    if layout == "facecam-bottom":
        return (
            f"[0:v]scale={sw}:{sh}[main];"
            f"[1:v]scale={face_w}:{face_h}[face];"
            f"[main][face]overlay=(W-w)/2:(H-h-20)"
        )
    if layout == "split":
        # gameplay on top, facecam below
        return (
            f"[0:v]scale={sw}:{int(sh * 0.7)}:force_original_aspect_ratio=decrease,"
            f"pad={sw}:{int(sh * 0.7)}:(ow-iw)/2:(oh-ih)/2[main];"
            f"[1:v]scale={sw}:{int(sh * 0.3)}:force_original_aspect_ratio=decrease,"
            f"pad={sw}:{int(sh * 0.3)}:(ow-iw)/2:(oh-ih)/2[face];"
            f"[main][face]vstack"
        )
    return "null"
