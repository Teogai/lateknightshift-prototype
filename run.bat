@echo off
cd /d "%~dp0"

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo npm not found. Install Node.js from https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

echo Starting dev server at http://localhost:5173 ...
start "" http://localhost:5173
npm run dev
