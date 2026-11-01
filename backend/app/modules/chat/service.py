"""Chat do escritório — responde pelo motor padrão ligado em Integrações."""
import asyncio
import re
import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.chat.repository import ChatRepository
from app.modules.agents.repository import AgentRepository
from app.models.chat_message import ChatMessage
from app.modules.factory.engine_prefs import call_caption, office_call
from app.modules.chat.images import decode_uploads, save_images
from app.modules.ghostcli import chat_completion
from app.modules.ghostcli.client import GhostCliError
from app.modules.agents.prompt import build_agent_prompt, load_design_canon


class ChatService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.chat_repo = ChatRepository(session)
        self.agent_repo = AgentRepository(session)

    async def process_user_message(
        self,
        conv_id: str,
        text: str,
        images: list[dict] | None = None,
    ) -> tuple[ChatMessage, ChatMessage]:
        conv = await self.chat_repo.get_conversation(conv_id)
        if not conv:
            raise ValueError(f"Conversation {conv_id} not found")

        agent = await self.agent_repo.get_by_id(conv.agent_id)

        caption = (text or "").strip()
        decoded = decode_uploads(images)
        if not caption and not decoded:
            raise ValueError("Escreva uma mensagem ou anexe uma imagem.")
        message_id = f"m-{uuid.uuid4().hex[:8]}"
        stored_images = save_images(conv_id, message_id, decoded)

        user_msg = await self.chat_repo.add_message(
            conv_id=conv_id,
            role="user",
            text=caption,
            msg_id=message_id,
            images=stored_images,
        )

        settings = conv.settings or {}
        provider, model, effort, enabled = await office_call(settings.get("model"), settings.get("effort"))
        insp = settings.get("insp", 30)

        messages = await self.chat_repo.get_messages(conv_id)
        history = [{"role": m.role, "content": self._history_text(m)} for m in messages[-10:]]

        if not enabled:
            reply_text = "O motor padrão está desligado. Ligue-o em Integrações."
            actions: list[dict] = []
        else:
            focused = await self._focused_reply(
                agent=agent,
                history=history,
                model=model,
                effort=effort,
            )
            if focused is not None:
                reply_text, actions = focused
            else:
                reply_text = await self._call_engine(
                    agent=agent,
                    history=history,
                    provider=provider,
                    model=model,
                    effort=effort,
                    inspiration=insp,
                    images=decoded,
                )
                actions = []

        from app.modules.factory.actions import split_actions

        visible, parsed = split_actions(reply_text)
        reply_text = visible
        actions = actions or parsed
        meta = call_caption(provider, model, effort)

        assistant_msg = await self.chat_repo.add_message(
            conv_id=conv_id,
            role="assistant",
            text=self._plain_reply(reply_text),
            meta=meta,
            actions=actions or None,
        )

        return user_msg, assistant_msg

    async def _identity(self, agent, *, project_memory: str | None = None) -> str:
        if agent is None:
            return build_agent_prompt(name="Agente", role="Especialista")
        rows = await self.agent_repo.list_lessons(agent.id)
        lessons = [
            {
                "status": row.status,
                "title": (row.situation or "Lição")[:80],
                "situation": row.situation,
                "lesson": row.lesson,
                "why": row.why,
                "how_to_apply": row.how_to_apply,
            }
            for row in rows
        ]
        return build_agent_prompt(
            name=agent.name,
            role=agent.role,
            sector=agent.sector,
            soul_text=agent.soul_text,
            craft_text=agent.craft_text,
            canon_text=load_design_canon(agent.id),
            lessons=lessons,
            project_memory=project_memory,
        )

    async def _focused_reply(
        self,
        *,
        agent,
        history: list[dict],
        model: str,
        effort: str,
    ) -> tuple[str, list[dict]] | None:
        """Com projeto em foco, a conversa lê a pasta da demanda. Sem foco, o chat do elenco segue."""
        from app.models.office_settings import OfficeSettings
        from app.models.project import Project
        from app.modules.cursor_link.client import ask_in_workspace, cli_path
        from app.modules.factory.actions import split_actions
        from app.modules.factory.demands import chat_workspace, open_demand, order_path_for
        from app.modules.factory.project_control import ControlError, ensure_layout

        office = await self.session.get(OfficeSettings, "office")
        if office is None or not office.focused_project_id:
            return None
        project = await self.session.get(Project, office.focused_project_id)
        if project is None or not project.local_path:
            return None
        try:
            ensure_layout(project.local_path)
        except ControlError:
            return None
        demand = await open_demand(self.session, project.id, office.focused_demand_id)
        if demand is not None and demand.status in {"concluida", "recusada"}:
            active = None
        else:
            active = demand
        folder = chat_workspace(project, active)
        recent = [f"{item['role']}: {item['content']}" for item in history]
        from app.modules.factory.chat_reply import fonte_prompt, local_text, needs_source, retrato_prompt
        from app.modules.cursor_link.client import answer_inline

        stage = (active.dossier or {}).get("etapa") if active is not None else None
        question = history[-1]["content"] if history else ""
        direct = local_text(project, active, stage, question)
        if direct is not None:
            return direct, []
        binary = cli_path()
        if not binary:
            return ("O Cursor Agent não está instalado para ler a pasta do projeto em foco.", [])
        try:
            if needs_source(question):
                text = await asyncio.to_thread(
                    ask_in_workspace,
                    binary,
                    str(folder),
                    model or "",
                    "low",
                    fonte_prompt(project, active, stage, question),
                    None,
                    50.0,
                    str(order_path_for(folder)),
                )
            else:
                text = await asyncio.to_thread(
                    answer_inline,
                    binary,
                    "auto",
                    "low",
                    retrato_prompt(project, active, stage, recent, question),
                    40.0,
                )
        except RuntimeError as exc:
            return (str(exc), [])
        visible, actions = split_actions(text)
        return visible, actions

    async def _call_engine(
        self,
        agent,
        history: list[dict],
        provider: str,
        model: str,
        effort: str,
        inspiration: int,
        images: list[tuple[str, bytes, str]] | None = None,
    ) -> str:
        """Chama o motor já ajustado por office_call. O modelo fora do catálogo não entra."""
        identity = await self._identity(agent)
        system_prompt = (
            identity
            + f"\nNível de esforço: {effort}. Nível de inspiração criativa: {inspiration}/100.\n"
        )
        system_prompt += (
            "\nResponda sempre em português do Brasil, de forma concisa e operacional. "
            "Não descreva arquivos de trabalho, ferramentas nem o modo como recebeu a pergunta. "
            "Se houver imagem anexada, olhe a imagem e responda sobre ela. "
            "Se não souber algo, diga claramente e sugira próximos passos."
        )

        try:
            return await chat_completion(
                system=system_prompt,
                messages=history,
                model=model,
                effort=effort,
                provider=provider,
                max_tokens=1024,
                timeout=180.0,
                images=images,
            )
        except GhostCliError as exc:
            caption = call_caption(provider, model, effort)
            return f"[{caption}] {exc}."

    @staticmethod
    def _plain_reply(text: str) -> str:
        raw = text or ""
        if not re.match(r"^Vou (?:ler|localizar|abrir|consultar|verificar|buscar)\b", raw, re.IGNORECASE):
            return raw.strip()
        for index, char in enumerate(raw):
            if char not in ".!?":
                continue
            nxt = raw[index + 1] if index + 1 < len(raw) else ""
            if nxt.islower():
                continue
            cleaned = raw[index + 1 :].strip()
            return cleaned or raw.strip()
        return raw.strip()

    @staticmethod
    def _history_text(message: ChatMessage) -> str:
        text = message.text or ""
        count = len(message.images or [])
        if not count:
            return text
        note = "1 imagem anexada" if count == 1 else f"{count} imagens anexadas"
        return f"{text}\n[{note}]".strip()
