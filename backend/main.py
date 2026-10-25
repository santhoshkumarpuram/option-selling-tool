"""FastAPI Application Entry Point for Option Selling Tool."""

import uvicorn
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from db.database import init_db
from routers import auth, scanner, analysis, options, positions, settings_router
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema
    await init_db()
    print("Option Selling Tool Database Initialized.")
    yield


app = FastAPI(
    title="Option Selling Tool — DSRD Engine",
    description="High-Probability Option Selling Platform based on CFA Sanjay Kathuria's DSRD Framework",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(scanner.router)
app.include_router(analysis.router)
app.include_router(options.router)
app.include_router(positions.router)
app.include_router(settings_router.router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": "Option Selling Tool",
        "framework": "DSRD (Direction, Support, Resistance, Delta)",
        "version": "1.0.0"
    }


# Mount frontend production build if present (for single-server Pi / Linux hosting)
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if (frontend_dist / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

if frontend_dist.exists():
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")


if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=settings.debug)
