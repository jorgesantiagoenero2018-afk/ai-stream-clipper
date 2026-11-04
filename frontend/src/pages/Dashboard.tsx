import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  Sparkles,
  Scissors,
  Clapperboard,
  HardDrive,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { api, mediaUrl, type Diagnostics } from "@/lib/api";
import { fmtBytes, fmtDuration } from "@/lib/utils";
import { JobProgress } from "@/components/JobProgress";

export function Dashboard({ onRefresh }: { onRefresh: () => void }) {
  const media = useAppStore((s) => s.media);
  const clips = useAppStore((s) => s.clips);
  const jobs = useAppStore((s) => s.jobs);
  const [diag, setDiag] = useState<Diagnostics | null>(null);

  useEffect(() => {
    api.get<Diagnostics>("/api/diagnostics").then(setDiag).catch(() => {});
  }, []);

  const approved = clips.filter((c) => c.status === "approved" || c.status === "exported");
  const totalSize = media.reduce((a, m) => a + (m.size_bytes || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Your personal AI stream clipping studio.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Link
          to="/import"
          className="card flex items-center gap-4 p-5 transition-colors hover:border-primary"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium">Import Video</div>
            <div className="text-xs text-muted-foreground">Add a stream recording</div>
          </div>
        </Link>
        <Link
          to="/ai-clips"
          className="card flex items-center gap-4 p-5 transition-colors hover:border-primary"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium">Generate AI Clips</div>
            <div className="text-xs text-muted-foreground">Auto-detect best moments</div>
          </div>
        </Link>
        <Link
          to="/editor"
          className="card flex items-center gap-4 p-5 transition-colors hover:border-primary"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Scissors className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium">Manual Editor</div>
            <div className="text-xs text-muted-foreground">Trim and customize clips</div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clapperboard className="h-4 w-4" /> Media imported
          </div>
          <div className="mt-2 text-2xl font-semibold">{media.length}</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" /> Clips generated
          </div>
          <div className="mt-2 text-2xl font-semibold">{approved.length}</div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HardDrive className="h-4 w-4" /> Storage used
          </div>
          <div className="mt-2 text-2xl font-semibold">{fmtBytes(totalSize)}</div>
        </div>
      </div>

      {diag && (!diag.ffmpeg || !diag.ffprobe) && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300">
          FFmpeg is not detected. Install it (winget install ffmpeg) or set the path in Settings,
          otherwise import and export will fail.
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="mb-4 font-medium">Recently generated clips</h2>
          {clips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clips yet. Import a video and run AI clipping.</p>
          ) : (
            <div className="space-y-3">
              {clips.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  to={`/editor/${c.id}`}
                  className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:border-primary"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {fmtDuration(c.start)} → {fmtDuration(c.end)}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.event || "Manual clip"}</div>
                  </div>
                  <span className="text-sm font-semibold text-primary">{c.score} pts</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-medium">Processing queue</h2>
          {Object.keys(jobs).length === 0 ? (
            <p className="text-sm text-muted-foreground">No active jobs.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(jobs).map(([id, j]) => (
                <JobProgress key={id} jobId={id} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 font-medium">Recent media</h2>
        {media.length === 0 ? (
          <p className="text-sm text-muted-foreground">No media imported yet.</p>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {media.slice(0, 4).map((m) => (
              <div key={m.id} className="rounded-md border border-border p-2">
                <div className="aspect-video overflow-hidden rounded bg-muted">
                  {m.thumbnail ? (
                    <img src={mediaUrl(m.thumbnail)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <Clapperboard className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="mt-2 truncate text-xs font-medium">{m.filename}</div>
                <div className="text-xs text-muted-foreground">{fmtDuration(m.duration)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
