from contextlib import asynccontextmanager
from urllib.parse import quote

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import sys

from app.api.v1.agents import router as agents_router
from app.api.v1.projects import router as projects_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.factory import router as factory_router
from app.api.v1.studio import router as studio_router
from app.api.v1.visibility import router as visibility_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.approvals import router as approvals_router
from app.api.v1.cockpit import router as cockpit_router
from app.api.v1.chat import router as chat_router
from app.api.v1.services import router as services_router
from app.api.v1.proposals import router as proposals_router
from app.api.v1.models import router as models_router
from app.api.v1.integrations import router as integrations_router
from app.modules.ghostcli.notice import begin_ai_link_scope, current_ai_link_error, reset_ai_link_scope
from app.shared.database import ensure_schema_patches


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        await ensure_schema_patches()
    except Exception as exc:
        print(f"[main] schema patch warning: {exc}")
    yield


app = FastAPI(title="TAVIR Escritório API", version="0.1.0", lifespan=lifespan)


class AiLinkHeaderMiddleware:
    """Cabeçalho X-Tavir-Ai-Link quando o motor de IA falha nesta requisição."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        token = begin_ai_link_scope()

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                err = current_ai_link_error()
                if err:
                    headers = list(message.get("headers") or [])
                    headers.append((b"x-tavir-ai-link", quote(err).encode("ascii", "ignore")))
                    message = {**message, "headers": headers}
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            reset_ai_link_scope(token)


app.add_middleware(AiLinkHeaderMiddleware)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Tavir-Ai-Link"],
)

# Register API routers
app.include_router(agents_router)
app.include_router(projects_router)
app.include_router(jobs_router)
app.include_router(factory_router)
app.include_router(studio_router)
app.include_router(visibility_router)
app.include_router(tasks_router)
app.include_router(approvals_router)
app.include_router(cockpit_router)
app.include_router(chat_router)
app.include_router(services_router)
app.include_router(proposals_router)
app.include_router(models_router)
app.include_router(integrations_router)

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
        if full_path.startswith("api/"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="API endpoint not found")
        # Try to serve the exact file first
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        # Fall back to index.html for SPA routing
        return FileResponse(frontend_dist / "index.html")
