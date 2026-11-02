@echo off
title Appify Next.js Dashboard
cd /d "%~dp0dashboard"

set NPM_CMD=npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files\nodejs\npm.cmd" (
        set NPM_CMD="C:\Program Files\nodejs\npm.cmd"
    )
)

echo ===================================================
echo   Starting Appify Dashboard [Next.js]
echo ===================================================

if not exist "node_modules" (
    echo [NPM] Installing dependencies - please wait...
    call %NPM_CMD% install
)

echo.
echo ===================================================
echo   Dashboard is starting at: http://localhost:3000
echo ===================================================
echo Press Ctrl+C to stop the dashboard server.
echo.

call %NPM_CMD% run dev

if %errorlevel% neq 0 (
    echo.
    echo Server stopped with error.
    pause
)
