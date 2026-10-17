"""TAVIR Backend development server entry point."""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("TAVIR_PORT", "9001"))
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=port,
        reload=True,
        log_level="info",
    )