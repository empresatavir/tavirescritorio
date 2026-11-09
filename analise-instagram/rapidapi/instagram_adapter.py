#!/usr/bin/env python3
"""Coleta de perfil do Instagram pela rota RapidAPI configurada para a Íris.

Esta é uma ponte de metadados: cada provedor tem contrato próprio e só é usado
quando há uma Key explicitamente vinculada a ele em instagram_rapidapi.env.
Mídias binárias, OCR, frames e transcrição continuam sendo etapas separadas e
podem permanecer indisponíveis quando a API não entregar URLs públicas.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from router import ApiRequest, NoProviderAvailable, RapidApiRouter, RouterError


PROFILE_RE = re.compile(r"[a-z0-9._]{1,30}", re.IGNORECASE)


@dataclass(frozen=True)
class Contract:
    provider: str
    profile_method: str
    profile_path: str
    profile_param: str
    feed_method: str
    feed_path: str
    feed_param: str
    id_param: str = "user_id"


@dataclass(frozen=True)
class MediaContract:
    """Contrato para endpoints de mídia individual (Reel/Post/Story)."""
    provider: str
    method: str
    path: str
    param: str  # "shortcode" ou "url"
    path_template: bool = False  # True se o parâmetro vai no path, False se vai em query


# Contratos validados com chamada real em 2026-08-31 (KEY_1, perfil público).
# Best Experience: /profile?username= -> /feed?user_id= (limite ~100/mês).
# Scraper AI1: /user/info_v2/?username= -> /user/feed_v2/?username= (limite ~25/mês;
# o upstream exige User-Agent de navegador, tratado no router).
CONTRACTS = (
    Contract("best_experience", "GET", "/profile", "username", "GET", "/feed", "user_id"),
    Contract("social_premium", "GET", "/user/info_v2/", "username", "GET", "/user/feed_v2/", "username"),
)

# Contratos de mídia individual (Reel/Post/Story) — adicionados 2026-10-20.
# Best Experience: GET /post/{shortcode} retorna Post/IGTV/Reel completo.
# Instagram Looter: GET /media/download?url= retorna links de download diretos.
MEDIA_CONTRACTS = (
    MediaContract("best_experience", "GET", "/post", "shortcode", path_template=False),
    MediaContract("instagram_looter2", "GET", "/media/download", "url", path_template=False),
)


SHORTCODE_RE = re.compile(r"[A-Za-z0-9_-]{5,20}")


def parse_username(value: str) -> tuple[str, str]:
    raw = value.strip()
    parsed = urlsplit(raw if "://" in raw else f"https://{raw}")
    host = (parsed.hostname or "").lower().rstrip(".")
    if parsed.scheme != "https" or host not in {"instagram.com", "www.instagram.com"}:
        raise ValueError("Use uma URL HTTPS pública de perfil em instagram.com.")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("A URL do perfil não pode conter credenciais, query ou fragmento.")
    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) != 1 or parts[0].lower() in {"p", "reel", "reels", "stories", "explore"}:
        raise ValueError("A URL deve apontar para um perfil, não para uma publicação.")
    username = parts[0].lstrip("@").lower()
    if not PROFILE_RE.fullmatch(username):
        raise ValueError("Não foi possível extrair um nome de perfil válido.")
    return username, f"https://www.instagram.com/{username}/"


def parse_media_url(value: str) -> tuple[str, str]:
    """Extrai shortcode ou URL canônica de uma URL de Reel/Post/Story.

    Retorna (shortcode, url_canonica). Para URLs de Looter que precisam da URL
    completa, usa-se a url_canonica diretamente.
    """
    raw = value.strip()
    parsed = urlsplit(raw if "://" in raw else f"https://{raw}")
    host = (parsed.hostname or "").lower().rstrip(".")
    if parsed.scheme != "https" or host not in {"instagram.com", "www.instagram.com"}:
        raise ValueError("Use uma URL HTTPS pública de mídia em instagram.com.")
    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) < 2:
        raise ValueError("URL de mídia inválida: esperado /reel/{shortcode} ou /p/{shortcode}.")
    media_type = parts[0].lower()
    if media_type not in {"reel", "reels", "p", "tv", "story", "stories"}:
        raise ValueError(f"Tipo de mídia não suportado: {media_type}. Use /reel/, /p/ ou /tv/.")
    shortcode = parts[1]
    if not SHORTCODE_RE.fullmatch(shortcode):
        raise ValueError(f"Shortcode inválido na URL: {shortcode}")
    canonical = f"https://www.instagram.com/{media_type}/{shortcode}/"
    return shortcode, canonical


def _media_request(contract: MediaContract, shortcode: str, url: str) -> ApiRequest:
    """Constrói ApiRequest para contrato de mídia.

    best_experience usa query param com valor = shortcode (não URL completa).
    instagram_looter2 usa query param com valor = URL completa.
    """
    if contract.path_template:
        path = f"{contract.path}{shortcode}"
        return ApiRequest(contract.provider, contract.method, path)
    # best_experience espera shortcode puro; looter2 espera URL completa
    value = shortcode if contract.provider == "best_experience" else url
    return ApiRequest(contract.provider, contract.method, contract.path, query={contract.param: value})


def fetch_media(url: str) -> dict[str, Any]:
    """Busca dados de mídia individual (Reel/Post) pelos provedores configurados.

    Tenta cada MEDIA_CONTRACT em ordem de prioridade do provedor. Retorna o
    primeiro resultado bem-sucedido com metadados completos da mídia.
    """
    shortcode, canonical_url = parse_media_url(url)
    router = RapidApiRouter()
    failures: list[str] = []
    for contract in sorted(MEDIA_CONTRACTS, key=lambda c: router.providers.get(c.provider).priority
                           if c.provider in router.providers else 999):
        try:
            response = router.request(_media_request(contract, shortcode, canonical_url))
            return {
                "schema": "instagram-rapidapi-media/v1",
                "shortcode": shortcode,
                "url": canonical_url,
                "provedor": contract.provider,
                "key_label": response.key_label,
                "status_code": response.status_code,
                "data": response.data,
                "requests": router.request_usage(),
            }
        except (RouterError, NoProviderAvailable) as exc:
            failures.append(f"{contract.provider}: {exc}")
            continue
    raise NoProviderAvailable(
        "Nenhum provedor conseguiu buscar a mídia. "
        + "; ".join(failures)
    )


def _walk(value: Any):
    if isinstance(value, dict):
        for key, child in value.items():
            yield str(key).lower(), child
            yield from _walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from _walk(child)


def find_user_id(value: Any) -> str:
    preferred = {"pk", "user_id", "userid", "user_pk", "id"}
    for key, child in _walk(value):
        if key in preferred and isinstance(child, (int, str)):
            candidate = str(child).strip()
            if candidate and (candidate.isdigit() or len(candidate) >= 4):
                return candidate
    return ""


def _query(contract: Contract, value: str, limit: int) -> dict[str, str]:
    if contract.provider == "social_premium":
        return {contract.profile_param: value} if contract.feed_param == "username" else {contract.feed_param: value}
    return {contract.profile_param: value, "count": str(max(1, min(limit, 50)))}


def _profile_request(contract: Contract, username: str) -> ApiRequest:
    if contract.profile_method == "POST":
        return ApiRequest(contract.provider, "POST", contract.profile_path, json_body={contract.profile_param: username})
    return ApiRequest(contract.provider, "GET", contract.profile_path, query={contract.profile_param: username})


def _feed_request(contract: Contract, username: str, user_id: str, limit: int) -> ApiRequest:
    value = username if contract.feed_param == "username" else user_id
    params = {contract.feed_param: value, "count": str(max(1, min(limit, 50)))}
    if contract.feed_method == "POST":
        return ApiRequest(contract.provider, "POST", contract.feed_path, json_body=params)
    return ApiRequest(contract.provider, "GET", contract.feed_path, query=params)


def _persist_payload(destination: Path, payload: dict[str, Any]) -> None:
    """Grava uma única versão final, já com o total de requests da rodada."""
    for folder in ("Perfil", "Imagens", "Reels", "Stories", "Destaques", "processado", "relatorios", "controle"):
        (destination / folder).mkdir(parents=True, exist_ok=True)
    (destination / "Perfil" / "rapidapi-profile.json").write_text(
        json.dumps(payload.get("profile"), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (destination / "Imagens" / "rapidapi-feed.json").write_text(
        json.dumps(payload.get("feed"), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    run_id = datetime.now().strftime("%Y%m%d-%H%M%S")
    (destination / "controle" / f"rapidapi-coleta-{run_id}.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def collect(url: str, destination: Path, limit: int = 20) -> dict[str, Any]:
    username, canonical_url = parse_username(url)
    router = RapidApiRouter()
    failures: list[str] = []
    partial: dict[str, Any] | None = None
    for contract in sorted(CONTRACTS, key=lambda item: router.providers.get(item.provider).priority
                           if item.provider in router.providers else 999):
        try:
            profile = router.request(_profile_request(contract, username))
        except (RouterError, NoProviderAvailable) as exc:
            failures.append(f"{contract.provider}: {exc}")
            continue
        user_id = find_user_id(profile.data)
        feed_data: Any = None
        feed_error = ""
        if user_id or contract.feed_param == "username":
            try:
                feed = router.request(_feed_request(contract, username, user_id, limit))
                feed_data = feed.data
            except (RouterError, NoProviderAvailable) as exc:
                feed_error = str(exc)
        collected_at = datetime.now().astimezone().isoformat(timespec="seconds")
        payload = {
            "schema": "instagram-rapidapi-collection/v1",
            "perfil": username,
            "url": canonical_url,
            "coletado_em": collected_at,
            "provedor": contract.provider,
            "key_label": profile.key_label,
            "cobertura": {
                "profile": True,
                "feed": feed_data is not None,
                "stories": False,
                "highlights": False,
                "media_binaria": False,
            },
            "profile": profile.data,
            "feed": feed_data,
            "limit": limit,
            "requests": router.request_usage(),
            "limitacoes": [
                "A resposta depende da cobertura e do contrato do provedor selecionado.",
                "Stories, Destaques, OCR, frames e transcrição não são declarados sem evidência.",
            ],
        }
        if feed_error:
            payload["feed_error"] = feed_error
        if feed_error:
            # Um perfil pode responder e o feed estar indisponível por contrato,
            # quota ou privacidade. Tenta outro provedor mapeado antes de aceitar
            # cobertura parcial, sem repetir a operação quando ela já funcionou.
            partial = partial or payload
            continue
        _persist_payload(destination, payload)
        return payload
    if partial:
        partial["requests"] = router.request_usage()
        _persist_payload(destination, partial)
        return partial
    raise NoProviderAvailable(
        "Nenhuma API RapidAPI configurada conseguiu atender ao perfil. "
        "Confirme assinatura, pool e quota; não foi feita coleta pelo Chrome."
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--workspace", type=Path, default=Path("analise-instagram/perfis"))
    parser.add_argument("--max-posts", type=int, default=20)
    args = parser.parse_args()
    if args.max_posts < 1:
        parser.error("--max-posts deve ser maior que zero")
    try:
        username, _ = parse_username(args.url)
        payload = collect(args.url, args.workspace.resolve() / username, args.max_posts)
    except (ValueError, NoProviderAvailable) as exc:
        print(f"RAPIDAPI_BLOQUEADA: {exc}", file=sys.stderr)
        return 3
    except OSError:
        print("RAPIDAPI_ERRO: não foi possível gravar o pacote local da coleta.", file=sys.stderr)
        return 4
    print(json.dumps({
        "status": "ok",
        "perfil": payload["perfil"],
        "provedor": payload["provedor"],
        "cobertura": payload["cobertura"],
        "requests": payload["requests"],
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
