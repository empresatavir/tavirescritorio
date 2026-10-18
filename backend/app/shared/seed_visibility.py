"""Idempotent seed script for Visibility, Workflows & Knowledge modules (G8 / Fase 5).
Indexes real vault pages from absorcao-conteudo/ and seeds canonical workflows, ideas, and integration checks.
"""
import asyncio
import os
import re
import uuid
from pathlib import Path
import yaml
from sqlalchemy import select, delete, text
from app.shared.database import async_session
from app.models.workflow import Workflow
from app.models.idea import Idea
from app.models.integration_check import IntegrationCheck
from app.models.knowledge_entry import KnowledgeEntry


# 6 Workflows de Negócio Canônicos (Decisão D3: isolados dos templates de engenharia da Fábrica)
CANONICAL_WORKFLOWS = [
    {
        "name": "Onboarding de Novo Cliente & Setup de Projeto",
        "category": "comercial",
        "description": "Fluxo estruturado de ativação de cliente, diagnóstico de arquitetura, alinhamento de briefing e preparação do ambiente.",
        "trigger_type": "event",
        "sort_order": 1,
        "steps": [
            {"agent": "Arquiteto", "action": "Diagnóstico & Arquitetura Inicial", "arrow": True},
            {"agent": "Comercial", "action": "Definição de Escopo & Briefing", "arrow": True},
            {"agent": "Deployer", "action": "Provisionamento de Ambientes & Repositórios", "arrow": True},
            {"agent": "Planejador", "action": "Construção do Roadmap Inicial", "gate": "Aprovação do Setup", "arrow": True},
            {"agent": "Account Manager", "action": "Ativação & Kickoff com Cliente", "arrow": False},
        ],
    },
    {
        "name": "Diagnóstico & Elaboração de Proposta Comercial",
        "category": "comercial",
        "description": "Pipeline de prospecção, questionário de descoberta, estimativa de investimento e geração de proposta com aceite eletrônico.",
        "trigger_type": "manual",
        "sort_order": 2,
        "steps": [
            {"agent": "Pesquisador", "action": "Coleta & Investigação de Requisitos", "arrow": True},
            {"agent": "Arquiteto", "action": "Dimensionamento de Esforço & Custos", "arrow": True},
            {"agent": "Comercial", "action": "Redação da Proposta Oficial", "gate": "Aprovação de Margem (CEO)", "arrow": True},
            {"agent": "Deployer", "action": "Publicação de Aceite Eletrônico (Supabase Bridge)", "arrow": False},
        ],
    },
    {
        "name": "Sprint de Produção Editorial & Conteúdo Multi-Canal",
        "category": "editorial",
        "description": "Esteira contínua de curadoria do Vault, criação de ganchos persuasivos, redação multi-formato e revisão de qualidade.",
        "trigger_type": "scheduled",
        "sort_order": 3,
        "steps": [
            {"agent": "Pesquisador", "action": "Indexação de Fontes & Ganchos no Vault", "arrow": True},
            {"agent": "Arquiteto", "action": "Estrutura Narrativa & Âncoras Psicológicas", "arrow": True},
            {"agent": "Redator", "action": "Produção Multi-Formato (Instagram, YouTube, LinkedIn)", "gate": "Revisão Editorial", "arrow": True},
            {"agent": "Revisor", "action": "QA de Tom de Voz & Anti-Slop", "arrow": True},
            {"agent": "Social Media", "action": "Agendamento & Publicação", "arrow": False},
        ],
    },
    {
        "name": "Revisão Técnica, Hardening & Gate de Qualidade",
        "category": "engenharia",
        "description": "Auditoria de segurança, conformidade com os Padrões Operacionais (.agents/*_STANDARD.md) e validação de regressão.",
        "trigger_type": "event",
        "sort_order": 4,
        "steps": [
            {"agent": "Engenheiro", "action": "Análise Estática, Tipagem & Linting", "arrow": True},
            {"agent": "Segurança", "action": "Auditoria OWASP, Headers & Rate Limiting", "arrow": True},
            {"agent": "QA Automation", "action": "Bateria de Testes Unitários e E2E", "gate": "Gate de Qualidade & Merge", "arrow": True},
            {"agent": "Deployer", "action": "Deploy Automatizado em Homologação", "arrow": False},
        ],
    },
    {
        "name": "Suporte Evolutivo, Resolução de Bloqueios & Bugfix",
        "category": "suporte",
        "description": "Tratamento de bloqueios operacionais (credenciais, teto de custo, falhas de deploy) com escalação e resolução auditada.",
        "trigger_type": "event",
        "sort_order": 5,
        "steps": [
            {"agent": "Analista", "action": "Triagem de Incidentes & Reprodução de Bug", "arrow": True},
            {"agent": "Arquiteto", "action": "Investigação de Causa Raiz & Estratégia de Fix", "arrow": True},
            {"agent": "Engenheiro", "action": "Desenvolvimento do Patch & Testes de Regressão", "gate": "Validação de Correção", "arrow": True},
            {"agent": "Deployer", "action": "Publicação de Hotfix & Atualização de Status", "arrow": False},
        ],
    },
    {
        "name": "Fechamento Mensal, Apuração de Custos & Faturamento",
        "category": "financeiro",
        "description": "Apuração de tokens consumidos por modelo de IA, cálculo de custos diretos, reconciliação financeira e emissão de faturas.",
        "trigger_type": "scheduled",
        "sort_order": 6,
        "steps": [
            {"agent": "Analista", "action": "Consolidação de Telemetria de IA & Consumo de Tokens", "arrow": True},
            {"agent": "Financeiro", "action": "Reconciliação de Custos por Cliente e Faturas", "gate": "Homologação Financeira (CEO)", "arrow": True},
            {"agent": "Contábil", "action": "Emissão de Faturas & Relatórios de Margem", "arrow": False},
        ],
    },
]

CANONICAL_IDEAS = [
    {
        "title": "HubSpot CRM Bridge bidirecional",
        "description": "Sincronização automática de contatos e negócios entre o HubSpot e o pipeline comercial do TAVIR.",
        "source": "Estratégia Q4",
        "priority": "high",
    },
    {
        "title": "Conversão de Capítulos para Áudio e Podcast via ElevenLabs",
        "description": "Pipeline de narração sintética para transformar capítulos sintetizados em episódios de áudio.",
        "source": "IA Livros",
        "priority": "medium",
    },
    {
        "title": "Geração automatizada de Carrosséis Instagram via SVG Canvas",
        "description": "Exportador headless para gerar lâminas 4:5 de carrossel a partir dos ganchos e resumos do Vault.",
        "source": "Creative Studio",
        "priority": "high",
    },
    {
        "title": "Agente Especialista em Tributação & Lucro Presumido",
        "description": "Novo agente para validação fiscal de propostas comerciais e cálculo de retenções na fonte.",
        "source": "Operação Financeira",
        "priority": "medium",
    },
    {
        "title": "Motor de Busca Vetorial Híbrido com sqlite-vss",
        "description": "Busca híbrida combinando FTS5 textual com embeddings vetoriais locais para o acervo de 150 páginas.",
        "source": "Cérebro & Vault",
        "priority": "low",
    },
]

INITIAL_INTEGRATIONS = [
    {
        "integration_name": "FastAPI Backend (porta 9001)",
        "status": "healthy",
        "response_time_ms": 6,
        "extra_metadata": {"url": "http://127.0.0.1:9001/api/v1/health", "type": "local_service"},
    },
    {
        "integration_name": "SolidJS Vite Frontend (porta 9002)",
        "status": "healthy",
        "response_time_ms": 12,
        "extra_metadata": {"url": "http://127.0.0.1:9002", "type": "local_service"},
    },
    {
        "integration_name": "SQLite tavir.db (integridade PRAGMA)",
        "status": "healthy",
        "response_time_ms": 3,
        "extra_metadata": {"file": "backend/tavir.db", "quick_check": "ok", "type": "database"},
    },
    {
        "integration_name": "Sincron Brain MCP (memória cognitiva)",
        "status": "healthy",
        "response_time_ms": 18,
        "extra_metadata": {"type": "mcp", "tags_active": 8, "scoring_model": "exponential_decay"},
    },
    {
        "integration_name": "Vault Knowledge (absorcao-conteudo)",
        "status": "healthy",
        "response_time_ms": 14,
        "extra_metadata": {"pages_indexed": 150, "format": "markdown", "type": "vault"},
    },
    {
        "integration_name": "Anthropic Claude API",
        "status": "healthy",
        "response_time_ms": 138,
        "extra_metadata": {"models": ["claude-3-5-sonnet", "claude-3-opus"], "type": "ai_engine"},
    },
    {
        "integration_name": "OpenAI GPT-4o API",
        "status": "healthy",
        "response_time_ms": 164,
        "extra_metadata": {"models": ["gpt-4o", "dall-e-3"], "type": "ai_engine"},
    },
    {
        "integration_name": "GitHub CI/CD & Repos",
        "status": "healthy",
        "response_time_ms": 92,
        "extra_metadata": {"provider": "github.com", "type": "external_account"},
    },
    {
        "integration_name": "Supabase Propostas Bridge",
        "status": "pending",
        "error_message": "Contrato externo não configurado (operando via D5 Adapter Mock)",
        "extra_metadata": {"adapter": "MockSupabaseAdapter", "type": "external_account"},
    },
]


def parse_vault_file(file_path: Path, repo_root: Path) -> dict | None:
    """Extract metadata and content from markdown file."""
    try:
        raw_text = file_path.read_text(encoding="utf-8")
    except Exception:
        return None

    # Check for YAML frontmatter
    fm = {}
    content = raw_text
    fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw_text, re.DOTALL)
    if fm_match:
        try:
            fm = yaml.safe_load(fm_match.group(1)) or {}
            content = fm_match.group(2).strip()
        except Exception:
            pass

    title = fm.get("title")
    if not title:
        # Fallback to first heading
        h1_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        if h1_match:
            title = h1_match.group(1).strip()
        else:
            title = file_path.stem.replace("-", " ").title()

    domain = fm.get("domain") or file_path.parent.name
    tags = fm.get("tags") or []
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(",")]

    source = fm.get("source") or f"Vault: {domain.title()}"
    importance = fm.get("importance", 5)

    # First 2 paragraphs as excerpt / content preview
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip() and not p.startswith("#")]
    excerpt = " ".join(paragraphs[:2]) if paragraphs else content[:300]
    if len(excerpt) > 400:
        excerpt = excerpt[:397] + "..."

    return {
        "title": title[:300],
        "content": excerpt,
        "source_type": "vault",
        "source_path": str(file_path.relative_to(repo_root)).replace("\\", "/"),
        "tags": tags,
        "extra_metadata": {
            "domain": domain.capitalize(),
            "source": source,
            "importance": importance,
            "full_content": content,
            "aliases": fm.get("aliases", []),
        },
    }


async def seed_visibility():
    repo_root = Path(__file__).resolve().parent.parent.parent.parent
    vault_dir = repo_root / "absorcao-conteudo"

    async with async_session() as session:
        # 1. Reconcile Workflows (ensure exactly the 6 canonical workflows)
        await session.execute(delete(Workflow))
        for w in CANONICAL_WORKFLOWS:
            workflow = Workflow(
                id=str(uuid.uuid4()),
                name=w["name"],
                category=w["category"],
                description=w["description"],
                steps=w["steps"],
                trigger_type=w["trigger_type"],
                status="active",
                sort_order=w["sort_order"],
            )
            session.add(workflow)
        print(f"Seeded {len(CANONICAL_WORKFLOWS)} canonical workflows (D3 compliance)")

        # 2. Reconcile Ideas
        res_ideas = await session.execute(select(Idea).limit(1))
        if not res_ideas.scalars().first():
            proj_result = await session.execute(text("SELECT id FROM projects LIMIT 1"))
            proj_row = proj_result.fetchone()
            for idea_dict in CANONICAL_IDEAS:
                idea = Idea(
                    id=str(uuid.uuid4()),
                    title=idea_dict["title"],
                    description=idea_dict["description"],
                    source=idea_dict["source"],
                    priority=idea_dict["priority"],
                    project_id=proj_row[0] if proj_row else None,
                )
                session.add(idea)
            print(f"Seeded {len(CANONICAL_IDEAS)} ideas in backlog")

        # 3. Reconcile Integration Checks
        await session.execute(delete(IntegrationCheck))
        for item in INITIAL_INTEGRATIONS:
            check = IntegrationCheck(
                id=str(uuid.uuid4()),
                integration_name=item["integration_name"],
                status=item["status"],
                response_time_ms=item.get("response_time_ms"),
                error_message=item.get("error_message"),
                extra_metadata=item.get("extra_metadata"),
            )
            session.add(check)
        print(f"Seeded {len(INITIAL_INTEGRATIONS)} integration checks")

        # 4. Index Knowledge Entries from absorcao-conteudo/
        await session.execute(delete(KnowledgeEntry))
        indexed_count = 0
        if vault_dir.exists():
            for md_file in vault_dir.rglob("*.md"):
                # Skip index files, obsidian configs and temp files
                if md_file.name.startswith("_") or ".obsidian" in str(md_file):
                    continue
                parsed = parse_vault_file(md_file, repo_root)
                if not parsed:
                    continue

                entry = KnowledgeEntry(
                    id=str(uuid.uuid4()),
                    title=parsed["title"],
                    content=parsed["content"],
                    source_type=parsed["source_type"],
                    source_path=parsed["source_path"],
                    tags=parsed["tags"],
                    extra_metadata=parsed["extra_metadata"],
                    status="indexed",
                )
                session.add(entry)
                indexed_count += 1

        print(f"Indexed {indexed_count} knowledge entries from Vault into SQLite")

        await session.commit()
        print("Visibility seed finished successfully!")


if __name__ == "__main__":
    asyncio.run(seed_visibility())