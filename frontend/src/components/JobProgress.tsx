import { useAppStore } from "@/store/useAppStore";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export function JobProgress({ jobId }: { jobId: string }) {
  const job = useAppStore((s) => s.jobs[jobId]);

  if (!job) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Queued…
      </div>
    );
  }

  const pct = Math.round(job.progress * 100);

  if (job.status === "done") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <CheckCircle2 className="h-4 w-4" /> Complete
      </div>
    );
  }
  if (job.status === "error") {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400">
        <XCircle className="h-4 w-4" /> {job.error || "Failed"}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Processing…</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
