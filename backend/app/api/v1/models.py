"""Models API router — returns allowed model catalog from GhostCLI."""
from fastapi import APIRouter

from app.modules.ghostcli import default_model, is_configured, list_models

router = APIRouter(prefix="/api/v1", tags=["models"])

# Fallback se o gateway estiver offline
ALLOWED_MODELS = [
    {"id": "claude-opus-5-5", "name": "Claude Opus 5.5", "provider": "ghostcli"},
    {"id": "claude-sonnet-5", "name": "Claude Sonnet 5", "provider": "ghostcli"},
    {"id": "claude-fable-5.1", "name": "Claude Fable 5.1", "provider": "ghostcli"},
]


@router.get("/models")
async def list_models_endpoint():
    """Return list of models from GhostCLI account (fallback estático)."""
    if is_configured():
        try:
            models = await list_models()
            if models:
                return {"models": models, "default": default_model()}
        except Exception:
            pass
    return {"models": ALLOWED_MODELS, "default": default_model()}
