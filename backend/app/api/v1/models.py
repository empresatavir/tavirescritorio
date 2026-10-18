"""Models API router — returns allowed model catalog from GhostCLI."""
from fastapi import APIRouter
import os
import httpx

router = APIRouter(prefix="/api/v1", tags=["models"])

GHOSTCLI_BASE_URL = os.environ.get("GHOSTCLI_BASE_URL", "https://ghostcli.cloud/v1")
GHOSTCLI_API_KEY = os.environ.get("GHOSTCLI_API_KEY", "")

# Default allowed models aligned with GhostCLI catalog
# These should match what's configured in the GhostCLI account
ALLOWED_MODELS = [
    {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "provider": "anthropic"},
    {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "provider": "anthropic"},
    {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai"},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai"},
]


@router.get("/models")
async def list_models():
    """Return list of allowed models from GhostCLI configuration."""
    # If API key is configured, try to fetch actual catalog from GhostCLI
    if GHOSTCLI_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{GHOSTCLI_BASE_URL}/models",
                    headers={
                        "Authorization": f"Bearer {GHOSTCLI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    # GhostCLI may return OpenAI-compatible model list
                    if "data" in data:
                        models = []
                        for model in data["data"]:
                            models.append({
                                "id": model.get("id", ""),
                                "name": model.get("name", model.get("id", "")),
                                "provider": model.get("provider", "unknown"),
                            })
                        return {"models": models}
        except Exception:
            # Fall back to default allowed models if fetch fails
            pass
    
    return {"models": ALLOWED_MODELS}