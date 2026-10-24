"""Cliente HTTP compartilhado do GhostCLI (gateway de modelos do TAVIR)."""
from app.modules.ghostcli.client import (
    chat_completion,
    default_effort,
    default_model,
    health_check,
    is_configured,
    list_models,
)

__all__ = [
    "chat_completion",
    "default_effort",
    "default_model",
    "health_check",
    "is_configured",
    "list_models",
]
