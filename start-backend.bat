@echo off
echo ========================================================
echo Starting Option Selling Tool - Backend (FastAPI :8000)
echo ========================================================
cd /d "%~dp0backend"
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
