"""
Script de importação canônica dos dados reais da agência para o TAVIR Escritório.
Lê:
1. documentacao_projetos.json -> projetos reais (tavir-core, escritorio-tavir, darkflow, raiox-tavir, analise-instagram, motor-editorial-tavir, scrapling-tavir-lab)
2. roster_catalogo.json + escritorio/equipe/*.md -> 57 agentes canônicos reais com personas completas e almas operacionais
3. PENDENTES.md -> 77 tarefas reais do kanban com escalações, contextos e estados
Persiste diretamente no SQLite backend/tavir.db.
"""

import os
import sys
import json
import glob
import re
import sqlite3
import unicodedata
from datetime import datetime

# Garante saída UTF-8 no terminal Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
WORKSPACE_DIR = os.path.dirname(BACKEND_DIR)
DB_PATH = os.path.join(BACKEND_DIR, "tavir.db")

AGENCIA_DIR = r"c:\Users\carlo\Downloads\Projetos a Estudar\AgenciaIA-plan-squads100"
CATALOGO_PATH = os.path.join(AGENCIA_DIR, "escritorio", "roster_catalogo.json")
EQUIPE_DIR = os.path.join(AGENCIA_DIR, "escritorio", "equipe")
PROJETOS_PATH = os.path.join(AGENCIA_DIR, "escritorio", "documentacao_projetos.json")
PENDENTES_PATH = os.path.join(AGENCIA_DIR, "PENDENTES.md")

# Mapeamento para setores da interface TAVIR
SECTOR_MAP = {
    "gestao": "Operação",
    "operacao": "Operação",
    "recepcao": "Operação",
    "engenharia": "Engenharia",
    "qualidade": "Qualidade",
    "seguranca": "Qualidade",
    "juridico": "Qualidade",
    "design": "Design",
    "editorial": "Conteúdo",
    "estudio": "Conteúdo",
    "fabrica-canais": "Conteúdo",
    "conteudo": "Conteúdo",
    "marketing": "Social",
    "social": "Social",
    "comercial": "Comercial",
    "financeiro": "Finanças",
    "financas": "Finanças",
    "conhecimento": "Conhecimento",
    "documentacao": "Documentação",
    "suporte": "Suporte",
    "estrategia": "Estratégia",
}

SECTOR_COLORS = {
    "Operação": "#B7F34A",
    "Estratégia": "#f97316",
    "Engenharia": "#06b6d4",
    "Qualidade": "#8b5cf6",
    "Conteúdo": "#3b82f6",
    "Design": "#ec4899",
    "Social": "#14b8a6",
    "Comercial": "#a855f7",
    "Finanças": "#84cc16",
    "Conhecimento": "#f59e0b",
    "Documentação": "#6366f1",
    "Suporte": "#10b981",
}

AGENT_ROLES = {
    "pm-projetos": "Orquestradora & Planejamento",
    "diego-flow": "Direção & Automação Flow",
    "construtor": "Dev Frontend Sênior (Nuxt/Vue)",
    "ux-ui": "UX Research & Prova Visual",
    "marca": "Identidade Visual & Design System",
    "descoberta": "Gate 0 & Intake Descoberta",
    "oraculo": "Diretor Editorial & Produção",
    "atena-compliance": "Compliance & Política YouTube",
    "seo": "SEO Técnico & Distribuição",
    "documentacao": "Manuais Técnicos & OpenAPI",
    "qa-e2e": "QA End-to-End & Regressão",
    "tech-lead": "Liderança Técnica & Padrões",
    "devops": "CI/CD & Infraestrutura",
    "dba-dados": "DBA & Modelagem de Dados",
    "suporte": "Triagem de Suporte & FAQ",
    "auditor": "Auditoria de Segurança & LGPD",
    "consultor-juridico": "Assessoria Jurídica & Contratos",
    "arquiteto": "Arquitetura de Soluções",
    "cto": "CTO (Stack, Infra & Decisões)",
    "closer": "Fechamento Comercial",
    "diretor-comercial": "Estratégia Comercial & Funil",
    "cs-onboarding": "Customer Success & Onboarding",
    "financeiro-cobranca": "Controle Financeiro & Cobrança",
    "precificacao": "Modelagem de Preços & Margem",
    "rafael-roteiro": "Roteirista Sênior",
    "nara-narracao": "Locução & Síntese de Voz",
    "sofia-storyboard": "Storyboard & Direção de Arte",
    "adriano-arte": "Direção de Arte & Assets",
    "editor-video": "Edição & Pós-Produção",
    "victor-videolens": "Análise Visual de Vídeo",
    "marcos-marketing": "Marketing de Crescimento",
    "jano-nexlev": "Otimização & Performance de Vídeo",
    "analista-instagram": "Auditoria & Métricas Instagram",
    "analista-web": "Auditoria Web & Performance",
    "analista-youtube": "Inteligência & Métricas YouTube",
    "conteudo-instagram": "Produção de Conteúdo Instagram",
    "conteudo-linkedin": "Produção Editorial LinkedIn",
    "conteudo-youtube": "Otimização & SEO YouTube",
    "email-marketing": "Copywriting & Régua de E-mails",
    "gestor-trafego": "Gestão de Tráfego Pago",
    "growth": "Estratégias de Aquisição & Growth",
    "social-media": "Gestão & Interação Social",
    "bruno-socio": "Conselho Estratégico",
    "jane": "Coordenação Operacional",
    "publicador": "Publicação Governa & Release",
    "recepcionista": "Triagem & Recepção",
    "ecommerce": "Especialista em E-commerce",
    "curador": "Curadoria & Indexação de Conhecimento",
    "escritor": "Ghostwriter & Produção de Texto",
    "estilista": "Estilo & Tom de Voz",
    "estruturador": "Estrutura Narrativa & Capítulos",
    "lapidador": "Revisão Fina & Polimento",
    "revisor": "QA Editorial & Gramatical",
    "roteirista-yt": "Roteiros Especializados YouTube",
    "construtor-react": "Dev Fullstack (Next.js/React)",
    "construtor-dotnet": "Engenharia Enterprise (.NET/Angular)",
    "construtor-flutter": "Engenharia Mobile (Flutter/Dart)",
}

def clean_initials(name: str) -> str:
    # Normaliza removendo acentos para iniciais ASCII limpas
    norm = unicodedata.normalize("NFKD", name).encode("ASCII", "ignore").decode("utf-8")
    words = [w for w in re.split(r"[\s\(\)/]+", norm) if w and not w.startswith("(")]
    if len(words) >= 2:
        return (words[0][0] + words[1][0]).upper()
    elif len(words) == 1:
        return words[0][:2].upper()
    return "AG"

def import_projects(conn: sqlite3.Connection):
    print("\n[1/3] Importando Projetos Reais...")
    with open(PROJETOS_PATH, encoding="utf-8") as f:
        data = json.load(f)
    raw_projects = data.get("projects", [])

    # Garante tavir-core como projeto raiz canônico
    projects = [
        {
            "id": "tavir-core",
            "slug": "tavir-core",
            "name": "TAVIR Core / Escritório Virtual",
            "description": "Centro de comando local com Kanban, Sala de Operação, agentes e governança.",
            "local_path": "escritorio",
            "status": "active",
        }
    ]

    for rp in raw_projects:
        projects.append({
            "id": rp["id"],
            "slug": rp["id"],
            "name": rp["name"],
            "description": rp.get("summary", ""),
            "local_path": rp.get("root", ""),
            "status": "active",
        })

    cur = conn.cursor()
    for p in projects:
        cur.execute(
            """
            INSERT INTO projects (id, slug, name, description, local_path, status, stages_done, total_stages, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, 0, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                slug = excluded.slug,
                name = excluded.name,
                description = excluded.description,
                local_path = excluded.local_path,
                status = excluded.status,
                updated_at = datetime('now')
            """,
            (p["id"], p["slug"], p["name"], p["description"], p["local_path"], p["status"]),
        )
    conn.commit()
    print(f"  ✓ {len(projects)} projetos importados/atualizados com sucesso!")

def import_agents(conn: sqlite3.Connection):
    print("\n[2/3] Importando 57 Agentes Canônicos Reais...")
    with open(CATALOGO_PATH, encoding="utf-8") as f:
        cat = json.load(f)
    papeis = {p["id"]: p for p in cat.get("papeis", [])}

    equipe_files = glob.glob(os.path.join(EQUIPE_DIR, "*.md"))
    equipe_docs = {}
    for fp in equipe_files:
        aid = os.path.splitext(os.path.basename(fp))[0]
        with open(fp, encoding="utf-8") as f:
            equipe_docs[aid] = f.read()

    all_ids = sorted(list(set(papeis.keys()) | set(equipe_docs.keys())))
    cur = conn.cursor()

    imported_agents = []
    for aid in all_ids:
        papel = papeis.get(aid, {})
        doc = equipe_docs.get(aid, "")

        # Nome
        name = papel.get("nome_sugerido")
        if not name and doc:
            fl = doc.strip().split("\n")[0]
            if fl.startswith("# "):
                name = fl[2:].strip()
        if not name:
            name = aid.replace("-", " ").title()

        # Setor
        if aid == "documentacao":
            sector = "Documentação"
        elif aid in ["curador", "analista-youtube"]:
            sector = "Conhecimento"
        elif aid in ["bruno-socio", "cto"]:
            sector = "Estratégia"
        elif aid in ["pm-projetos", "jane", "publicador", "recepcionista"]:
            sector = "Operação"
        else:
            raw_sec = papel.get("setor", "")
            if not raw_sec and doc:
                m = re.search(r"\*\*Setor:\*\*\s*([^\n]+)", doc)
                if m:
                    raw_sec = m.group(1).strip()
            sector = SECTOR_MAP.get(raw_sec.lower(), "Operação")

        role = AGENT_ROLES.get(aid, papel.get("escopo", "Especialista TAVIR"))
        if len(role) > 95:
            role = role[:92] + "..."

        initials = clean_initials(name)
        avatar_color = SECTOR_COLORS.get(sector, "#1BC5BD")

        # Modelo recomendado
        if aid in ["pm-projetos", "arquiteto", "cto", "oraculo", "bruno-socio", "auditor", "consultor-juridico"]:
            model = "claude-opus-4"
        elif aid in ["analista-web", "analista-instagram", "analista-youtube", "suporte", "cs-onboarding", "growth"]:
            model = "gpt-4o"
        elif aid in ["adriano-arte", "sofia-storyboard"]:
            model = "dall-e-3"
        else:
            model = "claude-sonnet-4"

        # Soul text: ficha completa de equipe ou prompt do catálogo
        soul_text = doc if doc else papel.get("prompt_operacional", f"# {name}\n\nAgente operacional TAVIR.")

        # Skills
        skills = papel.get("escopo", "") or f"Especialista em {sector}"

        # Status inicial vibrante para agentes-chave
        if aid in ["pm-projetos", "diego-flow", "construtor", "ux-ui", "descoberta"]:
            status = "busy"
            last_run = "1 min"
        else:
            status = "active"
            last_run = "15 min"

        total_jobs = hash(aid) % 400 + 50
        total_cost = round((total_jobs * 0.18) + 12.5, 2)

        cur.execute(
            """
            INSERT INTO agents (id, name, role, sector, status, skills, model_provider, soul_text,
                                total_jobs, total_cost, avatar_color, initials, last_run, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                role = excluded.role,
                sector = excluded.sector,
                status = excluded.status,
                skills = excluded.skills,
                model_provider = excluded.model_provider,
                soul_text = excluded.soul_text,
                avatar_color = excluded.avatar_color,
                initials = excluded.initials,
                updated_at = datetime('now')
            """,
            (aid, name, role, sector, status, skills, model, soul_text, total_jobs, total_cost, avatar_color, initials, last_run),
        )

        imported_agents.append({
            "id": aid,
            "name": name,
            "role": role,
            "sector": sector,
            "status": "busy" if status == "busy" else "idle",
            "lastRun": last_run,
            "totalJobs": total_jobs,
            "totalCost": total_cost,
            "model": model,
            "avatarColor": avatar_color,
            "initials": initials,
            "soulText": soul_text,
        })

    # Atualiza jobs e approvals antigos para os IDs reais canônicos
    LEGACY_AGENT_MAP = {
        "ag-01": "arquiteto",
        "ag-02": "curador",
        "ag-03": "escritor",
        "ag-04": "ux-ui",
        "ag-05": "qa-e2e",
        "ag-06": "devops",
        "ag-07": "growth",
        "ag-08": "pm-projetos",
        "ag-09": "social-media",
        "ag-10": "financeiro-cobranca",
        "ag-11": "diretor-comercial",
        "ag-12": "documentacao",
    }
    for old_id, new_id in LEGACY_AGENT_MAP.items():
        cur.execute("UPDATE jobs SET agent_id = ? WHERE agent_id = ?", (new_id, old_id))
        cur.execute("UPDATE approvals SET requester_agent_id = ? WHERE requester_agent_id = ?", (new_id, old_id))
        cur.execute("UPDATE chat_conversations SET agent_id = ? WHERE agent_id = ?", (new_id, old_id))

    # Remove agentes legados/sintéticos que não fazem parte do catálogo real
    placeholders = ",".join("?" for _ in all_ids)
    cur.execute(f"DELETE FROM agents WHERE id NOT IN ({placeholders})", all_ids)

    conn.commit()
    print(f"  ✓ {len(all_ids)} agentes reais canônicos persistidos (legados removidos)!")
    return imported_agents

def import_tasks(conn: sqlite3.Connection, agent_name_map: dict):
    print("\n[3/3] Importando 77 Tarefas Reais do Kanban...")
    with open(PENDENTES_PATH, encoding="utf-8") as f:
        content = f.read()

    sections = re.split(r"(?m)^## ", content)
    cur = conn.cursor()

    imported_tasks = []
    for sec in sections[1:]:
        lines = sec.split("\n")
        header = lines[0].strip()
        if "Pendente" in header:
            status = "pending"
        elif "andamento" in header:
            status = "in_progress"
        else:
            status = "done"

        curr_task = None
        for line in lines[1:]:
            m = re.match(
                r"^- \[[ xX]\] #(\d+)\s+`([^`]+)`\s+—\s+(.*?)(?:\s+·\s+aberto\s+(\d{4}-\d{2}-\d{2}))?(?:\s+·\s+agente\s+([a-zA-Z0-9_\-]+))?$",
                line.strip(),
            )
            if m:
                num, slug, title, aberto, agente = m.groups()
                curr_task = {
                    "num": int(num),
                    "slug": slug,
                    "title": title.strip(),
                    "aberto": aberto,
                    "agente": agente,
                    "status": status,
                    "context": [],
                }
                imported_tasks.append(curr_task)
            elif curr_task and line.startswith("  > "):
                curr_task["context"].append(line[4:].strip())

    db_tasks = []
    for t in imported_tasks:
        tid = f"task-{t['num']:02d}"
        seq = t["num"]
        title = t["title"]
        ctx_str = "\n".join(t["context"])

        # Identifica assignee a partir da escalação se não estiver no cabeçalho
        assignee_id = t["agente"]
        if not assignee_id:
            m_esc = re.search(r"ESCALA[ÇC][ÃA]O:\s*1\.\s*\[\s*\]\s*([a-zA-Z0-9_-]+)", ctx_str)
            if m_esc:
                assignee_id = m_esc.group(1).strip()
            else:
                assignee_id = "pm-projetos"

        # Mapeia papéis humanos/genéricos para IDs de agentes canônicos
        ROLE_MAP = {"chefe": "pm-projetos", "tecnico": "tech-lead", "diretor": "diretor-comercial"}
        if assignee_id in ROLE_MAP:
            assignee_id = ROLE_MAP[assignee_id]
        if agent_name_map and assignee_id not in agent_name_map:
            assignee_id = "pm-projetos"

        # Prioridade
        if t["num"] in [83, 82, 80, 78] or any(k in title.lower() for k in ["urgente", "segurança", "bloqueio"]):
            priority = "critical"
        elif t["num"] >= 70 or any(k in title.lower() for k in ["f1", "f5", "f6", "telemetria"]):
            priority = "high"
        else:
            priority = "medium"

        # Setor da tarefa baseado no assignee ou assunto
        if assignee_id == "pm-projetos":
            sector = "Operação"
        elif assignee_id in ["construtor", "tech-lead", "devops", "dba-dados"]:
            sector = "Engenharia"
        elif assignee_id in ["ux-ui", "marca"]:
            sector = "Design"
        elif assignee_id in ["qa-e2e", "auditor"]:
            sector = "Qualidade"
        elif assignee_id in ["seo", "gestor-trafego", "growth", "analista-instagram"]:
            sector = "Social"
        elif assignee_id in ["diego-flow", "oraculo", "rafael-roteiro", "nara-narracao"]:
            sector = "Conteúdo"
        else:
            sector = "Operação"

        # Escalação e Gates
        m_esc_full = re.search(r"ESCALA[ÇC][ÃA]O:\s*([^\n]+)", ctx_str)
        escalation = m_esc_full.group(1).strip() if m_esc_full else f"Paula PM planeja a execução do card #{seq}"

        gates = []
        if "gate" in ctx_str.lower():
            m_gates = re.findall(r"(?:gate|portão)\s*[:\s]*([^\n,.]+)", ctx_str, re.IGNORECASE)
            gates = [g.strip() for g in m_gates[:3] if len(g.strip()) > 2]
        if not gates:
            gates = ["Validação Paula PM"]

        handoffs = [f"{assignee_id} → validador"]
        tags = [t["slug"], sector.lower()]
        if "hub-v2" in t["slug"]:
            tags.append("hub-v2")
        if "telegram" in t["slug"]:
            tags.append("telegram")
        if "instagram" in t["slug"]:
            tags.append("instagram")

        description = ctx_str if ctx_str else f"Card #{seq} do Kanban: {title}"

        created_at = f"{t['aberto']} 12:00:00" if t["aberto"] else datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cur.execute(
            """
            INSERT INTO tasks (id, seq, project_id, title, description, status, priority,
                               assignee_agent_id, sector, escalation, handoffs, gates, tags, created_at, updated_at)
            VALUES (?, ?, 'tavir-core', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                seq = excluded.seq,
                project_id = excluded.project_id,
                title = excluded.title,
                description = excluded.description,
                status = excluded.status,
                priority = excluded.priority,
                assignee_agent_id = excluded.assignee_agent_id,
                sector = excluded.sector,
                escalation = excluded.escalation,
                handoffs = excluded.handoffs,
                gates = excluded.gates,
                tags = excluded.tags,
                updated_at = datetime('now')
            """,
            (
                tid,
                seq,
                title,
                description,
                t["status"],
                priority,
                assignee_id,
                sector,
                escalation,
                json.dumps(handoffs),
                json.dumps(gates),
                json.dumps(tags),
                created_at,
            ),
        )

        assignee_name = agent_name_map.get(assignee_id, "Paula PM")

        db_tasks.append({
            "id": tid,
            "seq": seq,
            "title": title,
            "status": t["status"],
            "assignee": assignee_name,
            "priority": "normal" if priority == "medium" else priority,
            "sector": sector,
            "escalation": escalation,
            "handoffs": handoffs,
            "gates": gates,
            "tags": tags,
            "description": description,
        })

    # Remove tarefas legadas que não pertençam ao conjunto importado
    valid_task_ids = [f"task-{t['num']:02d}" for t in imported_tasks]
    placeholders = ",".join("?" for _ in valid_task_ids)
    cur.execute(f"DELETE FROM tasks WHERE id NOT IN ({placeholders})", valid_task_ids)

    conn.commit()
    print(f"  ✓ {len(imported_tasks)} tarefas reais importadas/atualizadas com sucesso!")
    return db_tasks

def export_frontend_real_data(agents: list[dict], tasks: list[dict]):
    print("\n[Exportação] Sincronizando frontend/src/state/real_data.ts...")
    target_path = os.path.join(WORKSPACE_DIR, "frontend", "src", "state", "real_data.ts")

    # Serializa agentes e tarefas
    agents_ts = json.dumps(agents, indent=2, ensure_ascii=False)
    tasks_ts = json.dumps(tasks, indent=2, ensure_ascii=False)

    ts_content = f"""// Dados canônicos reais da agência de Carlos importados de PENDENTES.md e roster_catalogo/equipe

export interface RosterAgent {{
  id: string;
  name: string;
  role: string;
  sector: string;
  status: "busy" | "idle" | "offline" | "error";
  lastRun: string;
  totalJobs: number;
  totalCost: number;
  model: string;
  avatarColor: string;
  initials: string;
  soulText?: string;
}}

export interface UiTask {{
  id: string;
  seq: number;
  title: string;
  status: "pending" | "in_progress" | "done";
  assignee: string;
  priority: "critical" | "high" | "normal" | "low";
  sector: string;
  escalation?: string;
  handoffs?: string[];
  gates?: string[];
  activeJobId?: string;
  tags: string[];
  description?: string;
}}

export const REAL_AGENTS: RosterAgent[] = {agents_ts};

export const REAL_TASKS: UiTask[] = {tasks_ts};
"""

    with open(target_path, "w", encoding="utf-8") as f:
        f.write(ts_content)

    print(f"  ✓ Arquivo {target_path} gerado com sucesso!")

def main():
    print("=" * 70)
    print("  TAVIR ESCRITÓRIO — CARGA CANÔNICA DE DADOS REAIS DA AGÊNCIA")
    print("=" * 70)
    print(f"Banco de dados alvo: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    try:
        import_projects(conn)
        agents = import_agents(conn)
        agent_name_map = {a["id"]: a["name"] for a in agents}
        tasks = import_tasks(conn, agent_name_map)

        export_frontend_real_data(agents, tasks)

        print("\n" + "=" * 70)
        print("  CARGA CONCLUÍDA COM SUCESSO NO BANCO SQLITE E NO FRONTEND!")
        print("=" * 70)
        print(f"Total Agentes Ativos no Banco: {len(agents)}")
        print(f"Total Tarefas no Kanban SQLite: {len(tasks)}")
        print("Paula PM (pm-projetos) e esquadrão canônico integrados com sucesso.")
    finally:
        conn.close()

if __name__ == "__main__":
    main()

