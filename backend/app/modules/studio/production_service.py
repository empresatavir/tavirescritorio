"""Squads de produção visual — gera pacotes (carrossel / roteiro YT / ads) via GhostCLI + fallback."""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.piece import Piece
from app.models.profile import Profile
from app.models.studio_decision import StudioDecision
from app.modules.ghostcli import chat_completion, is_configured
from app.modules.studio.repository import DecisionRepository, PieceRepository

SQUAD_LABELS = {
    "oraculo": "Oráculo de Pautas",
    "ig-studio": "Instagram Studio",
    "yt-roteirista": "YouTube Roteirista",
    "carrosseis": "Carrosséis Especializados",
    "ads": "Ads Criativos",
}
LABEL_TO_SQUAD = {v: k for k, v in SQUAD_LABELS.items()}

# Visual production squads (LLM package generators)
VISUAL_SQUADS = frozenset({"ig-studio", "yt-roteirista", "carrosseis", "ads"})


def resolve_squad_id(squad: str | None, net: str = "ig") -> str:
    """Map squad id/label to a visual production squad id."""
    if not squad:
        return _default_squad_for_net(net)
    raw = squad.strip()
    if raw in VISUAL_SQUADS:
        return raw
    if raw in LABEL_TO_SQUAD:
        mapped = LABEL_TO_SQUAD[raw]
        if mapped in VISUAL_SQUADS:
            return mapped
        return _default_squad_for_net(net)
    # "Oráculo" / unknown → route by network
    return _default_squad_for_net(net)


def _default_squad_for_net(net: str) -> str:
    if net == "yt":
        return "yt-roteirista"
    if net == "li":
        return "carrosseis"
    return "ig-studio"


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


def _option_fields(option: dict[str, Any] | None) -> dict[str, str]:
    opt = option or {}
    return {
        "title": str(opt.get("title") or "Pacote editorial"),
        "hook": str(opt.get("hook") or ""),
        "angle": str(opt.get("angle") or ""),
        "style": str(opt.get("style") or "PRÁTICO"),
        "sources": str(opt.get("sources") or ""),
        "whyNow": str(opt.get("whyNow") or opt.get("why_now") or ""),
    }


def fallback_carousel(
    profile: Profile,
    option: dict[str, Any] | None,
    *,
    net: str = "ig",
    theme: str | None = None,
) -> dict[str, Any]:
    """CarouselPackage — 5–7 slides + caption/cta/tags."""
    f = _option_fields(option)
    niche = profile.niche or "negócios"
    handle = (profile.handle or profile.name or "marca").lstrip("@")
    base = theme or f["title"]
    slides = [
        f"{base}",
        f"O problema: decisões espalhadas em {niche}.",
        f"Tese ({f['style']}): {f['angle'] or 'menos ferramentas, mais critérios.'}",
        f"Prova: {f['sources'] or 'dados do ciclo + repertório TAVIR'}.",
        "Framework em 3 passos: diagnosticar → cortar → ritualizar.",
        f"Aplicação em {net.upper()}: publique o ritual, não a ferramenta.",
        f"CTA: salve e compartilhe com quem opera {niche} como {handle}.",
    ]
    return {
        "kind": "carousel",
        "squad_id": "ig-studio" if net != "li" else "carrosseis",
        "content_type": "carousel",
        "title": f["title"],
        "subtitle": f["hook"][:120] if f["hook"] else f"Carrossel · {niche}",
        "slides": slides,
        "caption": f["hook"]
        or f"Você não precisa de mais uma ferramenta. Precisa decidir o que não quer refazer toda semana em {niche}.",
        "cta": "Salve este carrossel e mande para o time",
        "tags": f"#{niche.replace(' ', '')} #operacao #tavir",
        "script": f["angle"],
        "body": None,
        "progress": 100,
    }


def fallback_yt_script(
    profile: Profile,
    option: dict[str, Any] | None,
    *,
    theme: str | None = None,
) -> dict[str, Any]:
    """YtScriptPackage — estrutura de retenção + roteiro."""
    f = _option_fields(option)
    niche = profile.niche or "IA aplicada"
    title = f["title"] if f["title"] != "Pacote editorial" else (theme or f"Como operar {niche} sem caos")
    sections = [
        "0:00 Hook — tensão aberta",
        "0:25 Contexto — o custo de não decidir",
        "1:10 Framework — 3 critérios",
        "3:00 Demonstração / bastidores",
        "5:30 Objeção comum",
        "6:30 CTA + próximo episódio",
    ]
    script = "\n\n".join(
        [
            f"# {title}",
            f"HOOK: {f['hook'] or f'Sua operação de {niche} não está lenta — está indecisa.'}",
            f"ÂNGULO ({f['style']}): {f['angle'] or 'mostrar o ritual, não a stack.'}",
            "ESTRUTURA:\n- " + "\n- ".join(sections),
            "CORPO:\n"
            f"Abra com a tensão. Mostre o antes/depois operacional. Feche com uma ação de 12 minutos "
            f"que o espectador aplica hoje. Fontes: {f['sources'] or 'repertório do canal'}.",
            f"CTA: Inscreva-se e comente qual etapa trava o seu time de {niche}.",
        ]
    )
    return {
        "kind": "yt_script",
        "squad_id": "yt-roteirista",
        "content_type": "video",
        "title": title,
        "subtitle": "Roteiro de retenção · YouTube",
        "slides": sections,
        "caption": f["hook"]
        or f"Episódio prático: o ritual semanal que organiza {niche}.",
        "cta": "Inscreva-se e comente a etapa que trava",
        "tags": f"#youtube #{niche.replace(' ', '')} #roteiro",
        "script": script,
        "body": json.dumps({"sections": sections, "style": f["style"]}, ensure_ascii=False),
        "progress": 100,
    }


def fallback_ads(
    profile: Profile,
    option: dict[str, Any] | None,
    *,
    theme: str | None = None,
) -> dict[str, Any]:
    """AdsVariants — 3 variações de copy para teste."""
    f = _option_fields(option)
    niche = profile.niche or "negócios"
    base = theme or f["title"]
    variants = [
        {
            "id": "v1",
            "angle": "Dor",
            "hook": f"Sua agenda em {niche} está cheia — ou só indecisa?",
            "body": f"{base}: 3 critérios para cortar ruído esta semana.",
            "cta": "Quero o ritual",
        },
        {
            "id": "v2",
            "angle": "Prova",
            "hook": f"Times que publicam com critério crescem com menos peças.",
            "body": f"Veja o framework que {profile.name} usa em {niche}.",
            "cta": "Ver o framework",
        },
        {
            "id": "v3",
            "angle": "Bastidores",
            "hook": "Não contratamos mais gente. Mudamos a esteira.",
            "body": f"{f['angle'] or 'Operação enxuta com supervisão humana.'}",
            "cta": "Copiar o ritual",
        },
    ]
    slides = [f"{v['angle']}: {v['hook']}" for v in variants]
    return {
        "kind": "ads",
        "squad_id": "ads",
        "content_type": "ad",
        "title": f"Ads · {base}",
        "subtitle": "3 variações para teste A/B",
        "slides": slides,
        "caption": variants[0]["hook"],
        "cta": variants[0]["cta"],
        "tags": f"#ads #{niche.replace(' ', '')} #teste",
        "script": "\n".join(f"{v['id']} · {v['hook']} → {v['cta']}" for v in variants),
        "body": json.dumps({"variants": variants}, ensure_ascii=False),
        "progress": 100,
    }


def fallback_package(
    profile: Profile,
    option: dict[str, Any] | None,
    *,
    squad_id: str,
    net: str = "ig",
    theme: str | None = None,
) -> dict[str, Any]:
    sid = resolve_squad_id(squad_id, net)
    if sid == "yt-roteirista":
        return fallback_yt_script(profile, option, theme=theme)
    if sid == "ads":
        return fallback_ads(profile, option, theme=theme)
    # ig-studio + carrosseis
    pkg = fallback_carousel(profile, option, net=net, theme=theme)
    pkg["squad_id"] = sid
    return pkg


def _normalize_package(
    raw: Any,
    profile: Profile,
    option: dict[str, Any] | None,
    *,
    squad_id: str,
    net: str,
    theme: str | None,
) -> dict[str, Any]:
    fb = fallback_package(profile, option, squad_id=squad_id, net=net, theme=theme)
    if not isinstance(raw, dict):
        return fb

    slides = raw.get("slides") or raw.get("sections")
    if isinstance(slides, list) and slides:
        fb["slides"] = [str(s) for s in slides if str(s).strip()][:12]
    if raw.get("title"):
        fb["title"] = str(raw["title"])
    if raw.get("subtitle"):
        fb["subtitle"] = str(raw["subtitle"])
    if raw.get("caption"):
        fb["caption"] = str(raw["caption"])
    if raw.get("cta"):
        fb["cta"] = str(raw["cta"])
    if raw.get("tags"):
        fb["tags"] = str(raw["tags"])
    if raw.get("script"):
        fb["script"] = str(raw["script"])
    if raw.get("body") is not None:
        body = raw["body"]
        fb["body"] = body if isinstance(body, str) else json.dumps(body, ensure_ascii=False)
    if raw.get("variants") and squad_id == "ads":
        variants = raw["variants"]
        if isinstance(variants, list) and variants:
            fb["body"] = json.dumps({"variants": variants}, ensure_ascii=False)
            fb["slides"] = [
                f"{v.get('angle', 'V')}: {v.get('hook', '')}" for v in variants if isinstance(v, dict)
            ]
            if isinstance(variants[0], dict):
                fb["caption"] = str(variants[0].get("hook") or fb["caption"])
                fb["cta"] = str(variants[0].get("cta") or fb["cta"])
    fb["progress"] = 100
    return fb


class ProductionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.pieces = PieceRepository(session)
        self.decisions = DecisionRepository(session)

    async def produce(
        self,
        piece: Piece,
        profile: Profile,
        *,
        option: dict[str, Any] | None = None,
        squad_id: str | None = None,
        theme: str | None = None,
        guidance: str | None = None,
        create_review: bool = True,
    ) -> tuple[Piece, StudioDecision | None]:
        """Generate visual package, move piece to review, optionally create revisao checkpoint."""
        net = piece.net or "ig"
        sid = resolve_squad_id(squad_id or piece.squad, net)
        package = await self._generate_package(
            profile,
            option,
            squad_id=sid,
            net=net,
            theme=theme or piece.title,
            guidance=guidance,
        )
        self._apply_package(piece, package, sid)

        review: StudioDecision | None = None
        if create_review:
            review = await self._create_review_decision(piece, profile, package)

        await self.session.flush()
        return piece, review

    def _apply_package(self, piece: Piece, package: dict[str, Any], squad_id: str) -> None:
        piece.title = package["title"]
        piece.subtitle = package.get("subtitle")
        piece.content_type = package.get("content_type") or piece.content_type or "post"
        piece.slides = package.get("slides")
        piece.caption = package.get("caption")
        piece.cta = package.get("cta")
        piece.tags = package.get("tags")
        piece.script = package.get("script")
        piece.body = package.get("body")
        piece.progress = package.get("progress") or 100
        piece.squad = SQUAD_LABELS.get(squad_id, squad_id)
        piece.stage = "review"
        piece.needs = True
        piece.status = "active"
        cur = list(piece.timeline) if piece.timeline else []
        cur.append(
            [
                datetime.now().strftime("%d/%m %H:%M"),
                SQUAD_LABELS.get(squad_id, "Squad"),
                f"Pacote {package.get('kind', 'visual')} gerado · pronto para revisão",
            ]
        )
        piece.timeline = cur

    async def _create_review_decision(
        self,
        piece: Piece,
        profile: Profile,
        package: dict[str, Any],
    ) -> StudioDecision:
        run_id = await self.decisions.next_run_id()
        kind_label = {
            "carousel": "Carrossel",
            "yt_script": "Roteiro YouTube",
            "ads": "Pacote de ads",
        }.get(str(package.get("kind")), "Pacote")
        decision = StudioDecision(
            id=str(uuid.uuid4()),
            profile_id=profile.id,
            run_id=run_id,
            kind="revisao",
            title=f"Revisão final · {piece.title}",
            subtitle=f"{kind_label} gerado pelo {piece.squad or 'squad'} — valide antes de publicar.",
            status="pending",
            options=None,
            selected_option_id=None,
            piece_id=piece.id,
            waiting_label="aguardando você",
            platform_label=(piece.net or "ig").upper(),
        )
        return await self.decisions.create(decision)

    async def _generate_package(
        self,
        profile: Profile,
        option: dict[str, Any] | None,
        *,
        squad_id: str,
        net: str,
        theme: str | None,
        guidance: str | None,
    ) -> dict[str, Any]:
        if not is_configured():
            from app.modules.ghostcli.notice import report_ai_link_error

            report_ai_link_error("GhostCLI sem chave. A produção usou um rascunho local.")
            return fallback_package(profile, option, squad_id=squad_id, net=net, theme=theme)

        ds = profile.design_system or {}
        f = _option_fields(option)
        schema_hint = {
            "ig-studio": (
                '{"kind":"carousel","title":"...","subtitle":"...","slides":["s1",...5a7],'
                '"caption":"...","cta":"...","tags":"...","script":"..."}'
            ),
            "carrosseis": (
                '{"kind":"carousel","title":"...","subtitle":"...","slides":["s1",...5a7],'
                '"caption":"...","cta":"...","tags":"...","script":"..."}'
            ),
            "yt-roteirista": (
                '{"kind":"yt_script","title":"...","subtitle":"...","slides":["0:00 Hook",...],'
                '"caption":"...","cta":"...","tags":"...","script":"roteiro completo markdown"}'
            ),
            "ads": (
                '{"kind":"ads","title":"...","variants":[{"id":"v1","angle":"...","hook":"...",'
                '"body":"...","cta":"..."},...3],"caption":"...","cta":"...","tags":"..."}'
            ),
        }.get(squad_id, '{"kind":"carousel","slides":[],"caption":"...","cta":"..."}')

        system = (
            "Você é o squad de produção visual do TAVIR Studio. "
            "Responda APENAS com JSON válido, sem markdown. "
            f"Schema esperado: {schema_hint}"
        )
        user = (
            f"Squad: {squad_id}\n"
            f"Rede: {net}\n"
            f"Perfil: {profile.name} ({profile.handle})\n"
            f"Nicho: {profile.niche}\n"
            f"Audiência: {profile.audience}\n"
            f"Tom: {ds.get('toneOfVoice') or profile.tone}\n"
            f"DS accent: {ds.get('accent') or profile.color}\n"
            f"Fazer: {ds.get('doList')}\n"
            f"Evitar: {ds.get('dontList')}\n"
            f"Pauta título: {f['title']}\n"
            f"Hook: {f['hook']}\n"
            f"Ângulo: {f['angle']}\n"
            f"Estilo: {f['style']}\n"
            f"Tema: {theme or '—'}\n"
            f"Orientação de ajuste: {guidance or '—'}\n"
        )
        try:
            content = await chat_completion(
                system=system,
                messages=[{"role": "user", "content": user}],
                max_tokens=2400,
                timeout=90.0,
            )
            parsed = _extract_json(content)
            return _normalize_package(
                parsed, profile, option, squad_id=squad_id, net=net, theme=theme
            )
        except Exception:
            return fallback_package(profile, option, squad_id=squad_id, net=net, theme=theme)
