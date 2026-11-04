import { useCallback, useRef, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { watchJob } from "@/lib/ws";
import { JobProgress } from "@/components/JobProgress";
import { useAppStore } from "@/store/useAppStore";

export function ImportPage({ onRefresh }: { onRefresh: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const setJobProgress = useAppStore((s) => s.setJobProgress);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setError("");
      for (const file of list) {
        setUploading((u) => [...u, file.name]);
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/import", { method: "POST", body: fd });
          if (!res.ok) throw new Error(`Failed: ${res.status}`);
          const data = await res.json();
          setJobProgress(data.job_id, { status: "queued", progress: 0 });
          watchJob(data.job_id);
          onRefresh();
        } catch (e) {
          setError(`Import failed for ${file.name}: ${(e as Error).message}`);
        } finally {
          setUploading((u) => u.filter((n) => n !== file.name));
          onRefresh();
        }
      }
    },
    [onRefresh, setJobProgress]
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Video</h1>
        <p className="text-sm text-muted-foreground">
          Drag and drop stream recordings. Supports MP4, MOV, MKV, WEBM, AVI, TS, M4V, FLV.
        </p>
      </div>

      <div
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <UploadCloud className="h-10 w-10 text-muted-foreground" />
        <p className="mt-4 text-sm font-medium">Drop videos here or click to browse</p>
        <p className="mt-1 text-xs text-muted-foreground">Multiple files supported</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".mp4,.mov,.mkv,.webm,.avi,.ts,.m4v,.flv"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((name) => (
            <div key={name} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading {name}…
            </div>
          ))}
        </div>
      )}

      <ImportProgress />
    </div>
  );
}

function ImportProgress() {
  const jobs = useAppStore((s) => s.jobs);
  const entries = Object.entries(jobs);
  if (entries.length === 0) return null;
  return (
    <div className="card p-5">
      <h2 className="mb-4 font-medium">Active jobs</h2>
      <div className="space-y-3">
        {entries.map(([id]) => (
          <JobProgress key={id} jobId={id} />
        ))}
      </div>
    </div>
  );
}
