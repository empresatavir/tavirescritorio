"""Idempotent seed script for TAVIR initial data — 47 agents, projects, tasks, jobs, approvals, chat."""
import asyncio
import uuid
from datetime import datetime
from sqlalchemy import select
from app.shared.database import async_session
from app.models.agent import Agent
from app.models.project import Project
from app.models.task import Task
from app.models.job import Job
from app.models.approval import Approval
from app.models.event import Event
from app.models.chat_conversation import ChatConversation
from app.models.chat_message import ChatMessage
from app.models.template import EngineeringTemplate
from app.models.persona import Persona
from app.models.profile import Profile
from app.models.piece import Piece
from app.models.studio_decision import StudioDecision

# Full 47 Agents roster across 11 sectors
ROSTER_AGENTS_47 = [
    # 1. Estratégia (4)
    ("ag-01", "Arquiteto", "Planejamento Estratégico", "Estratégia", "busy", "planejamento,estrategia,roadmaps", "claude-sonnet-4", "#B7F34A", "AR", 342, 127.4, "2 min"),
    ("ag-07", "Analista", "Métricas & Analytics", "Estratégia", "active", "telemetria,custos,sparklines", "gpt-4o", "#f97316", "AN", 267, 112.7, "45 min"),
    ("ag-13", "Pesquisador de Mercado", "Benchmarking & Tendências", "Estratégia", "idle", "mercado,concorrencia,tendencias", "gpt-4o", "#f59e0b", "PM", 94, 38.5, "1 h"),
    ("ag-14", "Estrategista de Monetização", "Pricing & Modelos de Negócio", "Estratégia", "idle", "pricing,ofertas,cac,ltv", "claude-sonnet-4", "#10b981", "EM", 68, 29.1, "3 h"),

    # 2. Operação (4)
    ("ag-08", "Orquestrador", "Coordenação de Agentes", "Operação", "busy", "orquestracao,heartbeat,jobs", "claude-opus-4", "#ef4444", "OR", 1203, 340.9, "agora"),
    ("ag-15", "Cronos", "Agendador & Fila de Jobs", "Operação", "active", "scheduler,cron,priorizacao", "gpt-4o", "#84cc16", "CR", 850, 42.0, "5 min"),
    ("ag-16", "Sentinela", "Health Check & Monitoramento", "Operação", "active", "liveness,health,failover", "gpt-4o", "#06b6d4", "SE", 1420, 15.3, "1 min"),
    ("ag-17", "Dispatcher", "Roteamento de Eventos", "Operação", "idle", "eventos,routing,sse", "claude-sonnet-4", "#6366f1", "DI", 412, 58.2, "10 min"),

    # 3. Engenharia (6)
    ("ag-18", "Ari Arquiteto", "Engenharia de Software & Arquitetura", "Engenharia", "busy", "arquitetura,microsservicos,ddd", "claude-sonnet-4", "#3b82f6", "AA", 480, 182.0, "8 min"),
    ("ag-06", "Deployer", "Publicação & Release", "Engenharia", "offline", "deploy,vercel,git", "gpt-4o", "#06b6d4", "DP", 178, 45.6, "2 h"),
    ("ag-19", "Diego Sistemas", "Backend & APIs", "Engenharia", "busy", "fastapi,python,sqlite,sqlalchemy", "claude-sonnet-4", "#8b5cf6", "DS", 390, 115.4, "4 min"),
    ("ag-20", "Dev Frontend", "UI & WebApps SolidJS", "Engenharia", "active", "solidjs,vite,tailwind,css", "claude-sonnet-4", "#14b8a6", "DF", 310, 92.8, "12 min"),
    ("ag-21", "DBA Local", "SQLite & Migrações", "Engenharia", "idle", "sqlite,alembic,indices,backup", "gpt-4o", "#eab308", "DB", 145, 34.0, "40 min"),
    ("ag-22", "Integrador MCP", "Protocolos & Bridges Locais", "Engenharia", "idle", "mcp,stdio,sse,bridges", "claude-opus-4", "#ec4899", "IM", 88, 62.5, "2 h"),

    # 4. Qualidade & QA (4)
    ("ag-05", "Revisor", "QA & Aprovação", "Qualidade", "busy", "qa,revisao,gates", "claude-sonnet-4", "#8b5cf6", "RV", 445, 98.3, "3 min"),
    ("ag-23", "Tester Automatizado", "Testes E2E & Pytest", "Qualidade", "active", "pytest,unit,integration", "gpt-4o", "#10b981", "TA", 530, 48.0, "15 min"),
    ("ag-24", "Auditor Seg/LGPD", "Segurança & Hardening", "Qualidade", "idle", "seguranca,cve,lgpd,audit", "claude-sonnet-4", "#ef4444", "AS", 124, 67.2, "1 h"),
    ("ag-25", "Validador Visual", "Fidelidade Design System", "Qualidade", "active", "tokens,pixel-perfect,wcag", "dall-e-3", "#f43f5e", "VV", 210, 89.0, "20 min"),

    # 5. Conteúdo & Editorial (5)
    ("ag-03", "Redator", "Copywriting & Conteúdo", "Conteúdo", "busy", "copywriting,conteudo,headlines", "claude-sonnet-4", "#3b82f6", "RE", 891, 203.5, "1 min"),
    ("ag-26", "Roteirista", "Vídeos & Podcasts", "Conteúdo", "idle", "roteiro,storytelling,audio", "claude-sonnet-4", "#8b5cf6", "RO", 180, 74.2, "2 h"),
    ("ag-27", "Editor de Texto", "Gramática & Tom de Voz", "Conteúdo", "active", "revisao-gramatical,clareza", "gpt-4o", "#06b6d4", "ET", 340, 52.1, "18 min"),
    ("ag-28", "Ghostwriter", "Artigos & Livros Especializados", "Conteúdo", "idle", "livros,artigos-longos", "claude-opus-4", "#f97316", "GW", 112, 145.0, "4 h"),
    ("ag-29", "Headline Specialist", "Ganchos & CTAs de Conversão", "Conteúdo", "active", "headlines,ctas,ganchos", "gpt-4o", "#eab308", "HS", 420, 38.6, "25 min"),

    # 6. Design & Visual (4)
    ("ag-04", "Designer", "Design Visual", "Design", "idle", "ui,design-tokens,figma", "dall-e-3", "#ec4899", "DE", 214, 156.8, "32 min"),
    ("ag-30", "Marina + Yuri", "UX Research & Wireframing", "Design", "active", "ux,wireframe,fluxos", "claude-sonnet-4", "#14b8a6", "MY", 175, 84.3, "45 min"),
    ("ag-31", "Ilustrador", "Thumbnails & Mídias DALL-E", "Design", "idle", "midias,thumbnails,banners", "dall-e-3", "#a855f7", "IL", 130, 95.0, "3 h"),
    ("ag-32", "Motion Designer", "Animações & Micro-interações", "Design", "idle", "micro-animacoes,css-keyframes", "gpt-4o", "#06b6d4", "MD", 92, 41.5, "5 h"),

    # 7. Social Media & Plataformas (4)
    ("ag-09", "Social Media", "Instagram & LinkedIn", "Social", "active", "instagram,linkedin,cadencia", "gpt-4o", "#14b8a6", "SM", 156, 67.4, "1 h"),
    ("ag-33", "Gestor YouTube", "SEO de Vídeo & Tags", "Social", "idle", "youtube,seo,tags,descricoes", "gpt-4o", "#ef4444", "GY", 88, 31.0, "2 h"),
    ("ag-34", "Gestor TikTok", "Formatos Curtos & Retenção", "Social", "idle", "tiktok,shorts,retencao", "gpt-4o", "#ec4899", "GT", 74, 25.8, "4 h"),
    ("ag-35", "Community Manager", "Interações & Respostas", "Social", "active", "comentarios,sac,engajamento", "claude-sonnet-4", "#3b82f6", "CM", 290, 54.0, "30 min"),

    # 8. Comercial & Vendas (4)
    ("ag-11", "Comercial", "Propostas & Funil", "Comercial", "active", "funil,propostas,vendas", "claude-sonnet-4", "#a855f7", "CO", 134, 78.5, "20 min"),
    ("ag-36", "SDR Qualificador", "Triagem & Coleta de Requisitos", "Comercial", "idle", "leads,sdr,qualificacao", "gpt-4o", "#10b981", "SD", 195, 42.0, "1 h"),
    ("ag-37", "Negociador", "Fechamento & Contratos", "Comercial", "idle", "contratos,juridico,negociacao", "claude-sonnet-4", "#f59e0b", "NE", 65, 39.4, "5 h"),
    ("ag-38", "Customer Success", "Onboarding de Clientes", "Comercial", "active", "onboarding,cs,satisfacao", "gpt-4o", "#06b6d4", "CS", 140, 31.2, "50 min"),

    # 9. Finanças & Orçamento (3)
    ("ag-10", "Finanças", "Controle Orçamentário", "Finanças", "error", "orcamento,faturas,conciliacao", "gpt-4o", "#84cc16", "FI", 89, 23.1, "3 h"),
    ("ag-39", "Faturador", "Faturas & Conciliação", "Finanças", "idle", "nfe,cobrancas,faturas", "gpt-4o", "#10b981", "FA", 110, 18.5, "2 h"),
    ("ag-40", "Controlador de Custos IA", "Limites & Tokens", "Finanças", "active", "tokens,cost-control,alertas", "claude-sonnet-4", "#f97316", "CC", 320, 64.0, "15 min"),

    # 10. Conhecimento & Cérebro (5)
    ("ag-02", "Pesquisador", "Coleta & Análise", "Conhecimento", "active", "pesquisa,vault,embeddings", "gpt-4o", "#f59e0b", "PE", 518, 89.2, "15 min"),
    ("ag-41", "Curador de Vault", "Indexação & Síntese", "Conhecimento", "active", "vault,markdown,obsidian", "claude-sonnet-4", "#8b5cf6", "CV", 240, 68.0, "35 min"),
    ("ag-42", "Sintetizador", "Resumos Executivos & MOCs", "Conhecimento", "idle", "resumos,mocs,sinteses", "gpt-4o", "#06b6d4", "SI", 190, 41.3, "2 h"),
    ("ag-43", "Conector Semântico", "Grafos & Associações", "Conhecimento", "idle", "grafos,conexoes,relacoes", "claude-opus-4", "#14b8a6", "CS", 75, 59.0, "6 h"),
    ("ag-44", "Dora Descoberta", "Descoberta & Requisitos", "Conhecimento", "active", "descoberta,requisitos,entrevistas", "claude-sonnet-4", "#3b82f6", "DD", 160, 72.4, "40 min"),

    # 11. Documentação & Governança (4)
    ("ag-12", "Documentador", "Docs & Manuais", "Documentação", "busy", "openapi,manuais,docs", "claude-sonnet-4", "#6366f1", "DO", 312, 95.2, "5 min"),
    ("ag-45", "Dante Documentação", "OpenAPI & Manuais Técnicos", "Documentação", "active", "openapi,swagger,specs", "gpt-4o", "#84cc16", "DN", 185, 44.0, "25 min"),
    ("ag-46", "Guardião de Regras", "Compliance de Diretrizes", "Documentação", "idle", "agents-md,cursorrules,qualidade", "claude-sonnet-4", "#ef4444", "GR", 140, 51.0, "1 h"),
    ("ag-47", "Historiador do Sistema", "Changelog & Memória", "Documentação", "idle", "changelog,historico,decisoes", "gpt-4o", "#a855f7", "HS", 95, 22.8, "3 h"),
]

INITIAL_TASKS = [
    ("task-01", 1, "Relatório de custos Q3 — revisão final", "in_progress", "ag-07", "high", "Estratégia", "Arquiteto", ["Redator → Revisor"], ["Aprovação CEO"], "job-001", ["financeiro", "relatório"], "Revisar o relatório de custos do 3º trimestre antes do envio à diretoria."),
    ("task-02", 2, "Conteúdo LP Nicho Advocacia", "in_progress", "ag-03", "normal", "Conteúdo", None, ["Redator → Revisor → Deployer"], ["QA Revisor"], "job-002", ["lp", "copy"], "Produzir o texto completo da landing do nicho de advocacia: headline, dores, prova social e CTA."),
    ("task-03", 3, 'Capítulo "Frameworks de Crescimento"', "in_progress", "ag-03", "high", "Conteúdo", "Arquiteto", ["Redator → Revisor"], ["Aprovação Editorial"], "job-003", ["livro", "ia-livros"], "Escrever o capítulo do livro IA Livros com base em 3 fontes do vault."),
    ("task-04", 4, "Otimização SEO landing principal", "pending", "ag-08", "normal", "Engenharia", None, None, None, None, ["seo", "landing"], "Aplicar recomendações de SEO técnico na landing principal."),
    ("task-05", 5, "Criativos Instagram — 5 variações", "pending", "ag-09", "low", "Social", None, None, None, None, ["instagram", "criativos"], "Gerar 5 variações de criativo para o post da semana no Instagram."),
    ("task-06", 6, "Auditoria de segurança API", "done", "ag-05", "critical", "Engenharia", None, ["Revisor → Deployer"], ["Aprovado"], "job-006", ["segurança", "audit"], "Varredura de segurança nos 12 endpoints públicos da API."),
    ("task-07", 7, "Deploy landing Meridian", "pending", "ag-06", "high", "Engenharia", "Orquestrador", None, ["Requer SUPABASE_URL"], None, ["deploy", "bug"], "Publicar a landing do cliente Meridian Capital na conta travada do projeto."),
    ("task-08", 8, "Indexar novas páginas no vault", "done", "ag-02", "normal", "Conhecimento", None, None, None, None, ["vault", "indexação"], "Indexar 8 novas páginas no vault do Cérebro."),
    ("task-09", 9, "Roadmap Q4 — IA Livros", "pending", "ag-01", "critical", "Estratégia", "CEO", None, ["Aprovação CEO"], None, ["roadmap", "planejamento"], "Consolidar o roadmap do 4º trimestre da iniciativa IA Livros."),
    ("task-10", 10, "Proposta comercial — cliente Atlas", "pending", "ag-11", "high", "Comercial", None, None, None, None, ["proposta", "vendas"], "Montar a proposta comercial da Atlas Holdings."),
    ("task-11", 11, "Documentação API v2", "in_progress", "ag-12", "normal", "Documentação", None, None, None, None, ["docs", "api"], "Documentar os endpoints da API v2 no padrão OpenAPI."),
    ("task-12", 12, "Análise de funil — setembro", "done", "ag-07", "normal", "Comercial", None, None, None, None, ["funil", "analytics"], "Analisar o funil de setembro e apontar as 3 maiores quedas de conversão."),
]

INITIAL_JOBS = [
    ("job-001", "task-01", "ag-07", "running", "gpt-4o", "médio", 5.0, None),
    ("job-002", "task-02", "ag-05", "running", "claude-sonnet-4", "baixo", 2.0, None),
    ("job-003", "task-03", "ag-03", "running", "claude-sonnet-4", "alto", 8.0, None),
    ("job-004", "task-04", "ag-08", "queued", "claude-opus-4", "médio", 6.0, None),
    ("job-005", "task-05", "ag-09", "queued", "gpt-4o", "baixo", 2.0, None),
    ("job-006", "task-06", "ag-05", "succeeded", "claude-sonnet-4", "alto", 10.0, None),
    ("job-007", "task-07", "ag-06", "failed", "gpt-4o", "médio", 3.0, "Erro: variável de ambiente SUPABASE_URL ausente"),
]

INITIAL_APPROVALS = [
    ("ap-01", "Roadmap Q4 IA Livros — aprovar priorização", "authorization", None, "task-09", "ag-01", "pending", "high", "Muda a ordem de trabalho de Redator e Pesquisador no trimestre.", "O Arquiteto propõe 3 iniciativas para Q4. Requer confirmação antes de detalhar.", "O job retoma e o Arquiteto detalha as 3 frentes.", "A task volta para replanejamento."),
    ("ap-02", "Deploy landing Meridian — variável ausente", "checkpoint", "job-007", "task-07", "ag-06", "pending", "high", "O build parou porque a variável SUPABASE_URL não existe.", "Build falhou por falta de SUPABASE_URL. Autorizar retry com config correta?", "O Deployer usa a credencial configurada e refaz o build.", "O deploy fica suspenso e a task permanece bloqueada."),
    ("ap-03", "Headline LP acima do limite — manter ou cortar?", "review", None, "task-02", "ag-05", "pending", "low", "A headline da LP de advocacia passou do limite de 60 caracteres.", "Headline tem 68 caracteres (máx 60). Revisor pede decisão editorial.", "A headline é mantida como exceção.", "O Redator reescreve a headline dentro do limite."),
    ("ap-04", "Gasto mensal acima do teto — modelo opus-4", "authorization", "job-004", "task-04", "ag-08", "pending", "medium", "O job de SEO da landing principal usa claude-opus-4.", "Orquestrador ultrapassou teto de $300/mês em claude-opus-4. Autorizar aumento?", "O teto sobe só para esta task e o job-004 segue na fila.", "O job-004 muda para claude-sonnet-4 antes de rodar."),
    ("ap-05", "Proposta Atlas — contra-assinatura", "checkpoint", None, "task-10", "ag-11", "pending", "medium", "A Atlas Holdings aceitou a proposta via ponte Supabase.", "Proposta enviada, cliente aceitou. Registrar contra-assinatura local.", "A proposta é contra-assinada e o projeto aberto.", "A proposta volta para o Comercial renegociar."),
    ("ap-06", "2 recomendações de hardening — API", "review", "job-006", "task-06", "ag-05", "approved", "low", "A auditoria de segurança da API terminou com 2 recomendações.", "Rate limiting + headers de segurança. Aprovado, aplicar no próximo deploy.", "O Deployer aplica as 2 recomendações.", "As recomendações ficam registradas sem aplicação."),
]

INITIAL_CHAT_CONVERSATIONS = [
    {
        "id": "cv-1",
        "agent_id": "ag-06",
        "title": "Variável SUPABASE_URL no deploy Meridian",
        "settings": {
            "model": "gpt-4o",
            "effort": "médio",
            "time": "2 min",
            "tokens": "1024",
            "insp": 30,
            "memory": True,
            "vault": True,
            "tasks": True,
        },
        "messages": [
            ("m-1", "user", "Por que o deploy da landing Meridian falhou?", None),
            ("m-2", "assistant", "O build parou ao ler SUPABASE_URL, que não está cadastrada na conta vercel · tavir travada no projeto meridian-landing. O checkpoint ficou em 45%. Assim que a variável for cadastrada, refaço o build a partir desse ponto.", "gpt-4o · esforço médio · inspiração 30"),
        ]
    },
    {
        "id": "cv-2",
        "agent_id": "ag-01",
        "title": "Priorização do roadmap Q4",
        "settings": {
            "model": "claude-sonnet-4",
            "effort": "alto",
            "time": "5 min",
            "tokens": "2048",
            "insp": 30,
            "memory": True,
            "vault": True,
            "tasks": True,
        },
        "messages": [
            ("m-3", "user", "Quais são as 3 frentes que você propôs para o Q4 do IA Livros?", None),
            ("m-4", "assistant", "Propus três frentes, nesta ordem: 1) fechar os capítulos em andamento, começando por \"Frameworks de Crescimento\"; 2) montar o funil de lançamento com a landing e o lead magnet; 3) preparar a versão em áudio. A priorização está na aprovação ap-01 e o job-009 segue pausado até a sua decisão.", "claude-sonnet-4 · esforço alto · inspiração 30"),
        ]
    }
]

async def seed():
    async with async_session() as session:
        # 1. Seed agents (full 47 roster)
        for ag_id, name, role, sector, status, skills, model, color, initials, jobs_cnt, cost, last_r in ROSTER_AGENTS_47:
            existing = await session.get(Agent, ag_id)
            soul = f"# Propósito\nAtuar como {role} no setor {sector} com autonomia supervisionada na TAVIR.\n\n# Como trabalha\n- Executa jobs respeitando o teto de gastos estipulado\n- Valida critérios de aceite contra o planejamento de teste\n- Registra handoffs formais entre etapas\n\n# Nunca faz\n- Não publica sem aprovação de gates humanos\n- Não altera escopo de outros setores sem alinhamento\n\n# Tom de voz\nEstruturado, objetivo e operacional.\n\n# Escala para\nOrquestrador e CEO."
            if not existing:
                session.add(
                    Agent(
                        id=ag_id,
                        name=name,
                        role=role,
                        sector=sector,
                        status=status,
                        skills=skills,
                        model_provider=model,
                        soul_text=soul,
                        total_jobs=jobs_cnt,
                        total_cost=cost,
                        avatar_color=color,
                        initials=initials,
                        last_run=last_r,
                    )
                )
            else:
                existing.role = role
                existing.sector = sector
                existing.status = status
                existing.skills = skills
                existing.model_provider = model
                existing.total_jobs = jobs_cnt
                existing.total_cost = cost
                existing.avatar_color = color
                existing.initials = initials
                existing.last_run = last_r
                if not existing.soul_text:
                    existing.soul_text = soul
        await session.commit()
        print(f"Seeded {len(ROSTER_AGENTS_47)} agents successfully")

        # 2. Seed main project
        proj_id = "proj-tavir-escritorio"
        project = await session.get(Project, proj_id)
        if not project:
            res = await session.execute(select(Project).limit(1))
            first = res.scalars().first()
            if first:
                proj_id = first.id
            else:
                session.add(
                    Project(
                        id=proj_id,
                        slug="tavir-escritorio",
                        name="TAVIR Escritório",
                        client="TAVIR",
                        status="active",
                        description="Painel operacional local single-user",
                    )
                )
                await session.commit()

        # 3. Seed tasks
        for t_id, seq, title, status, ag_id, prio, sector, esc, handoffs, gates, job_id, tags, desc in INITIAL_TASKS:
            existing_task = await session.get(Task, t_id)
            if not existing_task:
                session.add(
                    Task(
                        id=t_id,
                        seq=seq,
                        project_id=proj_id,
                        title=title,
                        description=desc,
                        status=status,
                        priority=prio,
                        assignee_agent_id=ag_id,
                        sector=sector,
                        escalation=esc,
                        handoffs=handoffs,
                        gates=gates,
                        tags=tags,
                        active_job_id=job_id,
                    )
                )
        await session.commit()

        # 4. Seed jobs
        for j_id, task_id, ag_id, status, model, effort, ceiling, err in INITIAL_JOBS:
            existing_job = await session.get(Job, j_id)
            if not existing_job:
                session.add(
                    Job(
                        id=j_id,
                        task_id=task_id,
                        project_id=proj_id,
                        agent_id=ag_id,
                        origin="manual",
                        model_name=model,
                        effort=effort,
                        budget_ceiling=ceiling,
                        status=status,
                        error_message=err,
                    )
                )
        await session.commit()

        # 5. Seed approvals
        for ap_id, title, a_type, j_id, t_id, ag_id, status, impact, reason, desc, on_app, on_rej in INITIAL_APPROVALS:
            existing_appr = await session.get(Approval, ap_id)
            if not existing_appr:
                session.add(
                    Approval(
                        id=ap_id,
                        title=title,
                        type=a_type,
                        job_id=j_id,
                        task_id=t_id,
                        requester_agent_id=ag_id,
                        status=status,
                        impact=impact,
                        reason=reason,
                        description=desc,
                        on_approve_text=on_app,
                        on_reject_text=on_rej,
                    )
                )
        await session.commit()

        # 6. Seed chat conversations & messages
        for conv_data in INITIAL_CHAT_CONVERSATIONS:
            cid = conv_data["id"]
            existing_conv = await session.get(ChatConversation, cid)
            if not existing_conv:
                session.add(
                    ChatConversation(
                        id=cid,
                        agent_id=conv_data["agent_id"],
                        title=conv_data["title"],
                        settings=conv_data["settings"],
                    )
                )
                await session.flush()
                for mid, role, text, meta in conv_data["messages"]:
                    existing_msg = await session.get(ChatMessage, mid)
                    if not existing_msg:
                        session.add(
                            ChatMessage(
                                id=mid,
                                conversation_id=cid,
                                role=role,
                                text=text,
                                meta=meta,
                            )
                        )
        await session.commit()
        print("Chat conversations and messages seeded successfully")

        # 7. Seed engineering templates (6 esteiras canônicas V1 — ver factory/esteiras.py)
        from app.modules.factory.esteiras import ESTEIRAS

        for t_id, esteira in ESTEIRAS.items():
            existing_tpl = await session.get(EngineeringTemplate, t_id)
            # Persistimos defs estruturadas (lista de dicts) — B0
            stages_payload = esteira["stages"]
            if not existing_tpl:
                session.add(
                    EngineeringTemplate(
                        id=t_id,
                        name=esteira["name"],
                        category=esteira["category"],
                        mode=esteira["mode"],
                        description=esteira["description"],
                        mesas=esteira["mesas"],
                        stages=stages_payload,
                        owner_role=esteira["owner_role"],
                        sort_order=esteira["sort_order"],
                        gate_required=True,
                    )
                )
            else:
                existing_tpl.name = esteira["name"]
                existing_tpl.description = esteira["description"]
                existing_tpl.mesas = esteira["mesas"]
                existing_tpl.stages = stages_payload
                existing_tpl.owner_role = esteira["owner_role"]
                existing_tpl.sort_order = esteira["sort_order"]
        await session.commit()
        print("Engineering templates seeded successfully")

        # 8. Seed factory projects
        factory_projs = [
            ("fp-1", "lp-advocacia", "LP Nicho Advocacia", "Nicho Advocacia", "lp-c", 4, 10, "running", "github.com/empresatavir/lp-advocacia", "netlify · travada", "SolidJS + Tailwind + Vite", "Converter sócios de escritórios de advocacia", ["Headline + Hero", "Grid de dores e soluções", "Prova social e casos", "Formulário"]),
            ("fp-2", "saas-gestao-contabil", "SaaS Gestão Contábil", "ContabHub", "sy-c", 2, 13, "paused", "github.com/empresatavir/contabhub-api", "railway · travada", "FastAPI + PostgreSQL + SolidJS", "Automatizar conciliação fiscal", ["Autenticação Gov.br", "Leitura XML NFe", "Cálculo DAS", "Dashboard"]),
            ("fp-3", "mentoria-ia-executivos", "Oferta Mentoria IA Executivos", "TAVIR Educação", "of-c", 5, 10, "running", None, "hubspot · crm", "Documento Comercial + Funil", "Turma fechada para 15 CTOs", ["Ementa 8 encontros", "Modelo de precificação", "Contrato e SLA"]),
        ]
        for p_id, slug, name, comp, t_code, s_done, s_tot, status, repo, dep, stack, goal, scope in factory_projs:
            existing_fp = await session.get(Project, p_id)
            if not existing_fp:
                session.add(
                    Project(
                        id=p_id,
                        slug=slug,
                        name=name,
                        client=comp,
                        company=comp,
                        template_code=t_code,
                        stages_done=s_done,
                        total_stages=s_tot,
                        status=status,
                        repo_url=repo,
                        deploy_target=dep,
                        stack=stack,
                        goal=goal,
                        scope_items=scope,
                        pendencies=[{"id": "pnd-1", "kind": "decision", "title": "Headline acima do limite", "from": "Revisor", "text": "Headline tem 68 caracteres (máx 60).", "fix": "Revisor ajusta headline."}] if status == "paused" else [],
                        kanban_cards=[{"title": "Briefing e personas", "column": "done", "mesa": "Dora Descoberta"}, {"title": "Prova visual", "column": "doing", "mesa": "Marina + Yuri"}],
                        files=[{"kind": "html", "name": "index.html", "mesa": "Marina + Yuri"}],
                        keys={"SUPABASE_URL": "ok"} if repo else {},
                        event_log=[["28/09 09:00", "Operação", "Projeto inicializado na esteira"]],
                    )
                )
            else:
                existing_fp.template_code = t_code
                existing_fp.company = comp
                existing_fp.stages_done = s_done
                existing_fp.total_stages = s_tot
        await session.commit()
        print("Factory projects seeded successfully")

        # 9. Seed studio profiles (alinhados ao FE Studio)
        def _ds(accent: str, tone: str = "didático, direto e sem hype") -> dict:
            return {
                "primary": "#0B1220",
                "secondary": "#F4F6F2",
                "accent": accent,
                "fontDisplay": "Instrument Sans",
                "fontBody": "Instrument Sans",
                "toneOfVoice": tone,
                "doList": "Usar prova, números e CTA claro",
                "dontList": "Prometer resultado financeiro garantido",
                "visualNotes": "Alto contraste, tipografia forte, poucas cores",
            }

        studio_profiles = [
            {
                "id": "pf-carlos",
                "name": "Carlos Junior",
                "handle": "@carlosjunior",
                "company": "TAVIR",
                "niche": "IA & Negócios",
                "audience": "Founders e operadores que querem IA com controle",
                "tone": "didático, direto e sem hype",
                "context": "Perfil pessoal do CEO. Foco em sistemas, operação e IA com supervisão humana.",
                "color": "#B7F34A",
                "initials": "CJ",
                "cycle_goal": 24,
                "cycle_done": 18,
                "networks": [
                    {"net": "ig", "handle": "@carlosjunior", "url": "https://instagram.com/carlosjunior", "followers": 18400, "engagement": 4.2},
                    {"net": "yt", "handle": "Carlos Junior", "url": "https://youtube.com/@carlosjunior", "followers": 9200, "engagement": 6.1},
                    {"net": "li", "handle": "Carlos Junior", "url": "https://linkedin.com/in/carlosjunior", "followers": 11200, "engagement": 3.4},
                ],
                "design_system": _ds("#B7F34A"),
            },
            {
                "id": "pf-datavir",
                "name": "Datavir",
                "handle": "@datavir",
                "company": "TAVIR · Datavir",
                "niche": "Dados e BI para PMEs",
                "audience": "Donos e gestores que ainda decidem por planilha",
                "tone": "didático e direto",
                "context": "Consultoria de dados da TAVIR. Nunca prometer resultado financeiro.",
                "color": "#1BC5BD",
                "initials": "DV",
                "cycle_goal": 12,
                "cycle_done": 5,
                "networks": [
                    {"net": "li", "handle": "Datavir", "url": "https://linkedin.com/company/datavir", "followers": 3400, "engagement": 2.8},
                    {"net": "ig", "handle": "@datavir", "url": "https://instagram.com/datavir", "followers": 2100, "engagement": 3.1},
                ],
                "design_system": _ds("#1BC5BD", "didático e direto"),
            },
            {
                "id": "pf-canal",
                "name": "IA na Prática",
                "handle": "@ianapratica",
                "company": "TAVIR",
                "niche": "IA aplicada ao trabalho",
                "audience": "Profissionais que querem usar IA no dia a dia",
                "tone": "curioso e prático",
                "context": "Canal de episódios semanais com demonstrações.",
                "color": "#F2BC59",
                "initials": "IA",
                "cycle_goal": 16,
                "cycle_done": 9,
                "networks": [
                    {"net": "yt", "handle": "IA na Prática", "url": "https://youtube.com/@ianapratica", "followers": 15600, "engagement": 7.4},
                    {"net": "ig", "handle": "@ianapratica", "url": "https://instagram.com/ianapratica", "followers": 8800, "engagement": 5.2},
                ],
                "design_system": _ds("#F2BC59", "curioso e prático"),
            },
        ]
        for pf in studio_profiles:
            existing_pf = await session.get(Profile, pf["id"])
            if not existing_pf:
                session.add(Profile(**pf, platform="multi", status="active", guidelines=pf["context"]))
            else:
                for k, v in pf.items():
                    if k != "id":
                        setattr(existing_pf, k, v)
                existing_pf.guidelines = pf["context"]
                existing_pf.platform = "multi"
                existing_pf.status = "active"
        await session.commit()
        print("Studio profiles seeded successfully")

        # 10. Seed studio pieces
        studio_pieces = [
            {
                "id": "pc-6",
                "num": "ST-046",
                "profile_id": "pf-carlos",
                "net": "ig",
                "stage": "review",
                "title": "Sua agenda está indecisa",
                "subtitle": "Pacote final",
                "needs": True,
                "caption": "Você não precisa de mais uma ferramenta. Precisa decidir quais escolhas não quer refazer toda semana. Neste carrossel, reuni as 3 decisões que devolvem foco para a operação.",
                "cta": "Salve este mapa e compartilhe com quem vive apagando incêndios.",
                "tags": "#produtividade #sistemas #criadores #gestão #inteligênciaartificial",
                "slides": [
                    "Sua agenda não está cheia.\nEla está indecisa.",
                    "O problema não é volume.",
                    "São as microdecisões.",
                    "Três decisões que devolvem foco.",
                    "Salve e compartilhe.",
                ],
                "script": "Carrossel 5 slides · revisão humana",
                "squad": "Instagram Studio",
            },
            {
                "id": "pc-7",
                "num": "ST-047",
                "profile_id": "pf-carlos",
                "net": "li",
                "stage": "review",
                "title": "Ritual de segunda",
                "subtitle": "3 pautas",
                "needs": True,
                "caption": "Toda segunda eu abro a semana com as mesmas 3 perguntas. Não é motivação — é protocolo.",
                "cta": "Salve o ritual e use na próxima abertura de sprint.",
                "tags": "#operação #liderança #sistemas #produtividade",
                "slides": [
                    "Ritual de segunda.\nTrês perguntas, zero improviso.",
                    "1. O que não pode falhar esta semana?",
                    "2. O que estamos fingindo que é urgente?",
                    "3. Quem decide o quê — e com qual dado?",
                ],
                "script": "Post LinkedIn",
            },
            {
                "id": "pc-01",
                "num": "ST-031",
                "profile_id": "pf-datavir",
                "net": "li",
                "stage": "review",
                "title": "Por que sua PME ainda decide no escuro",
                "needs": True,
                "caption": "Quantas decisões desta semana tiveram dado por trás?",
                "tags": "#dados #bi #pme",
                "script": 'Abertura com a pergunta "quantas decisões tiveram dado por trás?".',
            },
            {
                "id": "pc-02",
                "num": "ST-032",
                "profile_id": "pf-datavir",
                "net": "ig",
                "stage": "pauta",
                "title": "3 planilhas que deveriam ser dashboard",
                "needs": True,
                "caption": "Se você ainda gasta 4 horas por semana copiando dados...",
                "tags": "#dashboard #automacao",
                "script": "Carrossel de 5 slides mostrando antes e depois.",
            },
            {
                "id": "pc-03",
                "num": "ST-033",
                "profile_id": "pf-canal",
                "net": "yt",
                "stage": "prod",
                "title": "Como criar um agente que analisa PDF em 5 min",
                "subtitle": "roteiro",
                "progress": 55,
                "squad": "YouTube Roteirista",
                "caption": "Neste vídeo vamos montar um agente do zero.",
                "tags": "#ia #python #tutorial",
                "script": "Tutorial passo a passo usando modelo local e parser.",
            },
            {
                "id": "pc-05",
                "num": "ST-035",
                "profile_id": "pf-carlos",
                "net": "ig",
                "stage": "done",
                "title": "Pare de otimizar tarefas",
                "subtitle": "Publicado",
                "caption": "Otimizar a tarefa errada só acelera o caos.",
                "tags": "#sistemas #foco",
                "status": "published",
            },
        ]
        for pc in studio_pieces:
            status = pc.get("status") or ("published" if pc["stage"] == "done" else "draft")
            images = (
                ["Imagem 1200x1200"]
                if pc["net"] == "li"
                else ["Thumbnail 1920x1080"]
                if pc["net"] == "yt"
                else ["Imagem 1080x1350"]
            )
            fields = {k: v for k, v in pc.items() if k not in ("id", "status")}
            existing_pc = await session.get(Piece, pc["id"])
            if not existing_pc:
                session.add(
                    Piece(
                        id=pc["id"],
                        **fields,
                        content_type="post",
                        images=images,
                        timeline=[[datetime.now().strftime("%d/%m %H:%M"), "Operação", "Peça inicializada no Studio"]],
                        status=status,
                        published_url=f"https://tavir.io/content/{pc['num']}" if pc["stage"] == "done" else None,
                    )
                )
            else:
                for k, v in fields.items():
                    setattr(existing_pc, k, v)
                existing_pc.status = status
                existing_pc.images = images
        await session.commit()
        print("Studio pieces seeded successfully")

        # 11. Seed studio decisions
        oracle_options = [
            {
                "id": "opt-a",
                "label": "OPÇÃO A",
                "style": "CONTRARIAN",
                "fit": 94,
                "title": "Produtividade não é fazer mais. É decidir menos.",
                "angle": "Desconstruir a rotina lotada e mostrar o custo cognitivo das microdecisões.",
                "hook": "“Sua agenda não está cheia. Ela está indecisa.”",
                "sources": "MIT Sloan · HBR · Dados TAVIR",
                "whyNow": "Conecta uma dor latente ao posicionamento de sistemas e tem alto potencial de salvamento.",
            },
            {
                "id": "opt-b",
                "label": "OPÇÃO B",
                "style": "PRÁTICO",
                "fit": 88,
                "title": "O ritual de 12 minutos que organiza uma semana inteira.",
                "angle": "Entregar um framework visual de priorização em quatro movimentos replicáveis.",
                "hook": "“Antes de abrir o Notion, responda estas 4 perguntas.”",
                "sources": "Método Ivy Lee · Shape Up · Pesquisa própria",
                "whyNow": "Formato utilitário com forte histórico de compartilhamento neste perfil.",
            },
            {
                "id": "opt-c",
                "label": "OPÇÃO C",
                "style": "BASTIDORES",
                "fit": 81,
                "title": "Como uma equipe pequena publica como uma redação.",
                "angle": "Abrir o processo real, incluindo gargalos, automações e decisões humanas.",
                "hook": "“Não contratamos mais pessoas. Mudamos a esteira.”",
                "sources": "Cases Buffer · Linear · Operação TAVIR",
                "whyNow": "Humaniza a marca e cria autoridade, mas exige mais prova visual para performar.",
            },
        ]
        studio_decisions = [
            {
                "id": "dec-1",
                "profile_id": "pf-carlos",
                "run_id": "TVR-2841",
                "kind": "pauta",
                "title": "Escolha a próxima pauta do ciclo",
                "subtitle": "O Oráculo cruzou repertório, tendências e desempenho histórico.",
                "status": "pending",
                "options": oracle_options,
                "selected_option_id": "opt-a",
                "waiting_label": "aguardando você",
            },
            {
                "id": "dec-2",
                "profile_id": "pf-carlos",
                "run_id": "TVR-2837",
                "kind": "revisao",
                "title": "Pacote final · “Sua agenda está indecisa”",
                "subtitle": "Pacote pronto para liberação",
                "status": "pending",
                "piece_id": "pc-6",
                "waiting_label": "revisão humana",
                "platform_label": "Instagram Studio",
            },
        ]
        for dec in studio_decisions:
            existing_dec = await session.get(StudioDecision, dec["id"])
            if not existing_dec:
                session.add(StudioDecision(**dec))
            else:
                for k, v in dec.items():
                    if k != "id":
                        setattr(existing_dec, k, v)
        await session.commit()
        print("Studio decisions seeded successfully")

if __name__ == "__main__":
    asyncio.run(seed())