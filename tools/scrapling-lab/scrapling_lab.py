"""Executor controlado do Scrapling para pesquisa interna da TAVIR.

O pacote completo permanece disponível no venv, mas este módulo é o caminho operacional padrão.
Ele não aceita cookies, credenciais, CDP, perfil real, proxy ou métodos HTTP mutáveis.
"""

from __future__ import annotations

import argparse
import hashlib
import ipaddress
import json
import os
import re
import socket
import sys
import tempfile
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from importlib import metadata
from pathlib import Path
from typing import Any, Callable, Iterable, Sequence
from urllib.parse import urljoin, urlsplit, urlunsplit


PROJECT_DIR = Path(__file__).resolve().parent
DATA_DIR = PROJECT_DIR / "data"
LOG_DIR = PROJECT_DIR / "logs"
BROWSERS_DIR = PROJECT_DIR / ".runtime" / "browsers"
MAX_ALLOWED_BYTES = 10 * 1024 * 1024
SAFE_BROWSER_SCHEMES = frozenset({"about", "blob", "data"})
OUTPUT_NAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$")
REDIRECT_CODES = frozenset({301, 302, 303, 307, 308})


@dataclass(frozen=True)
class LabError(Exception):
    code: str
    message: str
    effect: str
    action: str
    retryable: bool = False

    def __str__(self) -> str:
        return f"{self.code}: {self.message}"


def _normalize_domain(value: str) -> str:
    candidate = value.strip().rstrip(".").lower()
    if not candidate or "://" in candidate or "/" in candidate or "@" in candidate:
        raise LabError(
            "STL-CONFIG-001",
            f"Domínio inválido na allowlist: {value!r}.",
            "Nenhuma requisição foi realizada.",
            "Informe apenas o hostname, por exemplo example.com.",
        )
    try:
        return candidate.encode("idna").decode("ascii")
    except UnicodeError as exc:
        raise LabError(
            "STL-CONFIG-001",
            f"Domínio inválido na allowlist: {value!r}.",
            "Nenhuma requisição foi realizada.",
            "Revise o hostname informado.",
        ) from exc


def normalize_allow_domains(values: Iterable[str]) -> tuple[str, ...]:
    domains = tuple(dict.fromkeys(_normalize_domain(value) for value in values))
    if not domains:
        raise LabError(
            "STL-CONFIG-002",
            "A execução exige pelo menos um domínio permitido.",
            "Nenhuma requisição foi realizada.",
            "Use --allow-domain para declarar o alvo e os CDNs estritamente necessários.",
        )
    return domains


def domain_is_allowed(hostname: str, allow_domains: Sequence[str]) -> bool:
    host = hostname.rstrip(".").lower().encode("idna").decode("ascii")
    return any(host == domain or host.endswith(f".{domain}") for domain in allow_domains)


def _public_ip_or_error(value: str, hostname: str) -> str:
    try:
        address = ipaddress.ip_address(value.split("%", 1)[0])
    except ValueError as exc:
        raise LabError(
            "STL-DNS-002",
            f"A resolução de {hostname} retornou um endereço inválido.",
            "Nenhuma requisição foi realizada para esse destino.",
            "Revise o DNS do domínio antes de tentar novamente.",
        ) from exc
    if not address.is_global:
        raise LabError(
            "STL-URL-003",
            f"O destino {hostname} resolve para endereço não público ({address}).",
            "A requisição foi bloqueada antes da conexão.",
            "Use somente destinos públicos. Rede local exige outro ambiente e autorização específica.",
        )
    return str(address)


def resolve_public_ips(hostname: str, port: int) -> tuple[str, ...]:
    try:
        literal = ipaddress.ip_address(hostname.split("%", 1)[0])
    except ValueError:
        literal = None
    if literal is not None:
        return (_public_ip_or_error(str(literal), hostname),)

    try:
        answers = socket.getaddrinfo(hostname, port, type=socket.SOCK_STREAM)
    except OSError as exc:
        raise LabError(
            "STL-DNS-001",
            f"Não foi possível resolver o domínio {hostname}.",
            "Nenhuma requisição foi realizada.",
            "Confirme o domínio e a conexão; depois tente novamente.",
            retryable=True,
        ) from exc

    addresses = tuple(dict.fromkeys(answer[4][0] for answer in answers if answer[4]))
    if not addresses:
        raise LabError(
            "STL-DNS-001",
            f"O domínio {hostname} não retornou endereço utilizável.",
            "Nenhuma requisição foi realizada.",
            "Confirme o DNS do domínio; depois tente novamente.",
            retryable=True,
        )
    return tuple(_public_ip_or_error(address, hostname) for address in addresses)


def validate_network_url(url: str, allow_domains: Sequence[str]) -> tuple[str, tuple[str, ...]]:
    try:
        parsed = urlsplit(url)
        port = parsed.port or (443 if parsed.scheme.lower() == "https" else 80)
    except ValueError as exc:
        raise LabError(
            "STL-URL-001",
            "A URL possui porta ou estrutura inválida.",
            "Nenhuma requisição foi realizada.",
            "Use uma URL HTTP ou HTTPS completa e válida.",
        ) from exc

    scheme = parsed.scheme.lower()
    if scheme not in {"http", "https"} or not parsed.hostname:
        raise LabError(
            "STL-URL-001",
            "Somente URLs HTTP ou HTTPS completas são aceitas.",
            "Nenhuma requisição foi realizada.",
            "Informe uma URL iniciada por https:// ou http://.",
        )
    if parsed.username is not None or parsed.password is not None:
        raise LabError(
            "STL-URL-004",
            "Credenciais embutidas na URL não são aceitas.",
            "Nenhuma requisição foi realizada e a credencial não foi registrada.",
            "Use uma fonte pública ou abra outro fluxo formalmente autorizado.",
        )

    hostname = parsed.hostname.rstrip(".").lower().encode("idna").decode("ascii")
    if not domain_is_allowed(hostname, allow_domains):
        raise LabError(
            "STL-URL-002",
            f"O domínio {hostname} não está na allowlist desta execução.",
            "A requisição foi bloqueada antes da conexão.",
            "Inclua o domínio explicitamente somente se ele fizer parte do escopo aprovado.",
        )
    return hostname, resolve_public_ips(hostname, port)


def redact_url(url: str) -> str:
    try:
        parsed = urlsplit(url)
        host = parsed.hostname or ""
        if parsed.port:
            host = f"{host}:{parsed.port}"
        return urlunsplit((parsed.scheme, host, parsed.path or "/", "", ""))
    except (TypeError, ValueError):
        return "<invalid-url>"


def validate_output_name(value: str | None, url: str) -> str:
    if value is None:
        parsed = urlsplit(url)
        base = re.sub(r"[^A-Za-z0-9._-]+", "-", f"{parsed.hostname}{parsed.path}").strip("-.")
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        value = f"{base[:80] or 'coleta'}-{stamp}.md"
    if not OUTPUT_NAME_PATTERN.fullmatch(value) or value in {".", ".."}:
        raise LabError(
            "STL-OUTPUT-001",
            "O nome da saída é inválido.",
            "Nenhum arquivo de saída foi criado.",
            "Use somente letras, números, ponto, hífen ou sublinhado, sem diretórios.",
        )
    if not value.lower().endswith(".md"):
        value = f"{value}.md"
    return value


def validate_execution_policy(mode: str, ack_yellow: bool) -> None:
    if mode == "stealthy" and not ack_yellow:
        raise LabError(
            "STL-POLICY-001",
            "O modo stealthy pertence à zona amarela e exige aceite explícito.",
            "Nenhum navegador foi iniciado e nenhuma requisição foi realizada.",
            "Confirme que o alvo é público/autorizado e repita com --ack-yellow.",
        )


def _route_request_guard(allow_domains: Sequence[str], blocked: list[dict[str, str]]) -> Callable[[Any], None]:
    def guard(route: Any) -> None:
        request_url = route.request.url
        scheme = urlsplit(request_url).scheme.lower()
        if scheme in SAFE_BROWSER_SCHEMES:
            route.fallback()
            return
        try:
            validate_network_url(request_url, allow_domains)
        except LabError as exc:
            if len(blocked) < 100:
                blocked.append({"code": exc.code, "url": redact_url(request_url)})
            route.abort("blockedbyclient")
            return
        route.fallback()

    return guard


def _browser_page_setup(allow_domains: Sequence[str], blocked: list[dict[str, str]]) -> Callable[[Any], None]:
    def setup(page: Any) -> None:
        page.route("**/*", _route_request_guard(allow_domains, blocked))

    return setup


def fetch_static(
    url: str,
    allow_domains: Sequence[str],
    timeout_seconds: int,
    max_redirects: int,
    fetcher: Any | None = None,
) -> tuple[Any, list[dict[str, str]]]:
    if fetcher is None:
        from scrapling.fetchers import Fetcher

        fetcher = Fetcher

    current = url
    redirects: list[dict[str, str]] = []
    for attempt in range(max_redirects + 1):
        validate_network_url(current, allow_domains)
        response = fetcher.get(
            current,
            follow_redirects=False,
            timeout=timeout_seconds,
            verify=True,
            stealthy_headers=False,
            retries=1,
        )
        location = response.headers.get("location") if getattr(response, "headers", None) else None
        if response.status not in REDIRECT_CODES or not location:
            return response, redirects
        if attempt >= max_redirects:
            raise LabError(
                "STL-FETCH-002",
                "O alvo excedeu o limite de redirecionamentos.",
                "A coleta não foi salva.",
                "Revise a URL ou aumente o limite até o máximo operacional de 10.",
                retryable=True,
            )
        next_url = urljoin(current, location)
        validate_network_url(next_url, allow_domains)
        redirects.append({"from": redact_url(current), "to": redact_url(next_url)})
        current = next_url
    raise AssertionError("redirect loop should always return or raise")


def fetch_browser(
    mode: str,
    url: str,
    allow_domains: Sequence[str],
    timeout_seconds: int,
) -> tuple[Any, list[dict[str, str]]]:
    blocked: list[dict[str, str]] = []
    common: dict[str, Any] = {
        "headless": True,
        "real_chrome": False,
        "user_data_dir": "",
        "cdp_url": None,
        "timeout": timeout_seconds * 1000,
        "page_setup": _browser_page_setup(allow_domains, blocked),
        "google_search": False,
        "disable_resources": True,
        "network_idle": False,
    }
    if mode == "dynamic":
        from scrapling.fetchers import DynamicFetcher

        response = DynamicFetcher.fetch(url, **common)
    else:
        from scrapling.fetchers import StealthyFetcher

        response = StealthyFetcher.fetch(
            url,
            solve_cloudflare=False,
            block_webrtc=True,
            **common,
        )
    validate_network_url(response.url, allow_domains)
    return response, blocked


def response_to_markdown(response: Any, max_bytes: int) -> tuple[str, int, str]:
    content = response.markdown(main_content_only=True)
    encoded = content.encode("utf-8")
    if len(encoded) > max_bytes:
        raise LabError(
            "STL-SIZE-001",
            f"O conteúdo excedeu o teto de {max_bytes} bytes.",
            "A coleta não foi salva; nenhum arquivo parcial foi mantido.",
            "Use um seletor/escopo menor ou aumente o teto até 10 MiB.",
        )
    return content, len(encoded), hashlib.sha256(encoded).hexdigest()


def write_output(name: str, content: str) -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    destination = DATA_DIR / name
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        newline="\n",
        dir=DATA_DIR,
        prefix=".scrapling-",
        suffix=".tmp",
        delete=False,
    ) as handle:
        handle.write(content)
        temporary = Path(handle.name)
    os.replace(temporary, destination)
    return destination


def append_audit(event: dict[str, Any]) -> None:
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    event = {"timestamp": datetime.now(timezone.utc).isoformat(), **event}
    with (LOG_DIR / "audit.jsonl").open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(json.dumps(event, ensure_ascii=False, sort_keys=True) + "\n")


def check_runtime() -> dict[str, Any]:
    try:
        version = metadata.version("scrapling")
    except metadata.PackageNotFoundError as exc:
        raise LabError(
            "STL-RUNTIME-001",
            "Scrapling não está instalado neste Python.",
            "Nenhuma coleta pode ser iniciada.",
            "Execute install.ps1 e use run.ps1 para operar pelo venv do laboratório.",
        ) from exc
    if version != "0.4.15":
        raise LabError(
            "STL-RUNTIME-002",
            f"Versão instalada inesperada: {version}.",
            "A coleta foi bloqueada para evitar drift de dependência.",
            "Recrie o runtime a partir de requirements.lock.",
        )
    return {
        "status": "ok",
        "scrapling": version,
        "python": sys.version.split()[0],
        "browser_dir_exists": BROWSERS_DIR.is_dir(),
        "runtime_python": str(Path(sys.executable).resolve()),
    }


def _safe_purpose(value: str) -> str:
    result = " ".join(value.split())[:200]
    if len(result) < 8:
        raise LabError(
            "STL-CONFIG-003",
            "A finalidade precisa explicar objetivamente a pesquisa.",
            "Nenhuma requisição foi realizada.",
            "Informe --purpose com ao menos oito caracteres e sem dados pessoais desnecessários.",
        )
    return result


def _purpose_for_log(value: str | None) -> str:
    if value is None:
        return "<missing>"
    result = " ".join(value.split())[:200]
    return result if len(result) >= 8 else "<invalid>"


def run_fetch(args: argparse.Namespace) -> dict[str, Any]:
    check_runtime()
    allow_domains = normalize_allow_domains(args.allow_domain)
    purpose = _safe_purpose(args.purpose)
    validate_execution_policy(args.mode, args.ack_yellow)
    validate_network_url(args.url, allow_domains)
    output_name = validate_output_name(args.output_name, args.url)

    if not 1_024 <= args.max_bytes <= MAX_ALLOWED_BYTES:
        raise LabError(
            "STL-CONFIG-004",
            "O teto de saída deve ficar entre 1 KiB e 10 MiB.",
            "Nenhuma requisição foi realizada.",
            "Revise --max-bytes dentro do intervalo permitido.",
        )
    if not 5 <= args.timeout <= 120:
        raise LabError(
            "STL-CONFIG-005",
            "O timeout deve ficar entre 5 e 120 segundos.",
            "Nenhuma requisição foi realizada.",
            "Revise --timeout dentro do intervalo permitido.",
        )
    if not 0 <= args.max_redirects <= 10:
        raise LabError(
            "STL-CONFIG-006",
            "O limite de redirecionamentos deve ficar entre 0 e 10.",
            "Nenhuma requisição foi realizada.",
            "Revise --max-redirects dentro do intervalo permitido.",
        )

    try:
        if args.mode == "static":
            response, network_events = fetch_static(
                args.url,
                allow_domains,
                args.timeout,
                args.max_redirects,
            )
        else:
            response, network_events = fetch_browser(
                args.mode,
                args.url,
                allow_domains,
                args.timeout,
            )
        markdown, byte_count, digest = response_to_markdown(response, args.max_bytes)
        destination = write_output(output_name, markdown)
    except LabError:
        raise
    except Exception as exc:
        raise LabError(
            "STL-FETCH-001",
            f"A coleta falhou: {type(exc).__name__}.",
            "Nenhuma saída nova foi confirmada.",
            "Confira a conectividade e tente uma vez; se repetir, use outro modo ou consulte o suporte.",
            retryable=True,
        ) from exc

    result = {
        "status": "ok",
        "mode": args.mode,
        "source": redact_url(args.url),
        "final_url": redact_url(response.url),
        "http_status": response.status,
        "bytes": byte_count,
        "sha256": digest,
        "output": str(destination.resolve()),
        "network_events": network_events,
    }
    append_audit(
        {
            "event": "fetch_completed",
            "purpose": purpose,
            "allow_domains": list(allow_domains),
            **result,
        }
    )
    return result


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Scrapling TAVIR Lab — executor controlado")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("check", help="Confere runtime, versão e navegador dedicado")

    fetch = subparsers.add_parser("fetch", help="Coleta uma página pública/autorizada por GET")
    fetch.add_argument("url")
    fetch.add_argument("--allow-domain", action="append", required=True)
    fetch.add_argument("--purpose", required=True)
    fetch.add_argument("--mode", choices=("static", "dynamic", "stealthy"), default="static")
    fetch.add_argument("--ack-yellow", action="store_true")
    fetch.add_argument("--output-name")
    fetch.add_argument("--timeout", type=int, default=30)
    fetch.add_argument("--max-bytes", type=int, default=5 * 1024 * 1024)
    fetch.add_argument("--max-redirects", type=int, default=5)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        if args.command == "check":
            result = check_runtime()
        else:
            result = run_fetch(args)
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return 0
    except LabError as exc:
        failure = asdict(exc)
        failure["status"] = "error"
        if args.command == "fetch":
            append_audit(
                {
                    "event": "fetch_blocked_or_failed",
                    "source": redact_url(args.url),
                    "mode": args.mode,
                    "purpose": _purpose_for_log(args.purpose),
                    "error": failure,
                }
            )
        print(json.dumps(failure, ensure_ascii=False, indent=2, sort_keys=True), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
