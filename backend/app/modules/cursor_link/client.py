"""Conector Cursor pela instalação local.

O editor só abre janelas. Quem responde é o Cursor Agent (`agent`),
o mesmo papel do `claude.exe`: login gravado na máquina, modo texto.
A chave de API e o SDK ficam só como reserva.
"""
from __future__ import annotations

import asyncio
import contextlib
import ctypes
import json
import os
import queue
import re
import shutil
import subprocess
import tempfile
import threading
import time
from collections import defaultdict
from collections.abc import Callable
from ctypes import wintypes
from pathlib import Path

CURSOR_MODEL = "composer-2.5"
CURSOR_MODELS = {"auto", "auto-smart", "composer-2.5", "gpt-5", "sonnet-4-thinking"}
_CREATE_NO_WINDOW = 0x08000000
_ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
_URL_RE = re.compile(r"https://cursor\.com/loginDeepControl\?[^\s<>\"'\x1b]+")
_UUID_RE = re.compile(r"uuid=([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})")
_login_lock = threading.Lock()
_login_state: dict = {"proc": None, "url": None, "error": None, "opened": False}


def api_key() -> str:
    return (os.environ.get("CURSOR_API_KEY") or "").strip()


def sdk_available() -> bool:
    try:
        import cursor_sdk  # noqa: F401
    except ImportError:
        return False
    return True


def cli_path() -> str | None:
    """Acha o agente de terminal. Ignora o cursor.exe do editor."""
    found = shutil.which("agent") or shutil.which("cursor-agent")
    if found:
        return found
    home = Path.home()
    local = os.environ.get("LOCALAPPDATA") or ""
    candidates = [
        home / ".local" / "bin" / "agent.exe",
        home / ".local" / "bin" / "agent.cmd",
        home / ".local" / "bin" / "cursor-agent.exe",
        Path(local) / "cursor-agent" / "agent.exe" if local else None,
        Path(local) / "cursor-agent" / "agent.cmd" if local else None,
        Path(local) / "cursor-agent" / "cursor-agent.exe" if local else None,
    ]
    for path in candidates:
        if path is not None and path.is_file():
            return str(path)
    return None


def _parse_auth(stdout: str, stderr: str) -> bool:
    blob = f"{stdout}\n{stderr}".strip()
    lower = blob.lower()
    if "not authenticated" in lower or "not logged" in lower:
        return False
    data: dict = {}
    try:
        parsed = json.loads((stdout or "").strip() or "{}")
        if isinstance(parsed, dict):
            data = parsed
    except json.JSONDecodeError:
        data = {}
    for key in ("authenticated", "loggedIn", "logged_in", "isAuthenticated"):
        if key in data:
            return bool(data[key])
    if data.get("user") or data.get("email") or data.get("account"):
        return True
    return "logged in" in lower or "authenticated" in lower


def local_auth() -> dict:
    path = cli_path()
    if not path:
        return {"local": False, "logged_in": False}
    try:
        proc = _spawn([path, "status", "--format", "json"], timeout=20)
    except (subprocess.TimeoutExpired, OSError):
        return {"local": True, "logged_in": False}
    return {
        "local": True,
        "logged_in": _parse_auth(proc.stdout or "", proc.stderr or ""),
    }


_WIN_CONNECT_JS = """\
"use strict";
const net = require("net");
const orig = net.Socket.prototype.connect;
function localPort() {
  return 18000 + Math.floor(Math.random() * 4000);
}
net.Socket.prototype.connect = function (options, ...rest) {
  if (options && typeof options === "object" && options.localPort == null && !options.path) {
    return orig.call(this, Object.assign({}, options, { localPort: localPort() }), ...rest);
  }
  return orig.call(this, options, ...rest);
};
"""


def _child_env() -> dict[str, str]:
    """No Windows o agente usa o certificado do sistema e uma porta local livre."""
    env = os.environ.copy()
    if os.name != "nt":
        return env
    folder = Path(os.environ.get("LOCALAPPDATA") or str(Path.home())) / "tavir-cursor"
    folder.mkdir(parents=True, exist_ok=True)
    hook = folder / "win-connect.js"
    hook.write_text(_WIN_CONNECT_JS, encoding="utf-8")
    extra = f"--use-system-ca --require {hook}"
    current = env.get("NODE_OPTIONS", "")
    if "--use-system-ca" not in current:
        env["NODE_OPTIONS"] = f"{current} {extra}".strip()
    elif str(hook) not in current:
        env["NODE_OPTIONS"] = f"{current} --require {hook}".strip()
    return env


def cursor_model_id(model: str | None) -> str:
    """Modelo do Cursor. Um id do Ghost não entra no agente local."""
    chosen = (model or "").strip()
    if chosen in CURSOR_MODELS:
        return chosen
    return CURSOR_MODEL


# Ids da tela que o agente local desta instalação não aceita.
# O esforço vira o sufixo do id publicado em `agent --list-models`.
_CURSOR_EFFORT_MODELS = {
    "gpt-5": {
        "low": "gpt-5.2-low",
        "medium": "gpt-5.2",
        "high": "gpt-5.2-high",
        "xhigh": "gpt-5.2-xhigh",
    },
    "sonnet-4-thinking": {
        "low": "claude-sonnet-5-thinking-low",
        "medium": "claude-sonnet-5-thinking-medium",
        "high": "claude-sonnet-5-thinking-high",
        "xhigh": "claude-sonnet-5-thinking-xhigh",
    },
}


def format_cursor_model(model: str | None, effort: str | None) -> str:
    """Traduz o modelo da tela para um id que o agente local aceita."""
    chosen = model if model else CURSOR_MODEL
    level = (effort or "").strip().lower()
    if "[" in chosen:
        return chosen
    if chosen in {"auto", "auto-smart"}:
        # Esta instalação só aceita o id "auto". Cost, Balance e Intelligence são recusados.
        return "auto"
    aliases = {"max": "xhigh", "máximo": "xhigh", "maximo": "xhigh", "alto": "high", "médio": "medium", "medio": "medium", "baixo": "low"}
    level = aliases.get(level, level)
    mapped = _CURSOR_EFFORT_MODELS.get(chosen)
    if mapped:
        return mapped.get(level, mapped["medium"])
    if level not in {"low", "medium", "high", "xhigh"}:
        return chosen
    return f"{chosen}[effort={level}]"


def cli_command(binary: str, workspace: str, model: str) -> list[str]:
    """Modo ask, sem --force. O agente lê o pedido e não altera o projeto.

    O sandbox do Cursor existe só em macOS e Linux. No Windows o modo
    permitido é a allowlist, com --sandbox disabled.
    """
    sandbox = "disabled" if os.name == "nt" else "enabled"
    return [
        binary,
        "-p",
        "--mode",
        "ask",
        "--trust",
        "--output-format",
        "json",
        "--workspace",
        workspace,
        "--sandbox",
        sandbox,
        "--model",
        model,
        "Leia pedido.txt. Responda só com o texto pedido. Não crie arquivo. Não edite arquivo. Não rode comando.",
    ]


def work_command(binary: str, workspace: str, model: str, instruction: str) -> list[str]:
    """Modo agente. Sem --mode ask, a sessão pode editar o workspace e rodar comando.

    --force libera o comando sem pedir confirmação. No Windows o sandbox fica desligado.
    """
    sandbox = "disabled" if os.name == "nt" else "enabled"
    return [
        binary,
        "-p",
        "--force",
        "--trust",
        "--output-format",
        "stream-json",
        "--workspace",
        workspace,
        "--sandbox",
        sandbox,
        "--model",
        model,
        instruction,
    ]


def _spawn(args: list[str], *, timeout: float, cwd: str | None = None) -> subprocess.CompletedProcess[str]:
    if os.name == "nt" and args and args[0].lower().endswith((".cmd", ".bat")):
        args = ["cmd.exe", "/d", "/c", *args]
    flags = _CREATE_NO_WINDOW if os.name == "nt" else 0
    return subprocess.run(
        args,
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        creationflags=flags,
        env=_child_env(),
    )


def status_from_cli_line(line: str) -> str | None:
    """Resume uma linha do agente sem despejar o arquivo gerado."""
    piece = _ANSI_RE.sub("", line or "").strip()
    if not piece:
        return None
    try:
        data = json.loads(piece)
    except json.JSONDecodeError:
        if piece.startswith("{") or len(piece) > 180:
            return None
        return piece
    if not isinstance(data, dict) or "result" in data:
        return None
    kind = str(data.get("type") or data.get("subtype") or data.get("status") or "").strip()
    if not kind:
        return None
    return f"Cursor · {kind}"[:160]


def _extract_text(stdout: str) -> str:
    raw = (stdout or "").strip()
    if not raw:
        return ""
    found = ""
    saw_json = False
    for line in raw.splitlines():
        piece = line.strip()
        if not piece:
            continue
        try:
            data = json.loads(piece)
        except json.JSONDecodeError:
            continue
        if not isinstance(data, dict):
            continue
        saw_json = True
        if data.get("is_error"):
            detail = data.get("result") or data.get("error") or "O Cursor local falhou."
            raise RuntimeError(str(detail))
        result = data.get("result")
        if isinstance(result, str) and result.strip():
            found = result.strip()
    if found:
        return found
    if not saw_json:
        return raw
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return raw
    if isinstance(data, dict) and isinstance(data.get("result"), str):
        return data["result"].strip()
    return raw


# Sem prazo. Pausar encerra a chamada.
TEXT_WAIT_SECONDS: float | None = None


def _timeout_message(seconds: float) -> str:
    whole = int(seconds)
    if whole >= 120 and whole % 60 == 0:
        return f"Timeout na conexão com o Cursor após {whole // 60} minutos."
    return f"Timeout na conexão com o Cursor após {whole} segundos."


def _run_cli(
    binary: str,
    prompt: str,
    model: str,
    effort: str | None = None,
    on_status: Callable[[str], None] | None = None,
    timeout: float | None = TEXT_WAIT_SECONDS,
) -> str:
    chosen = format_cursor_model(model, effort)
    last = "O Cursor local falhou."
    for attempt in range(3):
        try:
            return _run_cli_once(binary, prompt, chosen, on_status=on_status, timeout=timeout)
        except RuntimeError as exc:
            last = str(exc)
            lowered = last.lower()
            retry = (
                "não abriu a conexão" in lowered
                or "não confiou no certificado" in lowered
                or "sendo usado" in lowered
                or "being used" in lowered
                or "winerror 32" in lowered
            )
            if attempt < 2 and retry:
                time.sleep(2.0 * (attempt + 1))
                continue
            raise
    raise RuntimeError(last)


def _file_in_use(exc: BaseException) -> bool:
    if not isinstance(exc, OSError):
        return False
    if getattr(exc, "winerror", None) in {5, 32, 33}:
        return True
    text = str(exc).lower()
    return "sendo usado" in text or "being used" in text


_halt = threading.Event()
_live_lock = threading.Lock()
_live_procs: list[subprocess.Popen[str]] = []
PAUSA_MOTOR = "A esteira foi pausada. A chamada do motor parou."
# O wrapper do Cursor prende o PowerShell em Out-Default. A chamada inteira
# continua sem prazo. Só o comando parado, sem processo de build, é encerrado.
SHELL_IDLE_SECONDS = 90.0
_BUSY_TOOLS = frozenset({
    "dart.exe",
    "dartvm.exe",
    "dartaotruntime.exe",
    "java.exe",
    "gradle.exe",
    "node.exe",
    "npm.exe",
    "python.exe",
    "flutter.exe",
})


def halt_factory_agents() -> int:
    """Encerra só os agentes que a Fábrica abriu. O Cursor do editor continua."""
    _halt.set()
    with _live_lock:
        procs = list(_live_procs)
    for proc in procs:
        _stop_process(proc)
    return len(procs)


def clear_factory_halt() -> None:
    _halt.clear()


def factory_halted() -> bool:
    return _halt.is_set()


def _stop_process(proc: subprocess.Popen[str]) -> None:
    """Encerra o agente e o processo filho que segura a pasta no Windows."""
    if proc.poll() is None:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=_CREATE_NO_WINDOW,
            )
        else:
            proc.kill()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
    stream = proc.stdout
    if stream is not None:
        stream.close()


def _idle_shell_pids(
    nodes: list[tuple[int, int, str, float]],
    root_pid: int,
    state: dict,
    now: float,
    idle_seconds: float = SHELL_IDLE_SECONDS,
) -> list[int]:
    """PowerShell de ferramenta parado debaixo do agente. O lançador fica de fora."""
    by_id = {pid: (parent, name, cpu) for pid, parent, name, cpu in nodes}
    children: dict[int, list[int]] = defaultdict(list)
    for pid, parent, _name, _cpu in nodes:
        children[parent].append(pid)

    def below(pid: int) -> list[int]:
        found: list[int] = []
        stack = list(children.get(pid, []))
        seen: set[int] = set()
        while stack:
            cur = stack.pop()
            if cur in seen or cur not in by_id:
                continue
            seen.add(cur)
            found.append(cur)
            stack.extend(children.get(cur, []))
        return found

    shells: list[int] = []
    for pid in below(root_pid):
        if by_id[pid][1].lower() != "node.exe":
            continue
        for child in below(pid):
            if by_id[child][1].lower() in {"powershell.exe", "pwsh.exe"}:
                shells.append(child)

    tracked: dict[int, dict[str, float]] = state.setdefault("shells", {})
    live = set(shells)
    for pid in list(tracked):
        if pid not in live:
            tracked.pop(pid, None)

    kill: list[int] = []
    for pid in dict.fromkeys(shells):
        tree = [pid, *below(pid)]
        names = {by_id[item][1].lower() for item in tree if item in by_id}
        cpu = sum(by_id[item][2] for item in tree if item in by_id)
        prev = tracked.get(pid)
        if prev is None:
            tracked[pid] = {"since": now, "cpu": cpu}
            continue
        busy = bool(names & _BUSY_TOOLS)
        measured = cpu > 0 or prev["cpu"] <= 0
        if busy or not measured or cpu - prev["cpu"] >= 0.25:
            tracked[pid] = {"since": now, "cpu": max(cpu, prev["cpu"])}
            continue
        if now - prev["since"] >= idle_seconds:
            kill.append(pid)
            tracked.pop(pid, None)
    return kill


def _process_snapshot() -> list[tuple[int, int, str, float]]:
    if os.name != "nt":
        return []
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.CreateToolhelp32Snapshot.argtypes = [wintypes.DWORD, wintypes.DWORD]
    kernel32.CreateToolhelp32Snapshot.restype = ctypes.c_void_p
    kernel32.CloseHandle.argtypes = [ctypes.c_void_p]
    kernel32.CloseHandle.restype = wintypes.BOOL

    class PROCESSENTRY32W(ctypes.Structure):
        _fields_ = [
            ("dwSize", wintypes.DWORD),
            ("cntUsage", wintypes.DWORD),
            ("th32ProcessID", wintypes.DWORD),
            ("th32DefaultHeapID", ctypes.c_void_p),
            ("th32ModuleID", wintypes.DWORD),
            ("cntThreads", wintypes.DWORD),
            ("th32ParentProcessID", wintypes.DWORD),
            ("pcPriClassBase", ctypes.c_long),
            ("dwFlags", wintypes.DWORD),
            ("szExeFile", wintypes.WCHAR * 260),
        ]

    snapshot = kernel32.CreateToolhelp32Snapshot(0x00000002, 0)
    invalid = ctypes.c_void_p(-1).value
    if not snapshot or snapshot == invalid:
        return []
    kernel32.Process32FirstW.argtypes = [ctypes.c_void_p, ctypes.POINTER(PROCESSENTRY32W)]
    kernel32.Process32NextW.argtypes = [ctypes.c_void_p, ctypes.POINTER(PROCESSENTRY32W)]
    kernel32.Process32FirstW.restype = wintypes.BOOL
    kernel32.Process32NextW.restype = wintypes.BOOL
    entry = PROCESSENTRY32W()
    entry.dwSize = ctypes.sizeof(PROCESSENTRY32W)
    rows: list[tuple[int, int, str]] = []
    try:
        if not kernel32.Process32FirstW(snapshot, ctypes.byref(entry)):
            return []
        while True:
            rows.append((int(entry.th32ProcessID), int(entry.th32ParentProcessID), entry.szExeFile))
            if not kernel32.Process32NextW(snapshot, ctypes.byref(entry)):
                break
    finally:
        kernel32.CloseHandle(snapshot)

    class FILETIME(ctypes.Structure):
        _fields_ = [("dwLowDateTime", wintypes.DWORD), ("dwHighDateTime", wintypes.DWORD)]

    kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel32.OpenProcess.restype = ctypes.c_void_p
    kernel32.GetProcessTimes.argtypes = [
        ctypes.c_void_p,
        ctypes.POINTER(FILETIME),
        ctypes.POINTER(FILETIME),
        ctypes.POINTER(FILETIME),
        ctypes.POINTER(FILETIME),
    ]
    kernel32.CloseHandle.argtypes = [ctypes.c_void_p]

    def cpu_of(pid: int) -> float:
        handle = kernel32.OpenProcess(0x1000, False, pid)
        if not handle:
            return 0.0
        created, exited, kernel, user = FILETIME(), FILETIME(), FILETIME(), FILETIME()
        try:
            if not kernel32.GetProcessTimes(
                handle, ctypes.byref(created), ctypes.byref(exited), ctypes.byref(kernel), ctypes.byref(user)
            ):
                return 0.0

            def ticks(stamp: FILETIME) -> int:
                return (int(stamp.dwHighDateTime) << 32) + int(stamp.dwLowDateTime)

            return (ticks(kernel) + ticks(user)) / 10_000_000
        finally:
            kernel32.CloseHandle(handle)

    return [(pid, parent, name, cpu_of(pid)) for pid, parent, name in rows]


def _release_idle_shells(
    root_pid: int,
    state: dict,
    now: float,
    on_status: Callable[[str], None] | None,
) -> None:
    stale = _idle_shell_pids(_process_snapshot(), root_pid, state, now)
    for pid in stale:
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=_CREATE_NO_WINDOW,
            )
        if on_status:
            on_status("Encerrei um comando do agente que ficou parado. A sessão de código continua.")


@contextlib.contextmanager
def _scratch_dir():
    """Pasta do pedido. A limpeza no Windows não cancela a resposta já recebida."""
    folder = tempfile.mkdtemp(prefix="tavir-cursor-")
    try:
        yield folder
    finally:
        for attempt in range(6):
            try:
                shutil.rmtree(folder)
                break
            except OSError as exc:
                if attempt == 5 or not _file_in_use(exc):
                    break
                time.sleep(0.2 * (attempt + 1))


def _stream_cli(
    args: list[str],
    *,
    timeout: float | None,
    cwd: str | None,
    on_status: Callable[[str], None] | None,
) -> subprocess.CompletedProcess[str]:
    """Lê a saída enquanto o agente responde, em vez de esperar o processo inteiro."""
    if os.name == "nt" and args and args[0].lower().endswith((".cmd", ".bat")):
        args = ["cmd.exe", "/d", "/c", *args]
    flags = _CREATE_NO_WINDOW if os.name == "nt" else 0
    proc = subprocess.Popen(
        args,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        text=True,
        encoding="utf-8",
        errors="replace",
        creationflags=flags,
        env=_child_env(),
    )
    with _live_lock:
        _live_procs.append(proc)
    lines: queue.Queue[str | None] = queue.Queue()

    def _read() -> None:
        stream = proc.stdout
        try:
            while stream is not None:
                line = stream.readline()
                if not line:
                    break
                lines.put(line)
        finally:
            lines.put(None)

    threading.Thread(target=_read, daemon=True).start()
    collected: list[str] = []
    deadline = None if timeout is None else time.time() + timeout
    shell_state: dict = {}
    last_shell_sweep = 0.0
    try:
        while True:
            now = time.time()
            if now - last_shell_sweep >= 20:
                last_shell_sweep = now
                try:
                    _release_idle_shells(proc.pid, shell_state, now, on_status)
                except OSError:
                    pass
            if _halt.is_set():
                raise RuntimeError(PAUSA_MOTOR)
            if deadline is None:
                wait = 8.0
            else:
                remaining = deadline - time.time()
                if remaining <= 0:
                    raise subprocess.TimeoutExpired(args, timeout)
                wait = min(8.0, remaining)
            try:
                line = lines.get(timeout=wait)
            except queue.Empty:
                continue
            if line is None:
                break
            collected.append(line)
            note = status_from_cli_line(line)
            if note and on_status:
                on_status(note)
        code = proc.wait(timeout=5)
        output = "".join(collected)
        return subprocess.CompletedProcess(args, code, stdout=output, stderr="")
    finally:
        with _live_lock:
            if proc in _live_procs:
                _live_procs.remove(proc)
        if proc.poll() is None:
            _stop_process(proc)
        elif proc.stdout is not None:
            proc.stdout.close()


def _raise_cli_failure(proc: subprocess.CompletedProcess[str]) -> None:
    if proc.returncode == 0:
        return
    detail = (proc.stderr or proc.stdout or "").strip()
    lowered = detail.lower()
    if "not authenticated" in lowered or "not logged" in lowered or "agent login" in lowered:
        raise RuntimeError(
            "O Cursor está ligado, mas falta o login. Em Integrações, use Entrar no Cursor."
        )
    if "cannot use this model" in lowered or "available models:" in lowered:
        raise RuntimeError("O Cursor não aceitou esse modelo. Em Configurações do projeto, escolha Auto ou Composer.")
    if "self-signed certificate" in lowered:
        raise RuntimeError("O Cursor não confiou no certificado desta máquina. A entrega não saiu.")
    if "eaddrinuse" in lowered or "[internal]" in lowered:
        raise RuntimeError("O Cursor não abriu a conexão nesta tentativa. A entrega não saiu.")
    tail = detail[-240:] if detail else f"o agente encerrou com código {proc.returncode}"
    raise RuntimeError(f"O Cursor local falhou. {tail}")


def _run_cli_once(
    binary: str,
    prompt: str,
    chosen: str,
    on_status: Callable[[str], None] | None = None,
    timeout: float | None = TEXT_WAIT_SECONDS,
) -> str:
    with _scratch_dir() as folder:
        Path(folder, "pedido.txt").write_text(prompt, encoding="utf-8")
        try:
            proc = _stream_cli(
                cli_command(binary, folder, chosen),
                timeout=None if timeout is None else max(30.0, float(timeout) - 10.0),
                cwd=folder,
                on_status=on_status,
            )
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError(_timeout_message(timeout or 0)) from exc
    _raise_cli_failure(proc)
    text = _extract_text(proc.stdout or "")
    if not text:
        raise RuntimeError("O Cursor devolveu uma resposta vazia.")
    return text


def run_in_workspace(
    binary: str,
    workspace: str,
    model: str,
    effort: str | None,
    prompt: str,
    on_status: Callable[[str], None] | None = None,
) -> str:
    """Executa o agente dentro do projeto, com escrita e comando."""
    chosen = format_cursor_model(model, effort)
    folder = Path(workspace)
    order = folder / "qa" / "orders" / "pedido-atual.md"
    order.parent.mkdir(parents=True, exist_ok=True)
    order.write_text(prompt, encoding="utf-8")
    instruction = (
        "Leia qa/orders/pedido-atual.md e faça o que ele pede. "
        "Você pode criar arquivo, editar arquivo e rodar comando neste workspace. "
        "Não faça deploy. Não faça push."
    )
    proc = _stream_cli(
        work_command(binary, str(folder), chosen, instruction),
        timeout=None,
        cwd=str(folder),
        on_status=on_status,
    )
    _raise_cli_failure(proc)
    return _extract_text(proc.stdout or "")


async def is_enabled() -> bool:
    from app.models.integration_pref import IntegrationPref
    from app.shared.database import async_session

    async with async_session() as session:
        row = await session.get(IntegrationPref, "cursor")
        return bool(row and row.enabled)


async def set_enabled(enabled: bool) -> None:
    from app.models.integration_pref import IntegrationPref
    from app.shared.database import async_session

    async with async_session() as session:
        row = await session.get(IntegrationPref, "cursor")
        if row is None:
            session.add(IntegrationPref(id="cursor", enabled=enabled))
        else:
            row.enabled = enabled
        await session.commit()


async def status() -> dict:
    enabled = await is_enabled()
    auth = await asyncio.to_thread(local_auth)
    has_key = bool(api_key())
    logged_in = bool(auth["logged_in"])
    local = bool(auth["local"])
    configured = (local and (logged_in or has_key)) or (sdk_available() and has_key)
    return {
        "integration": "cursor",
        "enabled": enabled,
        "configured": configured,
        "local": local,
        "logged_in": logged_in,
        "sdk": sdk_available(),
        "model": CURSOR_MODEL,
        "login_url": None if logged_in else _login_state.get("url"),
    }


def extract_login_url(blob: str) -> str | None:
    """Aceita o link só quando o último parâmetro chegou por inteiro."""
    clean = _ANSI_RE.sub("", blob or "").replace("\r", "").replace("\n", "")
    marker = "supportsSelectedTeamLogin=true"
    start = clean.find("https://cursor.com/loginDeepControl?")
    end = clean.find(marker)
    if start < 0 or end < start:
        return None
    url = clean[start : end + len(marker)]
    if not _UUID_RE.search(url):
        return None
    return url


def _read_login(proc: subprocess.Popen[str]) -> None:
    buf = ""
    stream = proc.stdout
    try:
        while stream is not None:
            chunk = stream.read(128)
            if not chunk:
                break
            buf += chunk
            if len(buf) > 12000:
                buf = buf[-6000:]
            if not _login_state["url"]:
                url = extract_login_url(buf)
                if url:
                    _login_state["url"] = url
    except Exception as exc:  # noqa: BLE001
        _login_state["error"] = str(exc)
    code = proc.wait()
    if code != 0 and not _login_state["url"] and not _login_state["error"]:
        tail = " ".join(buf.split())[-240:]
        _login_state["error"] = tail or f"O login do Cursor encerrou com código {code}."


def _wait_login(seconds: float = 12.0) -> None:
    deadline = time.time() + seconds
    while time.time() < deadline:
        if _login_state["url"] or _login_state["error"]:
            return
        proc = _login_state["proc"]
        if proc is not None and proc.poll() is not None:
            return
        time.sleep(0.2)


def start_login() -> dict:
    """Sobe `agent login` e devolve o link. O processo fica vivo até a pessoa autorizar."""
    auth = local_auth()
    if auth["logged_in"]:
        return {"logged_in": True, "url": None, "pending": False, "error": None}
    path = cli_path()
    if not path:
        raise RuntimeError("O Cursor Agent não está instalado nesta máquina.")
    if not auth["local"]:
        raise RuntimeError("O Cursor Agent não está instalado nesta máquina.")
    with _login_lock:
        proc = _login_state["proc"]
        if proc is None or proc.poll() is not None:
            env = _child_env()
            env.pop("NO_OPEN_BROWSER", None)
            args = [path, "login"]
            if os.name == "nt" and path.lower().endswith((".cmd", ".bat")):
                args = ["cmd.exe", "/d", "/c", *args]
            flags = _CREATE_NO_WINDOW if os.name == "nt" else 0
            child = subprocess.Popen(
                args,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=env,
                creationflags=flags,
            )
            _login_state["proc"] = child
            _login_state["url"] = None
            _login_state["error"] = None
            _login_state["opened"] = False
            threading.Thread(target=_read_login, args=(child,), daemon=True).start()
    _wait_login()
    proc = _login_state["proc"]
    pending = proc is not None and proc.poll() is None
    return {
        "logged_in": False,
        "url": _login_state["url"],
        "pending": pending,
        "error": None if _login_state["url"] else _login_state["error"],
    }


async def complete_text(
    *,
    system: str | None,
    messages: list[dict[str, str]],
    model: str | None,
    effort: str | None = None,
    on_status: Callable[[str], None] | None = None,
    timeout: float | None = TEXT_WAIT_SECONDS,
) -> str:
    prompt_parts = [
        "Responda só com o texto pedido.",
        "Não crie arquivo. Não edite arquivo. Não rode comando.",
    ]
    if system:
        prompt_parts.append(system)
    for message in messages:
        role = message.get("role") or "user"
        prompt_parts.append(f"{role}: {message.get('content') or ''}")
    prompt = "\n\n".join(prompt_parts)
    chosen = cursor_model_id(model)
    binary = cli_path()
    if binary:
        auth = await asyncio.to_thread(local_auth)
        if not auth["logged_in"] and not api_key():
            raise RuntimeError(
                "O Cursor está ligado, mas falta o login. Em Integrações, use Entrar no Cursor."
            )
        work = asyncio.to_thread(_run_cli, binary, prompt, chosen, effort, on_status, timeout)
        if timeout is None:
            return await work
        try:
            return await asyncio.wait_for(work, timeout=timeout)
        except asyncio.TimeoutError as exc:
            raise RuntimeError(_timeout_message(timeout)) from exc
    if api_key() and sdk_available():
        return await _complete_with_sdk(prompt, chosen, timeout)
    raise RuntimeError(
        "O editor Cursor está instalado, mas o agente de terminal não. "
        "Instale o Cursor Agent. Ele usa o login local, como o claude.exe."
    )


async def _complete_with_sdk(prompt: str, model: str, timeout: float | None) -> str:
    def _run() -> str:
        from cursor_sdk import Agent, AgentOptions, LocalAgentOptions

        with _scratch_dir() as folder:
            result = Agent.prompt(
                prompt,
                AgentOptions(
                    api_key=api_key(),
                    model=model,
                    local=LocalAgentOptions(cwd=folder),
                ),
            )
        if getattr(result, "status", "") == "error":
            raise RuntimeError("O agente Cursor executou e falhou.")
        text = (getattr(result, "result", None) or "").strip()
        if not text:
            raise RuntimeError("O Cursor devolveu uma resposta vazia.")
        return text

    work = asyncio.to_thread(_run)
    if timeout is None:
        return await work
    try:
        return await asyncio.wait_for(work, timeout=timeout)
    except asyncio.TimeoutError as exc:
        raise RuntimeError(_timeout_message(timeout)) from exc
