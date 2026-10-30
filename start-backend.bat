@echo off
title Appify Backend Server
cd /d "%~dp0backend"

set PHP_EXE=C:\Users\kunaa\php-8.3\php.exe
set COMPOSER_PHAR=C:\xampp\php\composer.phar

echo ===================================================
echo   Starting Appify Backend (Laravel) without Docker
echo ===================================================

if not exist ".env" (
    echo [.env] Creating local configuration...
    copy .env.example .env
)

if not exist "database\database.sqlite" (
    type nul > "database\database.sqlite"
)

if not exist "vendor" (
    echo [Composer] Installing PHP dependencies...
    "%PHP_EXE%" "%COMPOSER_PHAR%" install --no-interaction
)

echo [Laravel] Checking application encryption key...
"%PHP_EXE%" artisan key:generate --no-interaction

echo [Database] Running database migrations...
"%PHP_EXE%" artisan migrate --force

if not exist "public\css\filament" (
    echo [Filament] Publishing admin assets...
    "%PHP_EXE%" artisan filament:assets
    "%PHP_EXE%" artisan livewire:publish --assets
)

echo.
echo ===================================================
echo   Backend is LIVE at: http://127.0.0.1:8000
echo   Health Probe:       http://127.0.0.1:8000/health
echo   API V1:             http://127.0.0.1:8000/v1
echo ===================================================
echo Press Ctrl+C to stop the server.
echo.

"%PHP_EXE%" -d max_execution_time=0 artisan serve --port=8000

