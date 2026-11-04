import { useState } from "react";
import { FolderOpen, Plus, Trash2, Copy } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/lib/api";
import { fmtDuration } from "@/lib/utils";

export function ProjectsPage({ onRefresh }: { onRefresh: () => void }) {
  const projects = useAppStore((s) => s.projects);
  const clips = useAppStore((s) => s.clips);
  const [name, setName] = useState("");

  async function create() {
    if (!name.trim()) return;
    await api.post("/api/projects", { name: name.trim() });
    setName("");
    onRefresh();
  }

  async function remove(id: string) {
    await api.del(`/api/projects/${id}`);
    onRefresh();
  }

  async function duplicate(id: string) {
    const p = projects.find((x) => x.id === id);
    if (p) await api.post("/api/projects", { name: `${p.name} (copy)` });
    onRefresh();
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Organize your clips into projects.</p>
        </div>
      </div>

      <div className="card flex items-center gap-3 p-4">
        <input
          className="input flex-1"
          placeholder="New project name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
        />
        <button className="btn-primary" onClick={create}>
          <Plus className="h-4 w-4" /> Create
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {projects.map((p) => {
          const count = clips.filter((c) => c.project_id === p.id).length;
          return (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 font-medium">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    {p.name}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{count} clips</div>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost px-2" title="Duplicate" onClick={() => duplicate(p.id)}>
                    <Copy className="h-4 w-4" />
                  </button>
                  <button className="btn-ghost px-2" title="Delete" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Updated {new Date(p.updated_at).toLocaleDateString()}
              </div>
            </div>
          );
        })}
        {projects.length === 0 && (
          <div className="col-span-3 card p-8 text-center text-muted-foreground">
            No projects yet. Create one above.
          </div>
        )}
      </div>
    </div>
  );
}
