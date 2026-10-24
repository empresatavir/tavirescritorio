"""Oráculo de Pautas — gera 3 opções editoriais via GhostCLI, com fallback determinístico."""
from __future__ import annotations

import json
import re
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile import Profile
from app.models.studio_decision import StudioDecision
from app.modules.ghostcli import chat_completion, is_configured
from app.modules.studio.repository import DecisionRepository


STYLES = ("CONTRARIAN", "PRÁTICO", "BASTIDORES")


def _fallback_options(profile: Profile, theme: str | None, net: str) -> list[dict[str, Any]]:
    niche = profile.niche or "negócios"
    handle = (profile.handle or profile.name or "marca").lstrip("@")
    base = theme.strip() if theme and theme.strip() else f"sistemas e {niche}"
    titles = [
        f"{base.capitalize()} não é volume. É escolha.",
        f"O ritual semanal que organiza {niche}.",
        f"Bastidores: como {handle} publica com poucos recursos.",
    ]
    hooks = [
        f"“Sua agenda não está cheia. Ela está indecisa — e isso custa {niche}.”",
        f"“Antes de abrir mais uma ferramenta, responda estas 4 perguntas.”",
        f"“Não contratamos mais gente. Mudamos a esteira de {net.upper()}.”",
    ]
    angles = [
        f"Expor o custo cognitivo das microdecisões em {niche}.",
        "Entregar um framework visual de priorização replicável em 12 minutos.",
        "Abrir o processo real: gargalos, automações e decisões humanas.",
    ]
    options = []
    for i, style in enumerate(STYLES):
        options.append(
            {
                "id": f"opt-{chr(ord('a') + i)}",
                "label": f"OPÇÃO {chr(ord('A') + i)}",
                "style": style,
                "fit": 94 - i * 6,
                "title": titles[i],
                "angle": angles[i],
                "hook": hooks[i],
                "sources": "Pesquisas de mercado · Dados do perfil · Operação TAVIR",
                "whyNow": (
                    f"Alinha o repertório de {profile.name} com a rede {net.upper()} "
                    "e o ciclo editorial atual."
                ),
            }
        )
    return options


def _extract_json(text: str) -> Any | None:
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}|\[[\s\S]*\]", text)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _normalize_options(raw: Any, profile: Profile, theme: str | None, net: str) -> list[dict[str, Any]]:
    items: list[Any] = []
    if isinstance(raw, dict):
        items = raw.get("options") or raw.get("choices") or []
    elif isinstance(raw, list):
        items = raw
    if not isinstance(items, list) or len(items) < 3:
        return _fallback_options(profile, theme, net)

    normalized: list[dict[str, Any]] = []
    for i, item in enumerate(items[:3]):
        if not isinstance(item, dict):
            continue
        style = str(item.get("style") or STYLES[i]).upper()
        normalized.append(
            {
                "id": str(item.get("id") or f"opt-{chr(ord('a') + i)}"),
                "label": str(item.get("label") or f"OPÇÃO {chr(ord('A') + i)}"),
                "style": style,
                "fit": int(item.get("fit") or (94 - i * 6)),
                "title": str(item.get("title") or f"Pauta {i + 1}"),
                "angle": str(item.get("angle") or ""),
                "hook": str(item.get("hook") or ""),
                "sources": str(item.get("sources") or "Oráculo TAVIR"),
                "whyNow": str(item.get("whyNow") or item.get("why_now") or ""),
            }
        )
    if len(normalized) < 3:
        return _fallback_options(profile, theme, net)
    return normalized


class OracleService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.decisions = DecisionRepository(session)

    async def run(
        self,
        profile: Profile,
        *,
        net: str = "ig",
        theme: str | None = None,
        start_point_id: str | None = None,
    ) -> StudioDecision:
        options = await self._generate_options(profile, net=net, theme=theme)
        run_id = await self.decisions.next_run_id()
        theme_label = theme.strip() if theme and theme.strip() else None
        title = (
            f"Escolha a próxima pauta · {theme_label}"
            if theme_label
            else "Escolha a próxima pauta do ciclo"
        )
        subtitle = (
            "Tema manual enviado ao Oráculo."
            if start_point_id == "manual" and theme_label
            else "O Oráculo cruzou repertório, tendências e desempenho histórico."
        )
        decision = StudioDecision(
            id=str(uuid.uuid4()),
            profile_id=profile.id,
            run_id=run_id,
            kind="pauta",
            title=title,
            subtitle=subtitle,
            status="pending",
            options=options,
            selected_option_id=options[0]["id"] if options else None,
            waiting_label="aguardando você",
            platform_label=net.upper(),
        )
        return await self.decisions.create(decision)

    async def _generate_options(
        self,
        profile: Profile,
        *,
        net: str,
        theme: str | None,
    ) -> list[dict[str, Any]]:
        if not is_configured():
            from app.modules.ghostcli.notice import report_ai_link_error

            report_ai_link_error("GhostCLI sem chave. O Oráculo usou um rascunho local.")
            return _fallback_options(profile, theme, net)

        ds = profile.design_system or {}
        system = (
            "Você é o Oráculo de Pautas do TAVIR Studio. "
            "Responda APENAS com JSON válido, sem markdown. "
            'Formato: {"options":[{"id":"opt-a","label":"OPÇÃO A","style":"CONTRARIAN",'
            '"fit":94,"title":"...","angle":"...","hook":"...","sources":"...","whyNow":"..."},'
            " ... 2 mais]}. Exatamente 3 opções. Estilos distintos: CONTRARIAN, PRÁTICO, BASTIDORES."
        )
        user = (
            f"Perfil: {profile.name} ({profile.handle})\n"
            f"Empresa: {profile.company or '—'}\n"
            f"Nicho: {profile.niche}\n"
            f"Audiência: {profile.audience}\n"
            f"Tom: {ds.get('toneOfVoice') or profile.tone}\n"
            f"Fazer: {ds.get('doList')}\n"
            f"Evitar: {ds.get('dontList')}\n"
            f"Contexto: {profile.context or profile.guidelines}\n"
            f"Rede alvo: {net}\n"
            f"Tema sugerido: {theme or '(autônomo — descubra o melhor ângulo)'}\n"
        )
        try:
            content = await chat_completion(
                system=system,
                messages=[{"role": "user", "content": user}],
                max_tokens=1600,
                timeout=60.0,
            )
            parsed = _extract_json(content)
            return _normalize_options(parsed, profile, theme, net)
        except Exception:
            return _fallback_options(profile, theme, net)
