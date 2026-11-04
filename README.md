# AI Stream Clipper

A personal, AI-powered streaming video clipping studio — a local **StreamLadder alternative**
that automatically detects, extracts, edits, and exports the best moments from gaming
livestreams and recorded videos. Everything runs on **your own computer** (no cloud, no
subscription, no Docker).

![stack](https://img.shields.io/badge/stack-FastAPI%20%2B%20React%20%2B%20FFmpeg%20%2B%20Whisper-7c3aed)

---

## Features

- **AI Automatic Clipping** — analyzes audio (loud reactions, laughter, intensity), speech
  (Whisper transcription, excited phrases), and scene changes, then scores every candidate
  moment 0–100.
- **Manual Editor** — video preview, scrubbing timeline, frame-step navigation, set in/out
  points, keyboard shortcuts.
- **Automatic vertical conversion** — 9:16, 16:9, 1:1, 4:5 with facecam layout presets.
- **Captions & subtitles** — Whisper word-level timestamps, SRT export, burn-in styling.
- **AI enhancement (optional)** — Ollama-powered titles, descriptions, and hashtags.
- **Batch export** — H.264/H.265, 720p–4K, hardware acceleration (NVENC/QSV/AMF), no watermark.
- **Project management** — save, rename, duplicate, delete, organize clips (SQLite-backed).

---

## Prerequisites (Windows 10/11)

| Tool | Why | How to install |
|------|-----|----------------|
| **Python 3.11+** | Backend | https://www.python.org (check "Add to PATH") |
| **Node.js 20+** | Frontend | https://nodejs.org (LTS) |
| **FFmpeg** | Video processing | `winget install ffmpeg` |

Optional:
- **Ollama** — for AI titles/hashtags (`winget install Ollama.Ollama`), then `ollama pull llama3.2`
- **NVIDIA GPU** — for NVENC hardware-accelerated export (driver auto-detected)

---

## Quick start

```bat
:: 1. Install dependencies (only once)
install.bat

:: 2. Launch the app (backend + frontend)
start.bat
```

Then open **http://localhost:5173** in your browser.

> The first AI analysis will download the Whisper model (a few hundred MB for the
> default `base` model). This is cached and only happens once.

---

## Manual start (if you prefer terminals)

**Backend** (port 8000):
```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

**Frontend** (port 5173):
```bat
cd frontend
npm install
npm run dev
```

API docs (Swagger UI): **http://127.0.0.1:8000/docs**

---

## Typical workflow

1. Open the app → **Import Video** (drag & drop a stream recording).
2. Go to **AI Clip Generator** → pick the video → **Generate AI Clips**.
3. Review suggested moments (score, event, timestamps) → approve/reject.
4. Open a clip in the **Manual Editor** → adjust in/out, pick aspect ratio.
5. **Export** → choose quality → done. No watermark.

---

## Project structure

```
ai-stream-clipper/
├── install.bat          # one-click dependency installer
├── start.bat            # one-click launcher (backend + frontend)
├── backend/             # FastAPI + FFmpeg + Whisper + AI analysis
│   ├── run.py
│   ├── requirements.txt
│   └── app/
│       ├── main.py      # REST + WebSocket API
│       ├── config.py    # settings (JSON persisted)
│       ├── db.py        # SQLite layer
│       ├── jobs.py      # background job queue
│       ├── schemas.py   # request/response models
│       └── services/
│           ├── ffmpeg.py      # probe + encoder detection
│           ├── video.py       # thumbnail/proxy/audio extraction
│           ├── transcribe.py  # faster-whisper
│           ├── analyze.py     # moment detection + scoring
│           ├── captions.py    # SRT + burn-in styling
│           ├── reframe.py     # aspect crop + facecam layouts
│           ├── ai_text.py     # Ollama titles/hashtags
│           └── exporter.py    # FFmpeg export pipeline
└── frontend/            # React + TypeScript + Vite + Tailwind + Zustand
    └── src/
        ├── App.tsx
        ├── store/useAppStore.ts
        ├── lib/ (api, ws, utils)
        ├── components/ (Sidebar, VideoPlayer, JobProgress)
        └── pages/ (Dashboard, Import, AiClips, Editor, Projects, MediaLibrary, Templates, Settings)
```

---

## Configuration

Settings are stored in `~/.ai-stream-clipper/config.json` and editable from the app's
**Settings** page (or via `PUT /api/settings`). Key options:

- `media_dir` / `export_dir` — where videos are stored and clips are exported.
- `hw_accel` — `auto`, `nvenc`, `qsv`, `amd`, or `none`.
- `whisper_model` — `tiny` (fast) … `large-v3` (best accuracy).
- `ollama_url` / `ollama_model` — for AI text enhancement.
- `min_score` / `auto_clip_duration` — AI clipping thresholds.

---

## Troubleshooting

See **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** for common issues and fixes.

---

## Notes & limitations

- **Local-only**: this app intentionally runs on your machine. Online VOD support requires
  authorized direct URLs where legally permitted; DRM-protected content is never bypassed.
- **Whisper model download** requires internet on first use; transcription then runs offline.
- **Hardware acceleration** falls back to CPU (x264) automatically if no GPU encoder is found.
- This is a personal-use application; there is no registration, billing, or multi-user system.

## License

MIT — free to use and modify for personal use.
