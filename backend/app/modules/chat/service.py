"""Chat service — orchestrates conversation, agent personas and contextual replies via GhostCLI gateway."""
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.chat.repository import ChatRepository
from app.modules.agents.repository import AgentRepository
from app.models.chat_message import ChatMessage
from app.modules.ghostcli import chat_completion, default_model
from app.modules.ghostcli.client import GhostCliError


class ChatService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.chat_repo = ChatRepository(session)
        self.agent_repo = AgentRepository(session)

    async def process_user_message(self, conv_id: str, text: str) -> tuple[ChatMessage, ChatMessage]:
        conv = await self.chat_repo.get_conversation(conv_id)
        if not conv:
            raise ValueError(f"Conversation {conv_id} not found")

        agent = await self.agent_repo.get_by_id(conv.agent_id)
        agent_name = agent.name if agent else "Agente"
        agent_role = agent.role if agent else "Especialista"

        # 1. Persist user message
        user_msg = await self.chat_repo.add_message(
            conv_id=conv_id,
            role="user",
            text=text,
        )

        # 2. Extract conversation settings
        settings = conv.settings or {}
        model = settings.get("model") or default_model()
        effort = settings.get("effort", "médio")
        insp = settings.get("insp", 30)

        # 3. Build message history from conversation for context
        messages = await self.chat_repo.get_messages(conv_id)
        history = [{"role": m.role, "content": m.text} for m in messages[-10:]]

        # 4. Generate response via GhostCLI gateway (OpenAI-compatible)
        reply_text = await self._call_ghostcli(
            agent_name=agent_name,
            agent_role=agent_role,
            soul_text=agent.soul_text if agent else None,
            history=history,
            model=model,
            effort=effort,
            inspiration=insp,
        )

        meta = f"{model} · esforço {effort} · inspiração {insp}"

        # 5. Persist assistant message
        assistant_msg = await self.chat_repo.add_message(
            conv_id=conv_id,
            role="assistant",
            text=reply_text,
            meta=meta,
        )

        return user_msg, assistant_msg

    async def _call_ghostcli(
        self,
        agent_name: str,
        agent_role: str,
        soul_text: str | None,
        history: list[dict],
        model: str,
        effort: str,
        inspiration: int,
    ) -> str:
        """Call GhostCLI gateway using OpenAI-compatible /v1/chat/completions endpoint."""
        system_prompt = (
            f"Você é {agent_name}, atuando como {agent_role} no TAVIR Escritório.\n"
            f"Nível de esforço: {effort}. Nível de inspiração criativa: {inspiration}/100.\n"
        )
        if soul_text:
            system_prompt += f"\n## Alma Operacional\n{soul_text}\n"
        system_prompt += (
            "\nResponda sempre em português do Brasil, de forma concisa e operacional. "
            "Se não souber algo, diga claramente e sugira próximos passos."
        )

        try:
            return await chat_completion(
                system=system_prompt,
                messages=history,
                model=model or default_model(),
                max_tokens=1024,
                timeout=60.0,
            )
        except GhostCliError as exc:
            return (
                f"[GhostCLI] {exc}. "
                f"Verifique a chave de API e o modelo '{model}' no painel do GhostCLI."
            )
