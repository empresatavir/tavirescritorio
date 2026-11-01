"""Acha a instalação local de cada motor e abre o login da própria plataforma."""
from __future__ import annotations

import importlib.util
import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
from pathlib import Path

_CREATE_NO_WINDOW = 0x08000000
_DETACHED = 0x00000008
_NEW_GROUP = 0x00000200
_URL_RE = re.compile(r"https://[^\s<>\"']+")
_TTL = 12.0
_cache: dict[str, tuple[float, dict]] = {}
_login_guard = threading.Lock()
_login_state: dict[str, dict] = {}


def parse_claude_status(stdout: str) -> bool:
    try:
        data = json.loads((stdout or "").strip() or "{}")
    except json.JSONDecodeError:
        return False
    return bool(isinstance(data, dict) and data.get("loggedIn"))


def parse_codex_status(stdout: str, stderr: str = "") -> bool:
    blob = f"{stdout}\n{stderr}".lower()
    if "not logged" in blob:
        return False
    return "logged in" in blob


def _home_bins(name: str) -> list[Path]:
    home = Path.home()
    local = os.environ.get("LOCALAPPDATA") or ""
    appdata = os.environ.get("APPDATA") or ""
    found = [
        home / ".local" / "bin" / name,
        home / ".local" / "bin" / f"{name}.exe",
        home / ".local" / "bin" / f"{name}.cmd",
    ]
    if appdata:
        found.append(Path(appdata) / "npm" / f"{name}.cmd")
    if name == "codex" and local:
        found.append(Path(local) / "Programs" / "OpenAI" / "Codex" / "bin" / "codex.exe")
    if name == "agent" and local:
        root = Path(local) / "cursor-agent"
        found.extend([root / "agent.cmd", root / "agent.exe", root / "cursor-agent.cmd"])
    return found


def _antigravity_paths() -> list[Path]:
    local = os.environ.get("LOCALAPPDATA") or ""
    if not local:
        return []
    root = Path(local) / "Programs"
    return [
        root / "Antigravity" / "Antigravity.exe",
        root / "Antigravity IDE" / "Antigravity IDE.exe",
        root / "Antigravity IDE" / "bin" / "antigravity-ide.cmd",
    ]


def find_binary(engine_id: str) -> str | None:
    if engine_id == "cursor":
        from app.modules.cursor_link.client import cli_path

        return cli_path()
    if engine_id == "antigravity":
        for path in _antigravity_paths():
            if path.is_file():
                return str(path)
        return shutil.which("antigravity-ide") or shutil.which("agy")
    names = {"claude": "claude", "codex": "codex"}.get(engine_id)
    if not names:
        return None
    found = shutil.which(names)
    if found:
        return found
    for path in _home_bins(names):
        if path.is_file():
            return str(path)
    return None


def _sdk(engine_id: str) -> bool:
    module = {"cursor": "cursor_sdk", "claude": "anthropic", "codex": "openai"}.get(engine_id)
    if not module:
        return False
    try:
        return importlib.util.find_spec(module) is not None
    except (ImportError, ValueError):
        return False


def _spawn(args: list[str], timeout: float, stdin: str | None = None, cwd: str | None = None) -> subprocess.CompletedProcess[str]:
    command = list(args)
    if os.name == "nt" and command and command[0].lower().endswith((".cmd", ".bat")):
        command = ["cmd.exe", "/d", "/c", *command]
    flags = _CREATE_NO_WINDOW if os.name == "nt" else 0
    return subprocess.run(
        command,
        input=stdin,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        cwd=cwd,
        check=False,
        creationflags=flags,
    )


def _logged_in(engine_id: str, binary: str | None) -> bool:
    if not binary or engine_id == "antigravity":
        return False
    if engine_id == "cursor":
        from app.modules.cursor_link.client import local_auth

        return bool(local_auth().get("logged_in"))
    try:
        if engine_id == "claude":
            proc = _spawn([binary, "auth", "status"], timeout=8)
            return parse_claude_status(proc.stdout or "")
        if engine_id == "codex":
            proc = _spawn([binary, "login", "status"], timeout=8)
            return parse_codex_status(proc.stdout or "", proc.stderr or "")
    except (subprocess.TimeoutExpired, OSError):
        return False
    return False


def _blank(engine_id: str) -> dict:
    return {
        "id": engine_id,
        "local": False,
        "logged_in": False,
        "sdk": _sdk(engine_id),
        "login_url": None,
    }


def installation(engine_id: str, *, fresh: bool = False) -> dict:
    now = time.time()
    cached = _cache.get(engine_id)
    if cached and not fresh and now - cached[0] < _TTL:
        return dict(cached[1])
    binary = find_binary(engine_id)
    row = _blank(engine_id)
    row["local"] = bool(binary)
    row["logged_in"] = _logged_in(engine_id, binary)
    state = _login_state.get(engine_id) or {}
    row["login_url"] = state.get("url")
    if engine_id == "cursor":
        from app.modules.cursor_link.client import pending_login_url

        row["login_url"] = pending_login_url() or row["login_url"]
    _cache[engine_id] = (now, row)
    return dict(row)


def clear_installation(engine_id: str) -> None:
    _cache.pop(engine_id, None)


def _gui_antigravity() -> str | None:
    for path in _antigravity_paths():
        if path.suffix.lower() == ".exe" and path.is_file():
            return str(path)
    return find_binary("antigravity")


def _open_antigravity() -> dict:
    path = _gui_antigravity()
    if not path:
        raise RuntimeError("O Antigravity não está instalado nesta máquina.")
    flags = (_DETACHED | _NEW_GROUP) if os.name == "nt" else 0
    subprocess.Popen(
        [path],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        close_fds=True,
        creationflags=flags,
    )
    return {"logged_in": False, "url": None, "pending": False, "opened": True, "error": None}


def _read_login(engine_id: str, proc: subprocess.Popen[str]) -> None:
    state = _login_state[engine_id]
    buf = ""
    stream = proc.stdout
    try:
        while stream is not None:
            chunk = stream.read(256)
            if not chunk:
                break
            buf += chunk
            if not state.get("url"):
                match = _URL_RE.search(buf)
                if match:
                    state["url"] = match.group(0)
    except Exception as exc:  # noqa: BLE001
        state["error"] = str(exc)
    code = proc.wait()
    if code not in (0, None) and not state.get("url") and not state.get("error"):
        tail = " ".join(buf.split())[-240:]
        state["error"] = tail or f"O login encerrou com código {code}."


def _wait_url(engine_id: str, seconds: float = 8.0) -> None:
    deadline = time.time() + seconds
    while time.time() < deadline:
        state = _login_state.get(engine_id) or {}
        if state.get("url") or state.get("error"):
            return
        proc = state.get("proc")
        if proc is not None and proc.poll() is not None:
            return
        time.sleep(0.2)


def start_login(engine_id: str) -> dict:
    if engine_id == "cursor":
        from app.modules.cursor_link.client import start_login as cursor_login

        clear_installation(engine_id)
        row = cursor_login()
        row.setdefault("opened", False)
        return row
    if engine_id == "antigravity":
        clear_installation(engine_id)
        return _open_antigravity()
    binary = find_binary(engine_id)
    if not binary:
        nome = "Claude" if engine_id == "claude" else "Codex"
        raise RuntimeError(f"O {nome} não está instalado nesta máquina.")
    if installation(engine_id, fresh=True)["logged_in"]:
        return {"logged_in": True, "url": None, "pending": False, "opened": False, "error": None}
    args = [binary, "auth", "login"] if engine_id == "claude" else [binary, "login"]
    if os.name == "nt" and binary.lower().endswith((".cmd", ".bat")):
        args = ["cmd.exe", "/d", "/c", *args]
    with _login_guard:
        state = _login_state.get(engine_id) or {}
        proc = state.get("proc")
        if proc is None or proc.poll() is not None:
            flags = _CREATE_NO_WINDOW if os.name == "nt" else 0
            child = subprocess.Popen(
                args,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                text=True,
                encoding="utf-8",
                errors="replace",
                creationflags=flags,
            )
            _login_state[engine_id] = {"proc": child, "url": None, "error": None}
            threading.Thread(target=_read_login, args=(engine_id, child), daemon=True).start()
    _wait_url(engine_id)
    clear_installation(engine_id)
    state = _login_state.get(engine_id) or {}
    proc = state.get("proc")
    return {
        "logged_in": False,
        "url": state.get("url"),
        "pending": proc is not None and proc.poll() is None,
        "opened": True,
        "error": None if state.get("url") else state.get("error"),
    }


def local_answer(engine_id: str, prompt: str, model: str) -> str:
    """Resposta curta pelo aplicativo já autenticado. Não altera o projeto."""
    binary = find_binary(engine_id)
    if engine_id == "claude" and binary:
        proc = _spawn(
            [binary, "-p", "--permission-mode", "plan", "--output-format", "text", "--model", model, prompt[:6000]],
            timeout=50,
        )
        text = (proc.stdout or "").strip()
        if proc.returncode != 0 or not text:
            tail = " ".join(f"{proc.stdout}\n{proc.stderr}".split())[-240:]
            raise RuntimeError(tail or "O Claude local não respondeu.")
        return text
    if engine_id == "codex" and binary:
        with tempfile.TemporaryDirectory() as folder:
            out = Path(folder) / "resposta.txt"
            proc = _spawn(
                [binary, "exec", "--sandbox", "read-only", "--skip-git-repo-check", "--model", model, "-o", str(out), "-"],
                timeout=50,
                stdin=prompt[:6000],
                cwd=folder,
            )
            text = out.read_text(encoding="utf-8").strip() if out.is_file() else ""
            if not text:
                text = (proc.stdout or "").strip()
            if proc.returncode != 0 or not text:
                tail = " ".join(f"{proc.stdout}\n{proc.stderr}".split())[-240:]
                raise RuntimeError(tail or "O Codex local não respondeu.")
            return text
    raise RuntimeError("Esse motor ainda não responde pela instalação local. Pluge a chave em Integrações.")
