"""TAVIR Backend development server entry point."""
import os
from pathlib import Path

import uvicorn

# Carrega backend/.env se existir (GHOSTCLI_API_KEY etc.) sem sobrescrever o ambiente.
_env = Path(__file__).resolve().parent / ".env"
if _env.is_file():
    for line in _env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val

if __name__ == "__main__":
    port = int(os.environ.get("TAVIR_PORT", "9001"))
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=port,
        reload=True,
        log_level="info",
    )