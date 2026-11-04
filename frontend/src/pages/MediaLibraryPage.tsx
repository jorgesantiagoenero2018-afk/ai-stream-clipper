import { Link } from "react-router-dom";
import { Clapperboard, Trash2, MonitorPlay } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { api, mediaUrl } from "@/lib/api";
import { fmtBytes, fmtDuration } from "@/lib/utils";

export function MediaLibraryPage({ onRefresh }: { onRefresh: () => void }) {
  const media = useAppStore((s) => s.media);

  async function remove(id: string) {
    await api.del(`/api/media/${id}`);
    onRefresh();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Media Library</h1>
        <p className="text-sm text-muted-foreground">All imported videos.</p>
      </div>

      {media.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-muted-foreground">
          <Clapperboard className="h-8 w-8" />
          <p className="mt-3 text-sm">No videos yet.</p>
          <Link to="/import" className="btn-primary mt-4">Import Video</Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {media.map((m) => (
            <div key={m.id} className="card overflow-hidden">
              <div className="aspect-video bg-muted">
                {m.thumbnail ? (
                  <img src={mediaUrl(m.thumbnail)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Clapperboard className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="truncate text-sm font-medium">{m.filename}</div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{fmtDuration(m.duration)}</span>
                  {m.width && m.height && (
                    <span>{m.width}×{m.height}</span>
                  )}
                  {m.fps ? <span>{m.fps.toFixed(0)} fps</span> : null}
                  <span>{fmtBytes(m.size_bytes)}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link to="/ai-clips" className="btn-secondary flex-1">
                    <MonitorPlay className="h-4 w-4" /> Clip
                  </Link>
                  <button className="btn-ghost px-2" onClick={() => remove(m.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
