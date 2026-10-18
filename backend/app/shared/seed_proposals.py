"""Seed script for commercial proposals."""
import json
import sqlite3
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SHARED_DIR = SCRIPT_DIR
APP_DIR = os.path.dirname(SHARED_DIR)
BACKEND_DIR = os.path.dirname(APP_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "tavir.db")

SEED_PROPOSALS = [
    {
        "id": "prop-01",
        "num": "PRO-001",
        "client": "Atlas Holdings",
        "stage": "pending",
        "status": "Aceita pelo cliente · aguardando contra-assinatura",
        "tone": "wait",
        "version": 2,
        "value": 48500.0,
        "validity": "15/10",
        "deadline": "8 semanas",
        "task_id": "task-10",
        "summary": "Proposta de landing page institucional com integração ao CRM da Atlas e 3 meses de suporte. O cliente aceitou pela ponte Supabase; falta a contra-assinatura local (aprovação ap-05) para abrir o projeto.",
        "scope": "Landing em 5 seções com formulário de captação ligado ao CRM, painel de leads e suporte evolutivo após a entrega.",
        "items": [
            {"desc": "Landing institucional (5 seções)", "value": 22000.0},
            {"desc": "Integração com CRM e painel de leads", "value": 16500.0},
            {"desc": "Suporte evolutivo · 3 meses", "value": 10000.0},
        ],
        "collected": [
            ["Contato", "Renata Paiva · diretora de marketing"],
            ["Objetivo", "Aumentar leads qualificados do site"],
            ["Sistemas", "CRM próprio com API REST"],
            ["Orçamento indicado", "até R$ 50 mil"],
        ],
        "changes": [
            {"at": "24/09 10:12", "target": "Prazos", "agent": "Arquiteto", "text": "Cliente pediu entrega em 8 semanas em vez de 10.", "status": "Aplicada · v2"},
        ],
        "timeline": [
            ["20/09 09:30", "Comercial", "Reunião de descoberta registrada"],
            ["22/09 16:00", "Comercial", "Proposta v1 enviada"],
            ["24/09 10:12", "Você", "Alteração de prazo solicitada"],
            ["24/09 11:40", "Arquiteto", "Cronograma refeito para 8 semanas · v2"],
            ["27/09 11:20", "Atlas Holdings", "Aceite recebido"],
        ],
        "send_info": {
            "link": "PRO-001-v2-a7f3c1",
            "sentTo": "renata.paiva@atlasholdings.com.br",
            "sentAt": "24/09 11:45",
            "opened": "6 vezes",
            "accept": ["signed", "Renata Paiva", "27/09 11:20"],
        },
    },
    {
        "id": "prop-02",
        "num": "PRO-002",
        "client": "Cobalt Group",
        "stage": "progress",
        "status": "Coletando informações com o cliente",
        "tone": "work",
        "version": 1,
        "value": None,
        "validity": "",
        "deadline": "A definir",
        "task_id": None,
        "summary": "Oportunidade aberta após contato pelo site. O agente Comercial está levantando necessidades e orçamento para montar a primeira versão.",
        "scope": "Escopo tratado na próxima etapa, depois da coleta.",
        "items": [],
        "collected": [
            ["Contato", "Marcos Lima · COO"],
            ["Interesse", "Automação do atendimento comercial"],
        ],
        "changes": [],
        "timeline": [
            ["27/09 15:10", "Comercial", "Primeiro contato registrado"],
            ["28/09 09:00", "Comercial", "Questionário de descoberta enviado"],
        ],
        "send_info": None,
    },
    {
        "id": "prop-03",
        "num": "PRO-003",
        "client": "Northwind Digital",
        "stage": "progress",
        "status": "Ajustando valores a pedido seu",
        "tone": "work",
        "version": 1,
        "value": 31200.0,
        "validity": "10/10",
        "deadline": "6 semanas",
        "task_id": None,
        "summary": "Proposta de conteúdo recorrente para blog e LinkedIn, com 12 artigos por mês e relatório de desempenho.",
        "scope": "Produção editorial mensal com pauta aprovada pelo cliente, revisão e publicação.",
        "items": [
            {"desc": "12 artigos por mês · 3 meses", "value": 24000.0},
            {"desc": "Distribuição no LinkedIn", "value": 4800.0},
            {"desc": "Relatório mensal de desempenho", "value": 2400.0},
        ],
        "collected": [
            ["Contato", "Júlia Castro · head de growth"],
            ["Frequência", "3 artigos por semana"],
            ["Canais", "Blog e LinkedIn"],
        ],
        "changes": [
            {"at": "28/09 09:45", "target": "Valores", "agent": "Comercial", "text": "Oferecer o relatório mensal sem custo se o contrato for de 6 meses.", "status": "Com o agente"},
        ],
        "timeline": [
            ["25/09 14:00", "Comercial", "Proposta v1 montada"],
            ["28/09 09:45", "Você", "Alteração de valores solicitada"],
        ],
        "send_info": {
            "link": "PRO-003-v1-c42e90",
            "sentTo": "julia.castro@northwind.digital",
            "sentAt": "25/09 14:20",
            "opened": "2 vezes",
            "accept": ["pending"],
        },
    },
    {
        "id": "prop-04",
        "num": "PRO-004",
        "client": "Bluepeak Studio",
        "stage": "pending",
        "status": "Enviada · aguardando resposta do cliente",
        "tone": "wait",
        "version": 1,
        "value": 12800.0,
        "validity": "05/10",
        "deadline": "3 semanas",
        "task_id": None,
        "summary": "Redesenho da página de portfólio do estúdio, com galeria filtrável e formulário de orçamento.",
        "scope": "Página de portfólio responsiva, galeria com filtros por categoria e formulário ligado ao e-mail do estúdio.",
        "items": [
            {"desc": "Página de portfólio com galeria", "value": 9600.0},
            {"desc": "Formulário de orçamento", "value": 3200.0},
        ],
        "collected": [
            ["Contato", "André Moura · sócio"],
            ["Referências", "3 sites enviados pelo cliente"],
        ],
        "changes": [],
        "timeline": [
            ["23/09 10:00", "Comercial", "Proposta v1 montada"],
            ["23/09 17:30", "Comercial", "Proposta enviada ao cliente"],
        ],
        "send_info": {
            "link": "PRO-004-v1-9b1d07",
            "sentTo": "andre@bluepeak.studio",
            "sentAt": "23/09 17:30",
            "opened": "1 vez",
            "accept": ["pending"],
        },
    },
    {
        "id": "prop-05",
        "num": "PRO-005",
        "client": "Meridian Capital",
        "stage": "done",
        "status": "Aceita e contra-assinada",
        "tone": "ok",
        "version": 1,
        "value": 32000.0,
        "validity": "—",
        "deadline": "5 semanas",
        "task_id": "task-07",
        "summary": "Landing de captação para o fundo da Meridian Capital. Proposta concluída; o projeto meridian-landing foi aberto.",
        "scope": "Landing de captação com área de materiais para investidores e publicação na conta vercel · tavir.",
        "items": [
            {"desc": "Landing de captação", "value": 24000.0},
            {"desc": "Área de materiais para investidores", "value": 8000.0},
        ],
        "collected": [
            ["Contato", "Paulo Serra · relações com investidores"],
            ["Prazo desejado", "antes do fim do trimestre"],
        ],
        "changes": [],
        "timeline": [
            ["02/09 11:00", "Comercial", "Proposta v1 enviada"],
            ["05/09 15:20", "Meridian Capital", "Aceite recebido"],
        ],
        "send_info": {
            "link": "PRO-005-v1-e58a2f",
            "sentTo": "paulo.serra@meridiancapital.com.br",
            "sentAt": "02/09 11:00",
            "opened": "4 vezes",
            "accept": ["signed", "Paulo Serra", "05/09 15:20"],
        },
    },
    {
        "id": "prop-06",
        "num": "PRO-006",
        "client": "Vortex Labs",
        "stage": "done",
        "status": "Recusada pelo cliente · prazo incompatível",
        "tone": "lost",
        "version": 2,
        "value": 21000.0,
        "validity": "—",
        "deadline": "4 semanas",
        "task_id": None,
        "summary": "Proposta de consultoria técnica para migração de infraestrutura. Cliente precisava de início imediato; a TAVIR estava sem disponibilidade no período.",
        "scope": "Auditoria de infraestrutura e migração assistida com 3 semanas de suporte.",
        "items": [
            {"desc": "Auditoria de infraestrutura", "value": 9000.0},
            {"desc": "Migração assistida", "value": 12000.0},
        ],
        "collected": [
            ["Contato", "Lia Nakamura · CTO"],
            ["Motivo da perda", "Disponibilidade de início"],
        ],
        "changes": [],
        "timeline": [
            ["10/09 14:00", "Comercial", "Proposta enviada"],
            ["15/09 14:00", "Vortex Labs", "Recusa informada"],
        ],
        "send_info": {
            "link": "PRO-006-v2-1d6b44",
            "sentTo": "lia@vortexlabs.io",
            "sentAt": "12/09 11:30",
            "opened": "3 vezes",
            "accept": ["refused", "Lia Nakamura", "15/09 14:00"],
        },
    },
]


def seed_proposals():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    for p in SEED_PROPOSALS:
        cur.execute(
            """
            INSERT INTO proposals (
                id, num, client, stage, status, tone, version, value, validity,
                deadline, task_id, summary, scope, items, collected, changes,
                timeline, send_info, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                num = excluded.num,
                client = excluded.client,
                stage = excluded.stage,
                status = excluded.status,
                tone = excluded.tone,
                version = excluded.version,
                value = excluded.value,
                validity = excluded.validity,
                deadline = excluded.deadline,
                task_id = excluded.task_id,
                summary = excluded.summary,
                scope = excluded.scope,
                items = excluded.items,
                collected = excluded.collected,
                changes = excluded.changes,
                timeline = excluded.timeline,
                send_info = excluded.send_info,
                updated_at = datetime('now')
            """,
            (
                p["id"],
                p["num"],
                p["client"],
                p["stage"],
                p["status"],
                p["tone"],
                p["version"],
                p["value"],
                p["validity"],
                p["deadline"],
                p["task_id"],
                p["summary"],
                p["scope"],
                json.dumps(p["items"]),
                json.dumps(p["collected"]),
                json.dumps(p["changes"]),
                json.dumps(p["timeline"]),
                json.dumps(p["send_info"]) if p["send_info"] else None,
            ),
        )

    conn.commit()
    conn.close()
    print(f"Seed: {len(SEED_PROPOSALS)} propostas comerciais inseridas/atualizadas no SQLite.")


if __name__ == "__main__":
    seed_proposals()
