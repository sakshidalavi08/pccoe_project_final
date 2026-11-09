@echo off
title ClimateBuild AI Launcher
cd /d "%~dp0"
echo ========================================================
echo    ClimateBuild AI - Launcher
echo ========================================================
echo.
echo [1/3] Checking Python...
python --version
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Install Python 3.9+ from python.org and tick "Add to PATH".
    pause
    exit /b
)
echo.
echo [2/3] Installing requirements...
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] pip install failed. Check your internet connection.
    pause
    exit /b
)
echo.
echo [3/3] Starting server on http://127.0.0.1:5000 ...
echo Browser opens automatically. Press CTRL+C to stop.
echo.
python app.py
pause
