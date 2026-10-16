#!/usr/bin/env python3
"""Coleta controlada de um perfil do Instagram com gallery-dl."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import webbrowser
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse


CATEGORIES = {
    "posts": "Imagens",
    "reels": "Reels",
    "stories": "Stories",
    "highlights": "Destaques",
    "info": "Perfil",
    "avatar": "Perfil",
}

LOGIN_URL = "https://www.instagram.com/accounts/login/"
LOGIN_REQUIRED_EXIT = 3
COLLECTION_ACTIVE_EXIT = 5


def pid_is_active(pid: object) -> bool:
    try:
        value = int(pid)
        if value <= 0:
            return False
        os.kill(value, 0)
        return True
    except PermissionError:
        return True
    except (OSError, TypeError, ValueError):
        return False


def acquire_collection_lock(control: Path, username: str, run_id: str) -> tuple[Path, dict[str, object]]:
    """Impede duas coletas simultâneas do mesmo perfil.

    O PID do subprocesso também fica no lock: se o invólucro for interrompido
    por timeout, uma nova execução não colide com o gallery-dl ainda vivo.
    """
    lock_path = control / ".collection.lock"
    state: dict[str, object] = {
        "schema": "instagram-collection-lock/v1",
        "profile": username,
        "run_id": run_id,
        "owner_pid": os.getpid(),
        "child_pid": None,
        "started_at": datetime.now().astimezone().isoformat(timespec="seconds"),
    }
    for _ in range(2):
        try:
            descriptor = os.open(lock_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL)
            with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
                json.dump(state, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
            return lock_path, state
        except FileExistsError:
            try:
                current = json.loads(lock_path.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                current = {}
            active_pid = next(
                (pid for pid in (current.get("child_pid"), current.get("owner_pid")) if pid_is_active(pid)),
                None,
            )
            if active_pid:
                raise RuntimeError(
                    f"COLETA_EM_ANDAMENTO: @{username}, PID {active_pid}, "
                    f"execução {current.get('run_id') or 'desconhecida'}. "
                    "Não inicie outra instância; acompanhe a atual ou aguarde seu término."
                ) from None
            lock_path.unlink(missing_ok=True)
    raise RuntimeError("Não foi possível adquirir o lock da coleta.")


def update_collection_lock(lock_path: Path, state: dict[str, object], child_pid: int | None) -> None:
    state["child_pid"] = child_pid
    lock_path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def release_collection_lock(lock_path: Path, state: dict[str, object]) -> None:
    try:
        current = json.loads(lock_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return
    if pid_is_active(current.get("child_pid")):
        return
    if current.get("run_id") == state.get("run_id") and current.get("owner_pid") == os.getpid():
        lock_path.unlink(missing_ok=True)


def run_gallery_process(
    command: list[str], log_path: Path, category: str, lock_path: Path, lock_state: dict[str, object]
) -> int:
    """Executa com heartbeat e log em disco, sem acumular a saída inteira em memória."""
    started = time.monotonic()
    creationflags = 0x08000000 if os.name == "nt" else 0
    with log_path.open("w", encoding="utf-8", errors="replace") as log_handle:
        process = subprocess.Popen(
            command,
            stdout=log_handle,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            creationflags=creationflags,
        )
        update_collection_lock(lock_path, lock_state, process.pid)
        last_heartbeat = started
        while process.poll() is None:
            time.sleep(2)
            now = time.monotonic()
            if now - last_heartbeat >= 30:
                print(
                    f"[{category}] coleta ativa há {int(now - started)}s; PID {process.pid}; "
                    f"log: {log_path}",
                    flush=True,
                )
                last_heartbeat = now
        update_collection_lock(lock_path, lock_state, None)
        return int(process.returncode or 0)


def parse_profile(url: str) -> str:
    parsed = urlparse(url if "://" in url else f"https://{url}")
    host = parsed.netloc.lower().split(":", 1)[0]
    if host not in {"instagram.com", "www.instagram.com"}:
        raise ValueError("Use uma URL de perfil em instagram.com.")
    parts = [part for part in parsed.path.split("/") if part]
    if not parts or parts[0] in {"p", "reel", "reels", "stories", "explore"}:
        raise ValueError("A URL deve apontar para um perfil, não para uma publicação isolada.")
    username = parts[0].lstrip("@").lower()
    if not re.fullmatch(r"[a-z0-9._]{1,30}", username):
        raise ValueError("Não foi possível extrair um nome de perfil válido da URL.")
    return username


def gallery_command() -> list[str] | None:
    executable = shutil.which("gallery-dl")
    if executable:
        return [executable]
    probe = subprocess.run(
        [sys.executable, "-c", "import gallery_dl"],
        capture_output=True,
        text=True,
    )
    if probe.returncode == 0:
        return [sys.executable, "-m", "gallery_dl"]
    return None


def browser_spec(browser: str, profile: str | None) -> str:
    spec = f"{browser}/instagram.com"
    if profile:
        spec += f":{profile}"
    return spec


def instagram_session_status(browser: str, profile: str | None) -> tuple[bool, str]:
    """Confere apenas a presença de sessionid válido; nunca expõe seu valor."""
    try:
        from gallery_dl.cookies import load_cookies
    except ImportError:
        return False, "gallery-dl não está disponível no ambiente Python"
    try:
        cookies = load_cookies((browser, profile, None, None, "instagram.com"))
    except Exception as exc:
        return False, f"não foi possível ler os cookies do {browser}: {exc}"
    now = int(time.time())
    for cookie in cookies:
        if cookie.name != "sessionid" or not cookie.value:
            continue
        if cookie.expires is not None and cookie.expires <= now:
            return False, "a sessão encontrada está expirada"
        return True, "sessão autenticada encontrada"
    return False, "cookie de sessão do Instagram não encontrado"


def browser_executable(browser: str) -> str | None:
    if sys.platform != "win32":
        return shutil.which(browser)
    local = os.environ.get("LOCALAPPDATA", "")
    program_files = os.environ.get("ProgramFiles", "")
    program_files_x86 = os.environ.get("ProgramFiles(x86)", "")
    candidates: dict[str, list[str]] = {
        "chrome": [
            str(Path(local) / "Google/Chrome/Application/chrome.exe"),
            str(Path(program_files) / "Google/Chrome/Application/chrome.exe"),
            str(Path(program_files_x86) / "Google/Chrome/Application/chrome.exe"),
        ],
        "edge": [
            str(Path(program_files_x86) / "Microsoft/Edge/Application/msedge.exe"),
            str(Path(program_files) / "Microsoft/Edge/Application/msedge.exe"),
        ],
        "brave": [
            str(Path(local) / "BraveSoftware/Brave-Browser/Application/brave.exe"),
            str(Path(program_files) / "BraveSoftware/Brave-Browser/Application/brave.exe"),
        ],
    }
    for candidate in candidates.get(browser.lower(), []):
        if candidate and Path(candidate).is_file():
            return candidate
    return shutil.which(browser)


def open_login_page(browser: str, profile: str | None) -> bool:
    executable = browser_executable(browser)
    try:
        if executable:
            command = [executable]
            # Abrir no mesmo diretório de perfil que o gallery-dl consulta evita
            # que o Chrome escolha o último perfil usado (ou o Default).
            if profile and browser.lower() == "chrome":
                command.append(f"--profile-directory={profile}")
            command.append(LOGIN_URL)
            subprocess.Popen(
                command,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            return True
        return webbrowser.open(LOGIN_URL, new=2)
    except OSError:
        return False


def ensure_instagram_login(
    browser: str,
    profile: str | None,
    open_login: bool,
) -> bool:
    for attempt in range(2):
        authenticated, detail = instagram_session_status(browser, profile)
        if authenticated:
            print(f"Autenticação: {detail} no {browser}.")
            return True

        print(f"LOGIN_REQUIRED: {detail}.", file=sys.stderr)
        if open_login:
            opened = open_login_page(browser, profile)
            if opened:
                print(
                    "Abri a página de login do Instagram. Faça o login no navegador; "
                    "a senha não será solicitada nem armazenada por esta ferramenta.",
                    file=sys.stderr,
                )
            else:
                print(f"Abra manualmente: {LOGIN_URL}", file=sys.stderr)

        if not sys.stdin.isatty():
            print(
                "A coleta foi pausada. A Íris deve pedir que você conclua o login e, "
                "depois da sua confirmação, executar novamente o mesmo comando.",
                file=sys.stderr,
            )
            return False
        if attempt == 0:
            try:
                input("Conclua o login no navegador e pressione ENTER para verificar novamente: ")
            except EOFError:
                print(
                    "A coleta foi pausada. A Íris deve pedir que você conclua o login e, "
                    "depois da sua confirmação, executar novamente o mesmo comando.",
                    file=sys.stderr,
                )
                return False

    print("O login ainda não foi detectado; a coleta não será iniciada.", file=sys.stderr)
    return False


def build_command(
    base: list[str],
    url: str,
    category: str,
    destination: Path,
    archive: Path,
    browser: str,
    browser_profile: str | None,
    max_posts: int | None,
) -> list[str]:
    command = [
        *base,
        "--config-ignore",
        "--no-input",
        "--cookies-from-browser",
        browser_spec(browser, browser_profile),
        "--windows-filenames",
        "--write-metadata",
        "--write-info-json",
        "--download-archive",
        str(archive),
        "--directory",
        str(destination),
        "--option",
        f"extractor.instagram.include={category}",
        "--option",
        "extractor.instagram.sleep-request=6.0-12.0",
        "--option",
        "extractor.instagram.videos=true",
        "--option",
        "extractor.instagram.audio=true",
    ]
    if max_posts is not None and category in {"posts", "reels"}:
        command.extend(["--option", f"extractor.instagram.max-posts={max_posts}"])
    command.append(url)
    return command


def safe_command(command: list[str]) -> str:
    return subprocess.list2cmdline(command)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", help="URL de um perfil do Instagram")
    parser.add_argument(
        "--workspace",
        type=Path,
        default=Path("analise-instagram/perfis"),
        help="raiz local dos perfis (padrão: analise-instagram/perfis)",
    )
    parser.add_argument("--browser", default="chrome", help="browser com sessão autenticada")
    parser.add_argument(
        "--browser-profile",
        default="Profile 5",
        help="diretório do perfil Chrome (padrão: Profile 5, conta TAVIR)",
    )
    parser.add_argument("--max-posts", type=int, help="limite amostral para posts e Reels")
    parser.add_argument(
        "--include",
        default="posts,reels,stories,highlights,info,avatar",
        help="categorias separadas por vírgula",
    )
    parser.add_argument("--dry-run", action="store_true", help="cria a estrutura e mostra comandos")
    parser.add_argument(
        "--no-open-login",
        action="store_true",
        help="não abre a página de login quando a sessão não é encontrada",
    )
    parser.add_argument(
        "--skip-login-check",
        action="store_true",
        help=argparse.SUPPRESS,
    )
    args = parser.parse_args()

    try:
        username = parse_profile(args.url)
    except ValueError as exc:
        parser.error(str(exc))

    requested = [item.strip() for item in args.include.split(",") if item.strip()]
    invalid = sorted(set(requested) - set(CATEGORIES))
    if invalid:
        parser.error(f"categorias inválidas: {', '.join(invalid)}")
    if args.max_posts is not None and args.max_posts < 1:
        parser.error("--max-posts deve ser maior que zero")

    profile_root = args.workspace.resolve() / username
    control = profile_root / "controle"
    logs = control / "logs"
    manifest_dir = control / "manifestos"
    for folder in set(CATEGORIES.values()):
        (profile_root / folder).mkdir(parents=True, exist_ok=True)
    for folder in (logs, manifest_dir, profile_root / "processado", profile_root / "relatorios"):
        folder.mkdir(parents=True, exist_ok=True)

    base = gallery_command()
    if base is None and not args.dry_run:
        print(
            "gallery-dl não está instalado. Rode: "
            f'"{sys.executable}" -m pip install -r '
            ".agents/skills/instagram-profile-audit/scripts/requirements.txt",
            file=sys.stderr,
        )
        return 2
    base = base or ["gallery-dl"]

    if not args.skip_login_check and not ensure_instagram_login(
        args.browser,
        args.browser_profile,
        not args.no_open_login,
    ):
        return LOGIN_REQUIRED_EXIT

    timestamp = datetime.now().astimezone().isoformat(timespec="seconds")
    run_id = datetime.now().strftime("%Y%m%d-%H%M%S")
    results: list[dict[str, object]] = []

    lock_path: Path | None = None
    lock_state: dict[str, object] | None = None
    if not args.dry_run:
        try:
            lock_path, lock_state = acquire_collection_lock(control, username, run_id)
        except RuntimeError as exc:
            print(str(exc), file=sys.stderr)
            return COLLECTION_ACTIVE_EXIT

    try:
        print(f"Perfil: @{username}")
        print(f"Destino: {profile_root}")
        for category in requested:
            destination = profile_root / CATEGORIES[category]
            # Reels também podem aparecer em posts. Arquivos de archive separados
            # preservam a organização por categoria em vez de o primeiro passe
            # impedir o segundo download.
            archive = control / f"gallery-dl-archive-{category}.txt"
            command = build_command(
                base,
                args.url,
                category,
                destination,
                archive,
                args.browser,
                args.browser_profile,
                args.max_posts,
            )
            log_path = logs / f"{run_id}-{category}.log"
            print(f"[{category}] {safe_command(command)}")
            if args.dry_run:
                results.append({"categoria": category, "status": "dry-run", "destino": str(destination)})
                continue
            assert lock_path is not None and lock_state is not None
            return_code = run_gallery_process(command, log_path, category, lock_path, lock_state)
            status = "ok" if return_code == 0 else "erro"
            results.append(
                {
                    "categoria": category,
                    "status": status,
                    "codigo_saida": return_code,
                    "destino": str(destination),
                    "log": str(log_path),
                }
            )
            print(f"  -> {status}; log: {log_path}")
    finally:
        if lock_path is not None and lock_state is not None:
            release_collection_lock(lock_path, lock_state)

    manifest = {
        "schema": "instagram-collection-manifest/v2",
        "perfil": username,
        "url": args.url,
        "coletado_em": timestamp,
        "dry_run": args.dry_run,
        "browser": args.browser,
        "browser_profile": args.browser_profile,
        "max_posts": args.max_posts,
        "requests": {
            "rapidapi_total": 0,
            "rapidapi_note": "esta rota usou Chrome/gallery-dl e não consumiu Requests da RapidAPI",
            "instagram_http": "não mensurado: gallery-dl não expõe contador confiável por execução",
        },
        "resultados": results,
        "observacao": (
            "Status ok significa que o extrator terminou sem erro; não garante que a categoria "
            "tinha conteúdo visível. Conferir arquivos e logs antes de declarar cobertura."
        ),
    }
    manifest_path = manifest_dir / f"coleta-{run_id}.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Manifesto: {manifest_path}")

    failures = [item for item in results if item["status"] == "erro"]
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
