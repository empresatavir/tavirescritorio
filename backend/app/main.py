from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import sys

from app.api.v1.agents import router as agents_router
from app.api.v1.projects import router as projects_router
from app.api.v1.jobs import router as jobs_router

app = FastAPI(title="TAVIR Escritório API", version="0.1.0")

# Register API routers
app.include_router(agents_router)
app.include_router(projects_router)
app.include_router(jobs_router)

# Health endpoint
@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}

# Serve frontend static files in production
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Try to serve the exact file first
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        # Fall back to index.html for SPA routing
        return FileResponse(frontend_dist / "index.html")