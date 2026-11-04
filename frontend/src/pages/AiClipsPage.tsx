import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Check, X, ExternalLink } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { api, mediaUrl } from "@/lib/api";
import { watchJob } from "@/lib/ws";
import { fmtDuration } from "@/lib/utils";
import { JobProgress } from "@/components/JobProgress";

export function AiClipsPage({ onRefresh }: { onRefresh: () => void }) {
  const media = useAppStore((s) => s.media);
  const clips = useAppStore((s) => s.clips);
  const setJobProgress = useAppStore((s) => s.setJobProgress);
  const [selectedMedia, setSelectedMedia] = useState("");
  const [minScore, setMinScore] = useState(55);
  const [clipDuration, setClipDuration] = useState(30);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function runAnalysis() {
    if (!selectedMedia) {
      setError("Select a video first.");
      return;
    }
    setError("");
    setRunning(true);
    try {
      const data = await api.post<{ job_id: string }>("/api/analyze", {
        media_id: selectedMedia,
        min_score: minScore,
        clip_duration: clipDuration,
      });
      setJobProgress(data.job_id, { status: "queued", progress: 0 });
      watchJob(data.job_id);
      onRefresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await api.post(`/api/clips/${id}/status`, { status });
    onRefresh();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Clip Generator</h1>
        <p className="text-sm text-muted-foreground">
          Analyze a recording and auto-detect the best moments using audio, speech, and scene analysis.
        </p>
      </div>

      <div className="card p-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Video</label>
            <select
              className="input w-full"
              value={selectedMedia}
              onChange={(e) => setSelectedMedia(e.target.value)}
            >
              <option value="">Select a video…</option>
              {media.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.filename}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">
              Minimum score ({minScore})
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">
              Clip duration ({clipDuration}s)
            </label>
            <input
              type="range"
              min={10}
              max={90}
              value={clipDuration}
              onChange={(e) => setClipDuration(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <button className="btn-primary mt-4" onClick={runAnalysis} disabled={running || !selectedMedia}>
          <Sparkles className="h-4 w-4" />
          {running ? "Analyzing…" : "Generate AI Clips"}
        </button>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-medium">Suggested clips ({clips.length})</h2>
        {clips.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No clips yet. Select a video above and generate clips.
          </p>
        ) : (
          <div className="space-y-3">
            {clips.map((c) => {
              const src = media.find((m) => m.id === c.media_id);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-4 rounded-md border border-border p-3"
                >
                  <div className="h-16 w-28 shrink-0 overflow-hidden rounded bg-muted">
                    {src?.thumbnail ? (
                      <img src={mediaUrl(src.thumbnail)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-semibold text-primary">{c.score} pts</span>
                      <span className="text-muted-foreground">
                        {fmtDuration(c.start)} → {fmtDuration(c.end)} ({fmtDuration(c.duration)})
                      </span>
                      <span className="text-xs uppercase text-muted-foreground">
                        {c.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {c.event || "Detected moment"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      className="btn-ghost px-2"
                      title="Approve"
                      onClick={() => setStatus(c.id, "approved")}
                    >
                      <Check className="h-4 w-4 text-green-400" />
                    </button>
                    <button
                      className="btn-ghost px-2"
                      title="Reject"
                      onClick={() => setStatus(c.id, "rejected")}
                    >
                      <X className="h-4 w-4 text-red-400" />
                    </button>
                    <Link to={`/editor/${c.id}`} className="btn-secondary px-2">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
