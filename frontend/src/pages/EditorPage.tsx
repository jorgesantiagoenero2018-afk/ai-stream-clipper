import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Play,
  Pause,
  SkipBack,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Type,
  Download,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { api, mediaUrl } from "@/lib/api";
import { watchJob } from "@/lib/ws";
import { fmtTimestamp, aspectLabel } from "@/lib/utils";
import { JobProgress } from "@/components/JobProgress";

export function EditorPage({ onRefresh }: { onRefresh: () => void }) {
  const { clipId } = useParams();
  const clips = useAppStore((s) => s.clips);
  const media = useAppStore((s) => s.media);
  const setJobProgress = useAppStore((s) => s.setJobProgress);

  const clip = clipId ? clips.find((c) => c.id === clipId) : undefined;
  const src = media.find((m) => m.id === clip?.media_id);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(clip?.start ?? 0);
  const [start, setStart] = useState(clip?.start ?? 0);
  const [end, setEnd] = useState(clip?.end ?? 0);
  const [aspect, setAspect] = useState("9:16");
  const [captions, setCaptions] = useState(true);
  const [exporting, setExporting] = useState(false);

  const duration = (src?.duration ?? 0);
  const mediaSrc = src ? `/media/${src.path.replace(/\\/g, "/").split("/").pop()}` : "";

  useEffect(() => {
    if (clip) {
      setStart(clip.start);
      setEnd(clip.end);
      setCurrentTime(clip.start);
    }
  }, [clipId]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          v.currentTime = Math.max(0, v.currentTime - 1 / 30);
          break;
        case "ArrowRight":
          v.currentTime += 1 / 30;
          break;
        case "i":
          setStart(v.currentTime);
          break;
        case "o":
          setEnd(v.currentTime);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  async function createClip() {
    if (!src) return;
    const payload = {
      media_id: src.id,
      start,
      end,
      project_id: "inbox",
    };
    await api.post("/api/clips/manual", payload);
    onRefresh();
  }

  async function exportClip() {
    if (!clip) return;
    setExporting(true);
    try {
      const data = await api.post<{ job_id: string }>("/api/export", {
        clip_ids: [clip.id],
        aspect,
        burn_captions: captions,
      });
      setJobProgress(data.job_id, { status: "queued", progress: 0 });
      watchJob(data.job_id);
    } finally {
      setExporting(false);
    }
  }

  function seek(t: number) {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(duration, t));
    v.currentTime = clamped;
    setCurrentTime(clamped);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Manual Editor</h1>
          <p className="text-sm text-muted-foreground">
            {clip ? `Editing clip ${fmtTimestamp(start)} → ${fmtTimestamp(end)}` : "Select or create a clip to edit"}
          </p>
        </div>
        <div className="flex gap-2">
          {clip && (
            <button className="btn-primary" onClick={exportClip} disabled={exporting}>
              <Download className="h-4 w-4" />
              Export
            </button>
          )}
        </div>
      </div>

      {!src ? (
        <div className="card flex flex-col items-center justify-center p-12 text-muted-foreground">
          <Scissors className="h-8 w-8" />
          <p className="mt-3 text-sm">Import a video or select a clip to begin editing.</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden p-0">
            <video
              ref={videoRef}
              src={mediaSrc}
              className="max-h-[480px] w-full bg-black object-contain"
              controls={false}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
          </div>

          {/* Transport controls */}
          <div className="card flex items-center gap-3 p-4">
            <button className="btn-secondary px-3" onClick={() => seek(start)}>
              <SkipBack className="h-4 w-4" />
            </button>
            <button className="btn-secondary px-3" onClick={() => seek(currentTime - 1 / 30)}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="btn-primary px-4" onClick={togglePlay}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button className="btn-secondary px-3" onClick={() => seek(currentTime + 1 / 30)}>
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="ml-2 text-sm tabular-nums text-muted-foreground">
              {fmtTimestamp(currentTime)} / {fmtTimestamp(duration)}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button className="btn-secondary" onClick={() => setStart(currentTime)}>
                Set In (I)
              </button>
              <button className="btn-secondary" onClick={() => setEnd(currentTime)}>
                Set Out (O)
              </button>
              <button className="btn-secondary" onClick={createClip}>
                <Scissors className="h-4 w-4" /> Save Clip
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="card p-4">
            <div className="relative h-14 w-full overflow-hidden rounded bg-muted/30">
              {/* full width bar */}
              <div className="absolute inset-y-0 left-0 w-full bg-muted/40" />
              {/* selection window */}
              <div
                className="absolute inset-y-0 bg-primary/25"
                style={{
                  left: `${(start / duration) * 100}%`,
                  width: `${((end - start) / duration) * 100}%`,
                }}
              />
              {/* playhead */}
              <div
                className="absolute inset-y-0 w-0.5 bg-white"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration}
                step={0.01}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4">
              <label className="mb-1 block text-sm text-muted-foreground">Aspect ratio</label>
              <select className="input w-full" value={aspect} onChange={(e) => setAspect(e.target.value)}>
                {["9:16", "16:9", "1:1", "4:5"].map((a) => (
                  <option key={a} value={a}>{aspectLabel(a)}</option>
                ))}
              </select>
            </div>
            <div className="card p-4">
              <label className="mb-1 block text-sm text-muted-foreground">Captions</label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={captions}
                  onChange={(e) => setCaptions(e.target.checked)}
                />
                Burn captions on export
              </label>
            </div>
            <div className="card p-4">
              <label className="mb-1 block text-sm text-muted-foreground">Editing</label>
              <p className="text-xs text-muted-foreground">
                Shortcuts: Space (play), ←/→ (frame), I/O (in/out)
              </p>
            </div>
          </div>

          {exporting && (
            <div className="card p-4">
              <JobProgress jobId={Object.keys(useAppStore.getState().jobs).at(-1) ?? ""} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
