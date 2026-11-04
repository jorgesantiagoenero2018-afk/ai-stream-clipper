import { useEffect, useState } from "react";
import { Save, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { api, type Diagnostics } from "@/lib/api";

interface SettingsShape {
  media_dir: string;
  export_dir: string;
  ffmpeg_path: string;
  ffprobe_path: string;
  hw_accel: string;
  whisper_model: string;
  whisper_device: string;
  ollama_url: string;
  ollama_model: string;
  default_aspect: string;
  default_quality: string;
  min_score: number;
  auto_clip_duration: number;
  burn_captions: boolean;
  caption_size: number;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<SettingsShape | null>(null);
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    const [s, d] = await Promise.all([
      api.get<SettingsShape>("/api/settings"),
      api.get<Diagnostics>("/api/diagnostics"),
    ]);
    setSettings(s);
    setDiag(d);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!settings) return;
    await api.put("/api/settings", settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    load();
  }

  if (!settings) return <div className="p-6 text-muted-foreground">Loading…</div>;

  function set<K extends keyof SettingsShape>(key: K, value: SettingsShape[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure processing, AI, and storage.</p>
        </div>
        <button className="btn-primary" onClick={save}>
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="mb-4 font-medium">Storage</h2>
          <label className="mb-1 block text-sm text-muted-foreground">Media directory</label>
          <input className="input w-full" value={settings.media_dir} onChange={(e) => set("media_dir", e.target.value)} />
          <label className="mt-3 mb-1 block text-sm text-muted-foreground">Export directory</label>
          <input className="input w-full" value={settings.export_dir} onChange={(e) => set("export_dir", e.target.value)} />
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-medium">FFmpeg</h2>
          <label className="mb-1 block text-sm text-muted-foreground">FFmpeg path</label>
          <input className="input w-full" value={settings.ffmpeg_path} onChange={(e) => set("ffmpeg_path", e.target.value)} />
          <label className="mt-3 mb-1 block text-sm text-muted-foreground">FFprobe path</label>
          <input className="input w-full" value={settings.ffprobe_path} onChange={(e) => set("ffprobe_path", e.target.value)} />
          <label className="mt-3 mb-1 block text-sm text-muted-foreground">Hardware acceleration</label>
          <select className="input w-full" value={settings.hw_accel} onChange={(e) => set("hw_accel", e.target.value)}>
            <option value="auto">Auto</option>
            <option value="nvenc">NVIDIA NVENC</option>
            <option value="qsv">Intel Quick Sync</option>
            <option value="amd">AMD AMF</option>
            <option value="none">None (CPU)</option>
          </select>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-medium">AI</h2>
          <label className="mb-1 block text-sm text-muted-foreground">Whisper model</label>
          <select className="input w-full" value={settings.whisper_model} onChange={(e) => set("whisper_model", e.target.value)}>
            <option value="tiny">tiny</option>
            <option value="base">base</option>
            <option value="small">small</option>
            <option value="medium">medium</option>
            <option value="large-v3">large-v3</option>
          </select>
          <label className="mt-3 mb-1 block text-sm text-muted-foreground">Whisper device</label>
          <select className="input w-full" value={settings.whisper_device} onChange={(e) => set("whisper_device", e.target.value)}>
            <option value="auto">Auto</option>
            <option value="cpu">CPU</option>
            <option value="cuda">CUDA</option>
          </select>
          <label className="mt-3 mb-1 block text-sm text-muted-foreground">Ollama URL</label>
          <input className="input w-full" value={settings.ollama_url} onChange={(e) => set("ollama_url", e.target.value)} />
          <label className="mt-3 mb-1 block text-sm text-muted-foreground">Ollama model</label>
          <input className="input w-full" value={settings.ollama_model} onChange={(e) => set("ollama_model", e.target.value)} />
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-medium">Clipping defaults</h2>
          <label className="mb-1 block text-sm text-muted-foreground">Default aspect ratio</label>
          <select className="input w-full" value={settings.default_aspect} onChange={(e) => set("default_aspect", e.target.value)}>
            <option value="9:16">9:16</option>
            <option value="16:9">16:9</option>
            <option value="1:1">1:1</option>
            <option value="4:5">4:5</option>
          </select>
          <label className="mt-3 mb-1 block text-sm text-muted-foreground">Default quality</label>
          <select className="input w-full" value={settings.default_quality} onChange={(e) => set("default_quality", e.target.value)}>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
            <option value="1440p">1440p</option>
            <option value="4k">4K</option>
          </select>
          <label className="mt-3 mb-1 block text-sm text-muted-foreground">
            Minimum AI score ({settings.min_score})
          </label>
          <input type="range" min={0} max={100} value={settings.min_score} onChange={(e) => set("min_score", Number(e.target.value))} className="w-full" />
          <label className="mt-3 mb-1 block text-sm text-muted-foreground">
            Auto clip duration ({settings.auto_clip_duration}s)
          </label>
          <input type="range" min={10} max={90} value={settings.auto_clip_duration} onChange={(e) => set("auto_clip_duration", Number(e.target.value))} className="w-full" />
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.burn_captions} onChange={(e) => set("burn_captions", e.target.checked)} />
            Burn captions by default
          </label>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Diagnostics</h2>
          <button className="btn-secondary" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Re-check
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <DiagRow label="FFmpeg" ok={diag?.ffmpeg} />
          <DiagRow label="FFprobe" ok={diag?.ffprobe} />
          <DiagRow label="Whisper (faster-whisper)" ok={diag?.whisper} />
          <DiagRow label="Ollama" ok={diag?.ollama} />
          <DiagRow label="NVIDIA NVENC" ok={diag?.encoders.nvenc} />
          <DiagRow label="Intel Quick Sync" ok={diag?.encoders.qsv} />
          <DiagRow label="AMD AMF" ok={diag?.encoders.amd} />
        </div>
        {diag && (
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <div>Media: {diag.media_dir}</div>
            <div>Exports: {diag.export_dir}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DiagRow({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <span className="text-sm">{label}</span>
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-green-400" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400" />
      )}
    </div>
  );
}
