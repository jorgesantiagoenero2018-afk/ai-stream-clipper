import { LayoutTemplate, Smartphone, Monitor, Square, RectangleVertical } from "lucide-react";

const TEMPLATES = [
  { name: "Vertical Fullscreen", aspect: "9:16", icon: Smartphone, desc: "Fullscreen vertical gameplay for TikTok, Shorts, Reels." },
  { name: "Landscape", aspect: "16:9", icon: Monitor, desc: "Standard landscape for YouTube." },
  { name: "Square", aspect: "1:1", icon: Square, desc: "Square feed format." },
  { name: "Instagram Portrait", aspect: "4:5", icon: RectangleVertical, desc: "Portrait crop for Instagram feed." },
];

const LAYOUTS = [
  "Fullscreen vertical gameplay",
  "Gameplay with facecam",
  "Facecam above gameplay",
  "Facecam below gameplay",
  "Split-screen",
  "Custom layout",
];

export function TemplatesPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Templates</h1>
        <p className="text-sm text-muted-foreground">Aspect ratios and layout presets for clip export.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {TEMPLATES.map((t) => (
          <div key={t.name} className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary">
                <t.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.aspect}</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t.desc}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-medium">Layout presets</h2>
        <div className="grid grid-cols-3 gap-2">
          {LAYOUTS.map((l) => (
            <div key={l} className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
              <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
              {l}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Select an aspect ratio and layout in the editor before export.
        </p>
      </div>
    </div>
  );
}
