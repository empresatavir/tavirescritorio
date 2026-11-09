"""Roteador seguro de Keys e fallback para provedores RapidAPI.

O módulo não conhece nem registra valores de Keys. Ele lê ``config/api_keys.env``
localmente, escolhe uma Key com quota preventiva e sincroniza os headers de quota
de cada resposta. A chamada real só pode ir para hosts declarados em providers.json.

Esta camada é deliberadamente genérica: os endpoints e normalizadores específicos
de cada provedor entram no adaptador da coleta depois que as assinaturas forem
confirmadas. Assim, uma API com rota incompatível não é tratada como se tivesse o
mesmo contrato das outras.
"""

from __future__ import annotations

import json
import os
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ENV = ROOT / "config" / "api_keys.env"
DEFAULT_INSTAGRAM_CONFIG = ROOT / "config" / "instagram_rapidapi.env"
DEFAULT_PROVIDERS = Path(__file__).with_name("providers.json")
DEFAULT_STATE = ROOT / "config" / ".rapidapi-usage.json"
DEFAULT_TIMEOUT = 30
COOLDOWN_SECONDS = 60
AUTH_COOLDOWN_SECONDS = 3600


class RouterError(RuntimeError):
    """Erro operacional seguro do roteador; não contém segredo."""


class NoProviderAvailable(RouterError):
    """Nenhuma combinação provedor/Key pôde atender à chamada."""


@dataclass(frozen=True)
class ApiRequest:
    """Contrato de uma chamada já normalizada pelo adaptador do provedor."""

    provider: str
    method: str
    path: str
    query: Mapping[str, str] | None = None
    json_body: Mapping[str, Any] | None = None


@dataclass(frozen=True)
class Provider:
    name: str
    label: str
    host: str
    priority: int
    capabilities: tuple[str, ...]


@dataclass(frozen=True)
class KeyRef:
    label: str
    value: str


@dataclass(frozen=True)
class ApiResponse:
    provider: str
    key_label: str
    status_code: int
    headers: Mapping[str, str]
    data: Any


def _parse_env(path: Path) -> dict[str, str]:
    """Lê o subconjunto KEY=VALUE sem importar uma biblioteca de dotenv."""
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"'")
        if key:
            values[key] = value
    return values


def _header(headers: Mapping[str, str], name: str) -> str | None:
    wanted = name.lower()
    for key, value in headers.items():
        if str(key).lower() == wanted:
            return str(value)
    return None


def _positive_int(value: str | None, fallback: int) -> int:
    try:
        parsed = int(str(value))
    except (TypeError, ValueError):
        return fallback
    return parsed if parsed >= 0 else fallback


class RapidApiRouter:
    """Seleciona Keys por provedor e faz fallback sem duplicar chamadas.

    O estado é apenas telemetria local: ``used`` é uma proteção preventiva e
    ``remaining``/``limit`` vindos dos headers têm precedência quando existem.
    O roteador não tenta descobrir ou criar contas e não trata 401/403 como prova
    de quota; coloca a combinação em cooldown e deixa a próxima disponível tentar.
    """

    def __init__(
        self,
        env_path: Path | str = DEFAULT_ENV,
        providers_path: Path | str = DEFAULT_PROVIDERS,
        state_path: Path | str = DEFAULT_STATE,
        instagram_config_path: Path | str | None = DEFAULT_INSTAGRAM_CONFIG,
        timeout: int = DEFAULT_TIMEOUT,
    ) -> None:
        self.env_path = Path(env_path)
        self.state_path = Path(state_path)
        self.timeout = max(1, int(timeout))
        instagram_config = _parse_env(Path(instagram_config_path)) if instagram_config_path else {}
        self.env = {**_parse_env(self.env_path), **instagram_config, **os.environ}
        self.providers = self._load_providers(Path(providers_path))
        self.state = self._load_state()
        # Telemetria efêmera por execução. Registra somente provedor, rota
        # relativa, status e resultado; nunca Key, query, corpo ou resposta.
        self.request_events: list[dict[str, Any]] = []

    @staticmethod
    def _load_providers(path: Path) -> dict[str, Provider]:
        raw = json.loads(path.read_text(encoding="utf-8"))
        return {
            name: Provider(
                name=name,
                label=str(item["label"]),
                host=str(item["host"]),
                priority=int(item.get("priority", 100)),
                capabilities=tuple(str(x) for x in item.get("capabilities", [])),
            )
            for name, item in raw["providers"].items()
        }

    def _load_state(self) -> dict[str, Any]:
        month = datetime.now(timezone.utc).strftime("%Y-%m")
        if not self.state_path.is_file():
            return {"schema": "tavir-rapidapi-usage/v1", "month": month, "entries": {}}
        try:
            value = json.loads(self.state_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {"schema": "tavir-rapidapi-usage/v1", "month": month, "entries": {}}
        if value.get("month") != month:
            return {"schema": "tavir-rapidapi-usage/v1", "month": month, "entries": {}}
        value.setdefault("entries", {})
        return value

    def _save_state(self) -> None:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        fd, temp_name = tempfile.mkstemp(prefix=".rapidapi-usage-", suffix=".tmp", dir=self.state_path.parent)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(self.state, handle, ensure_ascii=False, indent=2)
                handle.write("\n")
            os.replace(temp_name, self.state_path)
        finally:
            if os.path.exists(temp_name):
                os.unlink(temp_name)

    def _key_refs(self, provider: Provider) -> list[KeyRef]:
        setting_name = f"RAPIDAPI_INSTAGRAM_KEYS_{provider.name.upper()}"
        # Fail closed: uma Key de futebol ou uma conta sem assinatura de
        # Instagram não pode ser usada só porque aparece no arquivo local.
        configured = self.env.get(setting_name, "")
        labels = [x.strip().upper() for x in configured.split(",") if x.strip()]
        labels = [x for x in labels if x.startswith("KEY_")]
        return [KeyRef(label, self.env[f"RAPIDAPI_{label}"]) for label in labels if self.env.get(f"RAPIDAPI_{label}")]

    def _entry(self, provider: Provider, key: KeyRef) -> dict[str, Any]:
        key_id = f"{provider.name}:{key.label}"
        entries = self.state.setdefault("entries", {})
        item = entries.setdefault(key_id, {"used": 0, "limit": self._configured_limit(provider, key), "remaining": None})
        item.setdefault("used", 0)
        item.setdefault("limit", self._configured_limit(provider, key))
        item.setdefault("remaining", None)
        item.setdefault("cooldown_until", 0)
        item.setdefault("last_status", None)
        return item

    def _configured_limit(self, provider: Provider, key: KeyRef) -> int:
        # Precedência: limite da Key > default do provedor > default global > 150.
        # Como cada Key é de uma conta RapidAPI distinta com assinatura própria, todas
        # começam com a mesma quota do provedor; o default por provedor evita repetir
        # RAPIDAPI_LIMIT_<PROVEDOR>_KEY_N para as 13 Keys.
        default = _positive_int(self.env.get("RAPIDAPI_INSTAGRAM_DEFAULT_LIMIT"), 150)
        provider_default = _positive_int(
            self.env.get(f"RAPIDAPI_LIMIT_{provider.name.upper()}_DEFAULT"), default
        )
        return _positive_int(
            self.env.get(f"RAPIDAPI_LIMIT_{provider.name.upper()}_{key.label}"), provider_default
        )

    def _available(self, provider: Provider, key: KeyRef, now: float) -> bool:
        entry = self._entry(provider, key)
        if float(entry.get("cooldown_until", 0)) > now:
            return False
        remaining = entry.get("remaining")
        if remaining is not None and int(remaining) <= 0:
            return False
        return int(entry.get("used", 0)) < int(entry.get("limit", 0))

    def _choose_key(self, provider: Provider) -> KeyRef:
        now = time.time()
        choices = [key for key in self._key_refs(provider) if self._available(provider, key, now)]
        if not choices:
            raise NoProviderAvailable(f"Nenhuma Key disponível para o provedor {provider.name}.")
        # Menor uso primeiro distribui consultas entre contas sem repetir a chamada.
        # Desempate numérico por índice (KEY_2 antes de KEY_10), não lexicográfico.
        def _order(key: KeyRef) -> tuple[int, int, str]:
            used = int(self._entry(provider, key).get("used", 0))
            suffix = key.label.rsplit("_", 1)[-1]
            index = int(suffix) if suffix.isdigit() else 1_000_000
            return (used, index, key.label)

        choices.sort(key=_order)
        return choices[0]

    def _record(self, provider: Provider, key: KeyRef, status: int, headers: Mapping[str, str]) -> None:
        entry = self._entry(provider, key)
        if status < 500:
            entry["used"] = int(entry.get("used", 0)) + 1
        limit = _header(headers, "x-ratelimit-requests-limit") or _header(headers, "x-rapidapi-requests-limit")
        remaining = _header(headers, "x-ratelimit-requests-remaining") or _header(headers, "x-rapidapi-requests-remaining")
        if limit is not None:
            entry["limit"] = _positive_int(limit, int(entry.get("limit", 150)))
        if remaining is not None:
            entry["remaining"] = _positive_int(remaining, 0)
            entry["used"] = max(0, int(entry["limit"]) - int(entry["remaining"]))
        entry["last_status"] = int(status)
        if status == 429:
            entry["cooldown_until"] = time.time() + COOLDOWN_SECONDS
        elif status in {401, 403}:
            entry["cooldown_until"] = time.time() + AUTH_COOLDOWN_SECONDS
        self._save_state()

    def _request_once(self, request: ApiRequest, provider: Provider, key: KeyRef) -> ApiResponse:
        if not request.path.startswith("/") or "://" in request.path:
            raise RouterError("Rota de provedor inválida; use apenas caminhos relativos declarados pelo adaptador.")
        query = f"?{urlencode(request.query)}" if request.query else ""
        url = f"https://{provider.host}{request.path}{query}"
        headers = {
            "Accept": "application/json",
            # Alguns upstreams RapidAPI (ex.: instagram-scraper-ai1) ficam atrás de
            # Cloudflare e devolvem 403 "Error 1010: browser signature" para
            # requisições sem User-Agent de navegador. O gateway do RapidAPI aceita
            # e repassa este header; ele não identifica pessoa nem contém segredo.
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            "X-RapidAPI-Key": key.value,
            "X-RapidAPI-Host": provider.host,
        }
        body = None
        if request.json_body is not None:
            headers["Content-Type"] = "application/json"
            body = json.dumps(request.json_body).encode("utf-8")
        http_request = Request(url, data=body, headers=headers, method=request.method.upper())
        event: dict[str, Any] = {
            "provider": provider.name,
            "method": request.method.upper(),
            "path": request.path,
            "started_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "status_code": None,
            "outcome": "started",
        }
        self.request_events.append(event)
        try:
            with urlopen(http_request, timeout=self.timeout) as response:
                status = int(response.status)
                response_headers = {str(k): str(v) for k, v in response.headers.items()}
                raw = response.read()
        except HTTPError as exc:
            response_headers = {str(k): str(v) for k, v in exc.headers.items()}
            event.update({"status_code": int(exc.code), "outcome": "http_error"})
            self._record(provider, key, int(exc.code), response_headers)
            raise RouterError(f"Provedor {provider.name} respondeu HTTP {exc.code}.") from None
        except (TimeoutError, URLError):
            event["outcome"] = "network_error"
            raise RouterError(f"Não foi possível alcançar o provedor {provider.name}.") from None
        event.update({"status_code": status, "outcome": "success"})
        self._record(provider, key, status, response_headers)
        try:
            data = json.loads(raw.decode("utf-8")) if raw else None
        except (UnicodeDecodeError, ValueError):
            data = {"raw_content_type": response_headers.get("Content-Type", "desconhecido"), "raw_bytes": len(raw)}
        return ApiResponse(provider.name, key.label, status, response_headers, data)

    def request_usage(self) -> dict[str, Any]:
        """Resume requests HTTP realmente iniciados nesta instância.

        ``total`` é o consumo operacional conservador: toda tentativa que
        alcançou ``urlopen`` conta, mesmo quando o provedor respondeu erro ou a
        confirmação de cobrança ficou indisponível.
        """
        by_provider: dict[str, int] = {}
        by_outcome: dict[str, int] = {}
        for event in self.request_events:
            provider = str(event["provider"])
            outcome = str(event["outcome"])
            by_provider[provider] = by_provider.get(provider, 0) + 1
            by_outcome[outcome] = by_outcome.get(outcome, 0) + 1
        return {
            "definition": "tentativas HTTP iniciadas contra provedores RapidAPI nesta coleta",
            "total": len(self.request_events),
            "by_provider": dict(sorted(by_provider.items())),
            "by_outcome": dict(sorted(by_outcome.items())),
            "events": [dict(event) for event in self.request_events],
        }

    def request(self, request: ApiRequest) -> ApiResponse:
        """Executa uma chamada em um provedor, alternando Keys do mesmo pool."""
        provider = self.providers.get(request.provider)
        if provider is None:
            raise RouterError(f"Provedor não cadastrado: {request.provider}.")
        tried: list[str] = []
        while True:
            try:
                key = self._choose_key(provider)
            except NoProviderAvailable:
                raise NoProviderAvailable(
                    f"Nenhuma Key disponível para {provider.label}; consulte quota e assinaturas."
                ) from None
            if key.label in tried:
                raise NoProviderAvailable(f"Todas as Keys configuradas para {provider.label} foram tentadas.")
            tried.append(key.label)
            try:
                return self._request_once(request, provider, key)
            except RouterError:
                # O estado já registra quota/cooldown; tenta outra Key sem expor o motivo bruto.
                continue

    def request_with_fallback(self, requests: list[ApiRequest]) -> ApiResponse:
        """Tenta cada provedor uma vez, em ordem explícita do adaptador."""
        failures: list[str] = []
        for request in requests:
            try:
                return self.request(request)
            except (RouterError, NoProviderAvailable) as exc:
                failures.append(f"{request.provider}: {exc}")
        raise NoProviderAvailable("Nenhum provedor conseguiu atender à operação: " + "; ".join(failures))

    def status(self) -> dict[str, Any]:
        """Retorna telemetria sem valor de Key, e-mail ou token."""
        result: dict[str, Any] = {}
        for name, provider in sorted(self.providers.items(), key=lambda pair: pair[1].priority):
            keys = []
            for key in self._key_refs(provider):
                entry = self._entry(provider, key)
                limit = int(entry.get("limit", self._configured_limit(provider, key)))
                used = int(entry.get("used", 0))
                remaining = entry.get("remaining")
                if remaining is None:
                    remaining = max(0, limit - used)
                keys.append({"key": key.label, "used": used, "limit": limit, "remaining": int(remaining), "last_status": entry.get("last_status")})
            result[name] = {"label": provider.label, "host": provider.host, "keys": keys}
        return result


if __name__ == "__main__":
    print(json.dumps(RapidApiRouter().status(), ensure_ascii=False, indent=2))
