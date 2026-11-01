"""Dossiê de QA e de segurança a partir dos arquivos já gravados no projeto."""
from __future__ import annotations

import re
from pathlib import Path

from app.modules.factory.artifacts import ArtifactError, resolve_workspace_root
from app.modules.factory.qa_guard import evaluate_guard
from app.modules.factory.work_session import evidence_file, scan_security

IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
HTML_SUFFIXES = {".html", ".htm"}
TEXT_SUFFIXES = {".md", ".txt", ".log", ".json"}
RAW_SUFFIXES = IMAGE_SUFFIXES | HTML_SUFFIXES
QA_STAGE_IDS = {"qa_be", "qa_fe", "qa_jornada", "m_qa_be", "m_qa_fe", "m_qa_jornada"}


def verdict_of(text: str) -> str:
    """pass, fail ou wait. O último sinal do arquivo vale: uma retentativa que passa fecha o log."""
    found = ""
    for line in (text or "").lower().splitlines():
        if any(token in line for token in ("execucao: falhou", "resultado: reprovado", "parecer: reprovado")):
            found = "fail"
        elif any(token in line for token in ("execucao: passou", "resultado: aprovado", "parecer: aprovado")):
            found = "pass"
        else:
            match = re.search(r"codigo_saida:\s*(-?\d+)", line)
            if match:
                found = "pass" if match.group(1) == "0" else "fail"
    return found or "wait"


def _initials(name: str) -> str:
    parts = [part for part in re.split(r"\s+", name or "") if part[:1].isalpha()]
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    raw = re.sub(r"[^A-Za-z]", "", name or "")
    return (raw[:2] or "QA").upper()


def _read_text(path: Path, limit: int = 12_000) -> str:
    if not path.is_file():
        return ""
    try:
        return path.read_text(encoding="utf-8", errors="replace")[:limit]
    except OSError:
        return ""


def _command_line(text: str) -> str:
    raw = ""
    for line in text.splitlines():
        if line.lower().startswith("comando:"):
            raw = line.split(":", 1)[1].strip()
            break
    if not raw:
        return ""
    low = raw.lower()
    if "pytest" in low:
        return "$ pytest"
    if "flutter" in low and "build apk" in low:
        return "$ flutter build apk --release"
    if "flutter" in low and "test" in low:
        return "$ flutter test"
    if "flutter" in low:
        return "$ flutter"
    if len(raw) > 64:
        head = Path(raw.split()[0]).name
        return "$ " + head
    return "$ " + raw


def _result_line(text: str, status: str) -> str:
    low = text.lower()
    if "all tests passed" in low or " passed in " in low:
        return "Testes passaram"
    last_exec = False
    last_code = ""
    for line in text.splitlines():
        line_low = line.lower()
        if line_low.startswith("execucao:"):
            last_exec = True
        if line_low.startswith("codigo_saida:"):
            last_code = line.split(":", 1)[1].strip()
    if last_exec:
        return "Execução passou" if status == "pass" else "Execução falhou"
    if last_code:
        return "Código de saída 0" if last_code == "0" else f"Código de saída {last_code}"
    if status == "pass":
        return "Registro aprovado"
    if status == "fail":
        return "Registro reprovado"
    return "Ainda sem execução gravada"


def _kind_for(path: Path) -> str | None:
    suffix = path.suffix.lower()
    if suffix in IMAGE_SUFFIXES:
        return "screenshot"
    if suffix in HTML_SUFFIXES:
        return "html"
    if suffix == ".log":
        return "log"
    if suffix == ".md":
        return "report"
    return None


def _skipped(rel: str) -> bool:
    parts = rel.split("/")
    return "orders" in parts or ".tavir" in parts or "node_modules" in parts or ".dart_tool" in parts


def collect_evidence(root: Path, *, scope: str) -> list[dict]:
    """Relatórios, HTML, prints e logs de sucesso ou falha."""
    items: list[dict] = []
    if not root.is_dir():
        return items
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        if _skipped(rel):
            continue
        kind = _kind_for(path)
        if kind is None:
            continue
        in_qa = rel.startswith("qa/")
        security_name = path.name.lower() in {"security.md", "seo_sec.md"} or "seo_sec" in path.name.lower() or "security" in path.name.lower()
        if scope == "qa" and not in_qa:
            continue
        if scope == "security" and not (security_name or rel.startswith("qa/security")):
            continue
        text = _read_text(path) if path.suffix.lower() in TEXT_SUFFIXES else ""
        status = verdict_of(text) if text else "wait"
        name_low = path.name.lower()
        if kind == "screenshot":
            status = "fail" if any(token in name_low for token in ("fail", "falha", "erro", "error")) else "pass"
        command = _command_line(text)
        if command:
            note = f"{command} · {_result_line(text, status)}"
        else:
            note = ""
            for line in text.splitlines():
                clean = line.strip()
                if clean and not clean.startswith("#") and not clean.startswith("**") and not clean.startswith("---"):
                    note = clean[:120]
                    break
        try:
            size = path.stat().st_size
        except OSError:
            size = 0
        items.append(
            {
                "path": rel,
                "name": path.name,
                "kind": kind,
                "status": status,
                "size": size,
                "note": note,
            }
        )
    return items


def _stage_attr(stage, name: str, default=None):
    if isinstance(stage, dict):
        return stage.get(name, default)
    return getattr(stage, name, default)


def qa_dossier(local_path: str | None, template_code: str, stages: list | None = None) -> dict:
    try:
        root = resolve_workspace_root(local_path)
    except ArtifactError:
        root = None
    guard = evaluate_guard(local_path, template_code, stages=stages)
    flow: list[dict] = []
    qa_stages = [
        stage
        for stage in (stages or [])
        if _stage_attr(stage, "stage_def_id") in QA_STAGE_IDS or _stage_attr(stage, "topology") == "qa"
    ]
    for index, stage in enumerate(qa_stages, start=1):
        stage_id = str(_stage_attr(stage, "stage_def_id") or "")
        title = str(_stage_attr(stage, "title") or stage_id)
        agent = str(_stage_attr(stage, "agent") or "QA")
        text = _read_text(root / evidence_file(stage_id)) if root else ""
        if not text and root:
            report_name = {
                "qa_be": "qa/report-back.md",
                "qa_fe": "qa/report-front.md",
                "qa_jornada": "qa/report-jornada.md",
            }.get(stage_id, "")
            text = _read_text(root / report_name) if report_name else ""
        status = verdict_of(text)
        if status == "wait" and _stage_attr(stage, "status") == "done":
            status = "pass"
        flow.append(
            {
                "n": index,
                "title": title,
                "command": _command_line(text) or f"$ etapa {stage_id}",
                "result": _result_line(text, status),
                "status": status,
                "agent": agent,
                "initials": _initials(agent),
                "gate": False,
            }
        )
    guard_status = "pass" if guard["ready_for_handoff"] else ("fail" if guard["passed"] < guard["total"] else "wait")
    if guard["passed"] < guard["total"] and not guard["ready_for_handoff"]:
        guard_status = "fail" if any(rule.get("status") == "fail" for rule in guard["rules"]) else "wait"
    flow.append(
        {
            "n": len(flow) + 1,
            "title": "Completion Guard",
            "command": "$ regras físicas dos artefatos",
            "result": f"{guard['passed']}/{guard['total']} regras atendidas",
            "status": "pass" if guard["passed"] == guard["total"] else guard_status,
            "agent": "Compiler TAVIR",
            "initials": "CT",
            "gate": False,
        }
    )
    final = next((stage for stage in (stages or []) if _stage_attr(stage, "stage_def_id") in {"final_gate", "m_final"}), None)
    final_done = bool(final and _stage_attr(final, "status") == "done")
    flow.append(
        {
            "n": len(flow) + 1,
            "title": "Gate Final CEO",
            "command": "",
            "result": "Aprovado · projeto entregue" if final_done else "Ainda aguarda o Gate Final",
            "status": "pass" if final_done else "wait",
            "agent": "CEO local",
            "initials": "CEO",
            "gate": True,
        }
    )
    evidence = collect_evidence(root, scope="qa") if root else []
    rounds = sum(1 for item in evidence if item["kind"] == "log" and item["status"] in {"pass", "fail"})
    returns = [
        {
            "title": step["title"],
            "status": step["status"],
            "detail": step["result"],
            "actor": step["agent"],
        }
        for step in flow
        if not step["gate"]
    ]
    return {
        **guard,
        "rounds": rounds,
        "flow": flow,
        "returns": returns,
        "evidence": evidence,
    }


def _scanner_rules(root: Path | None) -> list[dict]:
    findings = scan_security(root) if root else ["SEC alta · não há código de produto para auditar."]
    secrets = [item for item in findings if "segredo" in item]
    dynamics = [item for item in findings if "eval" in item]
    empty = [item for item in findings if "não há código" in item]
    parecer = _read_text(root / "security.md") if root else ""
    log = _read_text(root / "qa" / "evidence" / "seo_sec.log") if root else ""
    parecer_status = verdict_of(parecer)
    log_status = verdict_of(log)
    surface = "Código de produto localizado"
    if root and (root / "aplicativo").is_dir():
        surface = "Cliente em aplicativo/"
        if (root / "aplicativo" / "pubspec.yaml").is_file():
            surface = "Cliente Flutter em aplicativo/"
    rules = [
        {
            "id": "sec-secrets",
            "title": "Nenhum segredo no código do produto",
            "status": "fail" if secrets or empty else "pass",
            "detail": secrets[0] if secrets else (empty[0] if empty else "A varredura não achou segredo."),
        },
        {
            "id": "sec-eval",
            "title": "Nenhuma execução dinâmica",
            "status": "fail" if dynamics else "pass",
            "detail": dynamics[0] if dynamics else "A varredura não achou eval.",
        },
        {
            "id": "sec-parecer",
            "title": "Parecer do especialista gravado",
            "status": parecer_status if parecer else "wait",
            "detail": "security.md" if parecer else "O parecer ainda não foi gravado.",
        },
        {
            "id": "sec-log",
            "title": "Evidência da varredura",
            "status": log_status if log else "wait",
            "detail": _result_line(log, log_status) if log else "qa/evidence/seo_sec.log ainda não existe.",
        },
        {
            "id": "sec-surface",
            "title": "Superfície deste projeto",
            "status": "pass" if root else "wait",
            "detail": surface,
        },
    ]
    return rules, findings, parecer_status, log_status, surface


def parse_roteiro(text: str) -> list[dict]:
    items: list[dict] = []
    for line in text.splitlines():
        match = re.match(r"^\s*-\s+\[( |x|X)\]\s+(.+?)\s*$", line)
        if not match:
            continue
        parts = [part.strip() for part in match.group(2).split("|")]
        items.append(
            {
                "id": f"roteiro-{len(items) + 1}",
                "title": parts[0],
                "status": "pass" if match.group(1).lower() == "x" else "wait",
                "detail": parts[1] if len(parts) > 1 else "Item do roteiro do especialista.",
            }
        )
    return items


def security_dossier(local_path: str | None) -> dict:
    try:
        root = resolve_workspace_root(local_path)
    except ArtifactError:
        root = None
    rules, findings, parecer_status, log_status, surface = _scanner_rules(root)
    roteiro_text = _read_text(root / "qa" / "security-roteiro.md") if root else ""
    specialist = parse_roteiro(roteiro_text)
    if specialist:
        rules = specialist
    else:
        rules.append(
            {
                "id": "sec-roteiro",
                "title": "Roteiro do especialista",
                "status": "wait",
                "detail": "Sérgio ainda vai analisar este projeto e gravar o checklist em qa/security-roteiro.md.",
            }
        )
    passed = sum(1 for rule in rules if rule["status"] == "pass")
    total = len(rules) or 1
    flow = [
        {
            "n": 1,
            "title": "Segredos no código",
            "command": "$ varredura de segredo",
            "result": next((rule["detail"] for rule in rules if rule["id"] == "sec-secrets"), surface),
            "status": next((rule["status"] for rule in rules if rule["id"] == "sec-secrets"), "wait"),
            "agent": "Sérgio Seg/LGPD",
            "initials": "SS",
            "gate": False,
        },
        {
            "n": 2,
            "title": "Execução dinâmica",
            "command": "$ varredura de eval",
            "result": next((rule["detail"] for rule in rules if rule["id"] == "sec-eval"), "Sem eval."),
            "status": next((rule["status"] for rule in rules if rule["id"] == "sec-eval"), "wait"),
            "agent": "Sérgio Seg/LGPD",
            "initials": "SS",
            "gate": False,
        },
        {
            "n": 3,
            "title": "Parecer de segurança",
            "command": "$ security.md",
            "result": "Parecer gravado" if parecer_status != "wait" else "Parecer ausente",
            "status": parecer_status if (root and (root / "security.md").is_file()) else "wait",
            "agent": "Sérgio Seg/LGPD",
            "initials": "SS",
            "gate": False,
        },
        {
            "n": 4,
            "title": "Evidência da varredura",
            "command": "$ qa/evidence/seo_sec.log",
            "result": "Log gravado" if log_status != "wait" else "Log ausente",
            "status": log_status if (root and (root / "qa" / "evidence" / "seo_sec.log").is_file()) else "wait",
            "agent": "Sérgio Seg/LGPD",
            "initials": "SS",
            "gate": False,
        },
        {
            "n": 5,
            "title": "Roteiro do especialista",
            "command": "$ qa/security-roteiro.md",
            "result": f"{len(specialist)} itens do roteiro" if specialist else "O especialista ainda não montou o roteiro.",
            "status": "pass" if specialist else "wait",
            "agent": "Sérgio Seg/LGPD",
            "initials": "SS",
            "gate": False,
        },
    ]
    if specialist:
        flow[0]["result"] = surface
        flow[0]["status"] = "pass" if not any("segredo" in item for item in findings) else "fail"
        flow[1]["result"] = "A varredura não achou eval." if not any("eval" in item for item in findings) else findings[0]
        flow[1]["status"] = "pass" if not any("eval" in item for item in findings) else "fail"
    evidence = collect_evidence(root, scope="security") if root else []
    if root and (root / "security.md").is_file():
        already = {item["path"] for item in evidence}
        if "security.md" not in already:
            text = _read_text(root / "security.md")
            evidence.insert(
                0,
                {
                    "path": "security.md",
                    "name": "security.md",
                    "kind": "report",
                    "status": verdict_of(text),
                    "size": (root / "security.md").stat().st_size,
                    "note": "Parecer do especialista",
                },
            )
    returns = [
        {
            "title": item[:80],
            "status": "fail",
            "detail": item,
            "actor": "Sérgio Seg/LGPD",
        }
        for item in findings
        if "não há código" not in item
    ]
    if not returns:
        returns.append(
            {
                "title": "Varredura do código",
                "status": "pass",
                "detail": "Nenhum achado alto de segredo ou eval.",
                "actor": "Sérgio Seg/LGPD",
            }
        )
    rounds = sum(1 for item in evidence if item["status"] in {"pass", "fail"})
    return {
        "template_code": "security",
        "passed": passed,
        "total": total,
        "pct": round((passed / total) * 100),
        "ready_for_handoff": passed == total and total > 0,
        "rounds": rounds,
        "flow": flow,
        "rules": rules,
        "returns": returns,
        "evidence": evidence,
        "findings": findings,
        "specialist": bool(specialist),
    }


def write_scanner_roteiro(root: Path) -> str:
    """Roteiro inicial, específico do que existe na pasta, antes do especialista reescrever."""
    rules, _findings, _parecer, _log, surface = _scanner_rules(root)
    lines = [
        "# Roteiro de verificação",
        "",
        f"Superfície: {surface}",
        "",
    ]
    for rule in rules:
        mark = "x" if rule["status"] == "pass" else " "
        lines.append(f"- [{mark}] {rule['title']} | {rule['detail']}")
    text = "\n".join(lines) + "\n"
    target = root / "qa" / "security-roteiro.md"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")
    return text
