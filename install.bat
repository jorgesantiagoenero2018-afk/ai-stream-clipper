@echo off
setlocal
echo ============================================
echo  AI Stream Clipper - Dependency Installer
echo ============================================
echo.

REM Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Install Python 3.11+ from https://www.python.org
    echo         Be sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
)

REM Check FFmpeg
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARN] FFmpeg not found on PATH.
    echo        Install with:  winget install ffmpeg
    echo        Or download from https://www.gyan.dev/ffmpeg/builds/
)

REM Check Node
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install Node 20+ from https://nodejs.org
    pause
    exit /b 1
)

echo.
echo [1/3] Setting up Python virtual environment...
cd backend
if not exist .venv (
    python -m venv .venv
)
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Python dependencies failed to install.
    pause
    exit /b 1
)
cd ..

echo.
echo [2/3] Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)
cd ..

echo.
echo [3/3] Done!
echo.
echo   Next steps:
echo     - Make sure FFmpeg is installed (winget install ffmpeg)
echo     - Run start.bat to launch the app
echo.
pause
