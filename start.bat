@echo off
setlocal
echo ============================================
echo  AI Stream Clipper - Launcher
echo ============================================
echo.

REM Start backend in a new window
echo Starting backend on http://127.0.0.1:8000 ...
start "AI Stream Clipper - Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\activate.bat && python run.py"

REM Start frontend in a new window
echo Starting frontend on http://localhost:5173 ...
start "AI Stream Clipper - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 >nul
echo.
echo The app should now be running.
echo Open http://localhost:5173 in your browser.
echo.
echo Keep both terminal windows open while using the app.
echo Close them (or press Ctrl+C in each) to stop the app.
pause
