"""Integrations API — health checks for external services like GhostCLI."""
import os
import time
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/integrations", tags=["integrations"])

GHOSTCLI_BASE_URL = os.environ.get("GHOSTCLI_BASE_URL", "https://ghostcli.cloud/v1")
GHOSTCLI_API_KEY = os.environ.get("GHOSTCLI_API_KEY", "")


@router.get("/ghostcli/status")
async def get_ghostcli_status() -> dict[str, Any]:
    """Check GhostCLI integration status: configured, unavailable, or auth error."""
    result: dict[str, Any] = {
        "integration": "ghostcli",
        "status": "unavailable",
        "latency_ms": None,
        "last_check": None,
        "error": None,
    }

    if not GHOSTCLI_API_KEY:
        result["status"] = "unavailable"
        result["error"] = "Chave de API não configurada"
        result["last_check"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        return result

    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{GHOSTCLI_BASE_URL}/health",
                headers={"Authorization": f"Bearer {GHOSTCLI_API_KEY}"},
            )
            elapsed_ms = round((time.monotonic() - start) * 1000, 1)
            result["latency_ms"] = elapsed_ms
            result["last_check"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

            if response.status_code == 200:
                result["status"] = "configured"
            elif response.status_code == 401 or response.status_code == 403:
                result["status"] = "error"
                result["error"] = "Credenciais inválidas"
            else:
                result["status"] = "error"
                result["error"] = f"Erro HTTP {response.status_code}"
    except httpx.TimeoutException:
        elapsed_ms = round((time.monotonic() - start) * 1000, 1)
        result["latency_ms"] = elapsed_ms
        result["last_check"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        result["status"] = "error"
        result["error"] = "Timeout na conexão"
    except httpx.ConnectError:
        elapsed_ms = round((time.monotonic() - start) * 1000, 1)
        result["latency_ms"] = elapsed_ms
        result["last_check"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        result["status"] = "error"
        result["error"] = "Não foi possível conectar ao servidor"
    except Exception as exc:
        elapsed_ms = round((time.monotonic() - start) * 1000, 1)
        result["latency_ms"] = elapsed_ms
        result["last_check"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        result["status"] = "error"
        result["error"] = str(exc)

    return result