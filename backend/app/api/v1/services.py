"""Service management API — health check, logs, start/stop/restart for local TAVIR services."""
import os
import signal
import subprocess
import time
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/services", tags=["services"])

# Project root is 3 levels up from this file
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
LOGS_DIR = PROJECT_ROOT / "logs"
PIDS_DIR = PROJECT_ROOT / ".pids"

# New exclusive port range for TAVIR Escritório (9000-9100)
SERVICES_CONFIG: dict[str, dict[str, Any]] = {
    "backend": {
        "name": "Backend FastAPI",
        "port": 9001,
        "command": ["python", "run.py"],
        "cwd": str(PROJECT_ROOT / "backend"),
        "env_override": {"TAVIR_PORT": "9001"},
        "log_file": "backend.log",
        "pid_file": "backend.pid",
        "health_endpoint": "/api/v1/health",
    },
    "frontend": {
        "name": "Frontend SolidJS (Vite)",
        "port": 9002,
        "command": ["npm", "run", "dev", "--", "--port", "9002"],
        "cwd": str(PROJECT_ROOT / "frontend"),
        "env_override": {},
        "log_file": "frontend.log",
        "pid_file": "frontend.pid",
        "health_endpoint": "/",
    },
}


def _ensure_dirs():
    LOGS_DIR.mkdir(exist_ok=True)
    PIDS_DIR.mkdir(exist_ok=True)


def _get_pid(service_id: str) -> int | None:
    pid_file = PIDS_DIR / SERVICES_CONFIG[service_id]["pid_file"]
    if not pid_file.exists():
        return None
    try:
        pid = int(pid_file.read_text().strip())
        # Check if process is actually alive
        os.kill(pid, 0)
        return pid
    except (ValueError, OSError, ProcessLookupError):
        # Stale PID file
        pid_file.unlink(missing_ok=True)
        return None


def _save_pid(service_id: str, pid: int):
    _ensure_dirs()
    pid_file = PIDS_DIR / SERVICES_CONFIG[service_id]["pid_file"]
    pid_file.write_text(str(pid))


def _remove_pid(service_id: str):
    pid_file = PIDS_DIR / SERVICES_CONFIG[service_id]["pid_file"]
    pid_file.unlink(missing_ok=True)


def _is_port_listening(port: int) -> bool:
    """Check if a port is listening using socket."""
    import socket
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex(("127.0.0.1", port))
            return result == 0
    except Exception:
        return False


def _check_health(service_id: str) -> dict[str, Any]:
    """Check health of a service by verifying PID and port."""
    config = SERVICES_CONFIG[service_id]
    pid = _get_pid(service_id)
    port = config["port"]
    port_active = _is_port_listening(port)

    if pid is None and not port_active:
        return {"status": "offline", "pid": None, "port": port, "port_active": False}
    elif pid is not None and port_active:
        return {"status": "online", "pid": pid, "port": port, "port_active": True}
    elif pid is not None and not port_active:
        return {"status": "starting", "pid": pid, "port": port, "port_active": False}
    else:
        # Port active but no PID file — orphan process
        return {"status": "orphan", "pid": None, "port": port, "port_active": True}


@router.get("/status")
async def get_all_services_status():
    """Return status of all managed services."""
    results = []
    for service_id, config in SERVICES_CONFIG.items():
        health = _check_health(service_id)
        log_file = LOGS_DIR / config["log_file"]
        has_errors = False
        if log_file.exists():
            try:
                last_lines = log_file.read_text(errors="replace").splitlines()[-50:]
                has_errors = any(
                    kw in line.lower()
                    for line in last_lines
                    for kw in ["error", "traceback", "exception", "failed", "fatal"]
                )
            except Exception:
                pass

        results.append({
            "id": service_id,
            "name": config["name"],
            "port": config["port"],
            "status": health["status"],
            "pid": health["pid"],
            "port_active": health["port_active"],
            "has_log_errors": has_errors,
            "log_file": str(log_file),
        })
    return results


@router.get("/{service_id}/status")
async def get_service_status(service_id: str):
    """Return status of a specific service."""
    if service_id not in SERVICES_CONFIG:
        raise HTTPException(status_code=404, detail=f"Service '{service_id}' not found")
    health = _check_health(service_id)
    config = SERVICES_CONFIG[service_id]
    return {
        "id": service_id,
        "name": config["name"],
        "port": config["port"],
        **health,
    }


@router.get("/{service_id}/logs")
async def get_service_logs(service_id: str, lines: int = 100, errors_only: bool = False):
    """Return last N lines of a service's log file."""
    if service_id not in SERVICES_CONFIG:
        raise HTTPException(status_code=404, detail=f"Service '{service_id}' not found")

    config = SERVICES_CONFIG[service_id]
    log_file = LOGS_DIR / config["log_file"]

    if not log_file.exists():
        return {"service_id": service_id, "lines": [], "total": 0, "file": str(log_file)}

    try:
        content = log_file.read_text(errors="replace")
        all_lines = content.splitlines()

        if errors_only:
            error_keywords = ["error", "traceback", "exception", "failed", "fatal", "critical"]
            filtered = [l for l in all_lines if any(kw in l.lower() for kw in error_keywords)]
            result_lines = filtered[-lines:]
        else:
            result_lines = all_lines[-lines:]

        return {
            "service_id": service_id,
            "lines": result_lines,
            "total": len(all_lines),
            "returned": len(result_lines),
            "errors_only": errors_only,
            "file": str(log_file),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read log: {exc}")


@router.post("/{service_id}/start")
async def start_service(service_id: str):
    """Start a service in background with stdout/stderr redirected to log file."""
    if service_id not in SERVICES_CONFIG:
        raise HTTPException(status_code=404, detail=f"Service '{service_id}' not found")

    health = _check_health(service_id)
    if health["status"] == "online":
        return {"message": f"Service '{service_id}' is already running", "pid": health["pid"]}

    config = SERVICES_CONFIG[service_id]
    _ensure_dirs()

    log_file = LOGS_DIR / config["log_file"]

    # Build environment with overrides
    env = os.environ.copy()
    env.update(config.get("env_override", {}))

    # For backend, set the port in uvicorn via env or command
    if service_id == "backend":
        env["TAVIR_PORT"] = str(config["port"])

    try:
        with open(log_file, "a") as log_fh:
            process = subprocess.Popen(
                config["command"],
                cwd=config["cwd"],
                stdout=log_fh,
                stderr=subprocess.STDOUT,
                env=env,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
                start_new_session=True if os.name != "nt" else False,
            )

        _save_pid(service_id, process.pid)

        # Wait briefly to check if process started successfully
        await _async_sleep(2)
        updated_health = _check_health(service_id)

        return {
            "message": f"Service '{service_id}' started",
            "pid": process.pid,
            "port": config["port"],
            "status": updated_health["status"],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to start service: {exc}")


@router.post("/{service_id}/stop")
async def stop_service(service_id: str):
    """Stop a service by sending SIGTERM to its PID."""
    if service_id not in SERVICES_CONFIG:
        raise HTTPException(status_code=404, detail=f"Service '{service_id}' not found")

    pid = _get_pid(service_id)
    if pid is None:
        return {"message": f"Service '{service_id}' is not running"}

    try:
        if os.name == "nt":
            # Windows: use taskkill for process tree
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                capture_output=True,
                timeout=10,
            )
        else:
            os.kill(pid, signal.SIGTERM)
            # Give it time to shut down gracefully
            await _async_sleep(2)
            try:
                os.kill(pid, 0)  # Check if still alive
                os.kill(pid, signal.SIGKILL)  # Force kill
            except ProcessLookupError:
                pass  # Already dead

        _remove_pid(service_id)
        return {"message": f"Service '{service_id}' stopped", "pid": pid}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to stop service: {exc}")


@router.post("/{service_id}/restart")
async def restart_service(service_id: str):
    """Restart a service: stop then start."""
    if service_id not in SERVICES_CONFIG:
        raise HTTPException(status_code=404, detail=f"Service '{service_id}' not found")

    stop_result = await stop_service(service_id)
    await _async_sleep(1)
    start_result = await start_service(service_id)

    return {
        "message": f"Service '{service_id}' restarted",
        "stop": stop_result,
        "start": start_result,
    }


async def _async_sleep(seconds: float):
    """Async sleep helper."""
    import asyncio
    await asyncio.sleep(seconds)