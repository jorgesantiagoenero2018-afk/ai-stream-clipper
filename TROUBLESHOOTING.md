# Troubleshooting

## "FFmpeg not found" / red FFmpeg in Diagnostics

FFmpeg is a required external dependency (it is not bundled with Python).

1. Install it: `winget install ffmpeg` **or** download from https://www.gyan.dev/ffmpeg/builds/
2. Make sure `ffmpeg.exe` and `ffprobe.exe` are on your PATH.
3. Alternatively set the full paths in **Settings → FFmpeg**.

## Python not recognized

Reinstall Python from https://www.python.org and tick **"Add Python to PATH"**.
Verify with: `python --version` (should be 3.11 or newer).

## Backend won't start / port 8000 in use

Check the backend terminal window for the error. Common cause: another process on 8000.
- Stop the other process, or
- Edit `backend/run.py` and change `port=8000` to a free port (also update the Vite proxy in
  `frontend/vite.config.ts`).

## Frontend shows "Request failed" / blank dashboard

The backend (port 8000) is not running yet. Run `start.bat` (starts both), or start the backend
manually first, then the frontend.

## AI analysis fails with "faster-whisper is not installed"

Run the installer again:
```bat
cd backend
.venv\Scripts\activate
pip install faster-whisper
```

## Whisper model download is slow / fails

The first analysis downloads the model from Hugging Face. Options:
- Use a smaller model in **Settings** (`tiny` or `base`).
- Set `HF_ENDPOINT` to a mirror if needed.

## Analyze returns few or no clips

- **Lower the minimum score** in Settings (`min_score`), or on the AI Clip Generator page.
- **Increase clip duration** — longer clips combine more signals.
- The moment detector needs speech/audio to score; a fully-muted video will produce few moments.
  Confirm your recording has an audio track.

## Export fails with non-zero error

1. Check the backend terminal for the exact FFmpeg error.
2. Try disabling captions (captions require a valid .srt file generated during analysis).
3. Try switching hardware acceleration to `none` in Settings (some encoders reject certain
   resolutions/bitrates).

## Captions / subtitles don't appear

Captions are generated during AI analysis and stored as a `.srt` next to the source video.
They are only burned in when (a) the `.srt` exists and (b) "Burn captions" is enabled.

## Ollama titles/hashtags return empty

Ollama is optional. Install it (`winget install Ollama.Ollama`), pull a model
(`ollama pull llama3.2`), and confirm it is running at the URL in Settings. The app degrades
gracefully — core clipping works without Ollama.

## Hardware encoding not detected

- Ensure your GPU drivers are up to date.
- The encoder detection runs `ffmpeg -encoders` and looks for `h264_nvenc`, `h264_qsv`,
  `h264_amf`. If none appear, your FFmpeg build lacks those encoders (gyan.dev full build
  includes them).

## Where are my files?

- Imported media: `~/.ai-stream-clipper/media/` (configurable in Settings)
- Exported clips: `~/.ai-stream-clipper/exports/`
- Project metadata: `~/.ai-stream-clipper/clipper.db` (SQLite)

---

Still stuck? Re-check dependencies on the **Settings → Diagnostics** page and confirm all rows
show green before troubleshooting further.
