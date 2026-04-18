@echo off
cd /d "%~dp0"

where netstat >nul 2>&1
netstat -ano | findstr ":8000" >nul 2>&1
if %errorlevel%==0 (
    echo Port 8000 is already in use. Kill it first or close whatever is using it.
    netstat -ano | findstr ":8000"
    pause
    exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
    echo No .venv found. Run: python -m venv .venv ^&^& .venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

echo Starting server at http://localhost:8000 ...
start "" http://localhost:8000
.venv\Scripts\python.exe -m uvicorn backend.server:app --reload --port 8000
