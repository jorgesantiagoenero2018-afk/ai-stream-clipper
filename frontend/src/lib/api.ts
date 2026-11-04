const BASE = "";

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export interface Diagnostics {
  ffmpeg: boolean;
  ffprobe: boolean;
  encoders: { nvenc: boolean; qsv: boolean; amd: boolean };
  whisper: boolean;
  ollama: boolean;
  media_dir: string;
  export_dir: string;
}

export function mediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  const name = path.replace(/\\/g, "/").split("/").pop();
  return name ? `/media/${name}` : "";
}
