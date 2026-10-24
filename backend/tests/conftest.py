"""A esteira de teste não chama a GhostCLI. A entrega continua existindo."""

import pytest


@pytest.fixture(autouse=True)
def _factory_agent_without_network(monkeypatch):
    async def _fake(stage, project, relative, **kwargs):
        title = getattr(stage, "title", None) or relative
        body = (
            f"# {title}\n\n"
            "**Formato:** ASD-STE100\n\n"
            "## Situação\n\n"
            "Este relatório é a entrega de teste do agente.\n\n"
            "## O que li\n\n"
            "O teste não envia arquivo-base.\n\n"
            "## Entrega\n\n"
            f"O agente entregou `{relative}`.\n\n"
            "## Evidência\n\n"
            "O arquivo foi gravado no workspace.\n\n"
            "## Riscos\n\n"
            "Nenhum risco de teste.\n\n"
            "## Próximo passo\n\n"
            "Autorize o gate depois de ler o relatório.\n"
        )
        return body, "ghostcli: ok · STE100"

    monkeypatch.setattr("app.modules.factory.executor._agent_content", _fake)
