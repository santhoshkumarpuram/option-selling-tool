@echo off
echo ===================================================================
echo   Option Selling Tool - Systematic DSRD Trading Platform
echo ===================================================================
echo Starting FastAPI Backend (Port 8000)...
start "Option Selling Backend" cmd /c "cd /d "%~dp0backend" && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo Starting Vite React Frontend (Port 5173)...
start "Option Selling Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Application started!
echo - Web Dashboard: http://localhost:5173
echo - API Documentation: http://localhost:8000/docs
echo ===================================================================
pause
