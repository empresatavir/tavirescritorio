"""Jornada de uso: a API do escritório e os testes do produto.

A frase do relatório sai desta rotina. Ela não aprova sozinha.
"""
from __future__ import annotations

import importlib.util
import tempfile
from pathlib import Path

from app.modules.factory.quality_loop import report_path
from app.modules.factory.work_session import evidence_file, run_shell, test_args


def executar_jornada(pedir) -> list[str]:
    """Percorre criar tarefa, mover, criar job e cancelar. Devolve as falhas."""
    falhas: list[str] = []

    def chamar(nome: str, method: str, path: str, body=None):
        try:
            resposta = pedir(method, path, body)
        except Exception as exc:
            falhas.append(f"{nome}: {exc}")
            return None
        if not isinstance(resposta, dict):
            falhas.append(f"{nome}: resposta sem status")
            return None
        return resposta

    saude = chamar("Saúde", "GET", "/health")
    if saude is not None and (saude.get("status") != 200 or "services" not in (saude.get("json") or {})):
        falhas.append(f"Saúde: status {saude.get('status')}")

    stats = chamar("Números", "GET", "/stats")
    corpo = (stats or {}).get("json") if stats else None
    if stats is not None and (
        stats.get("status") != 200
        or not isinstance(corpo, dict)
        or any(key not in corpo for key in ("running", "queued", "spentToday", "pendingCount"))
    ):
        falhas.append(f"Números: status {stats.get('status')}")

    criada = chamar(
        "Criar tarefa",
        "POST",
        "/tasks",
        {"title": "Jornada da fábrica", "sector": "Operação", "prio": "Normal"},
    )
    tarefa = (criada or {}).get("json") if criada else None
    tarefa_id = tarefa.get("id") if isinstance(tarefa, dict) else ""
    if criada is not None and (criada.get("status") not in {200, 201} or not str(tarefa_id).startswith("T-")):
        falhas.append(f"Criar tarefa: status {criada.get('status')}")

    lista = chamar("Listar tarefas", "GET", "/tasks")
    itens = (lista or {}).get("json") if lista else None
    if lista is not None and (
        lista.get("status") != 200
        or not isinstance(itens, list)
        or not any(isinstance(item, dict) and item.get("id") == tarefa_id for item in itens)
    ):
        falhas.append("Listar tarefas: a tarefa criada não voltou")

    if tarefa_id:
        movida = chamar("Mover tarefa", "PATCH", f"/tasks/{tarefa_id}", {"col": "doing"})
        coluna = (movida or {}).get("json") if movida else None
        if movida is not None and (movida.get("status") != 200 or not isinstance(coluna, dict) or coluna.get("col") != "doing"):
            falhas.append(f"Mover tarefa: status {movida.get('status')}")

    job = chamar(
        "Criar job",
        "POST",
        "/jobs",
        {"kind": "agent", "fields": {"instrucao": "Jornada da fábrica", "agente": "Analista"}},
    )
    job_corpo = (job or {}).get("json") if job else None
    job_id = job_corpo.get("id") if isinstance(job_corpo, dict) else ""
    if job is not None and (job.get("status") not in {200, 201} or not str(job_id).startswith("job-")):
        falhas.append(f"Criar job: status {job.get('status')}")

    if job_id:
        cancelado = chamar("Cancelar job", "POST", f"/jobs/{job_id}/cancel")
        estado = (cancelado or {}).get("json") if cancelado else None
        if cancelado is not None and (
            cancelado.get("status") != 200 or not isinstance(estado, dict) or estado.get("status") != "cancel"
        ):
            falhas.append(f"Cancelar job: status {cancelado.get('status')}")

    pendencias = chamar("Pendências", "GET", "/pendings")
    if pendencias is not None and (pendencias.get("status") != 200 or not isinstance(pendencias.get("json"), list)):
        falhas.append(f"Pendências: status {pendencias.get('status')}")
    return falhas


def carregar_office(root: Path):
    """Abre o office.py do produto num SQLite temporário. None se o arquivo não existe."""
    path = root / "backend" / "office.py"
    if not path.is_file():
        return None
    spec = importlib.util.spec_from_file_location(f"office_{abs(hash(path))}", path)
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    pasta = Path(tempfile.mkdtemp(prefix="tavir-jornada-"))
    app = module.open_office(pasta / "jornada.sqlite", brain=None)

    def pedir(method: str, route: str, body=None):
        resposta = app.request(method, route, json=body)
        return {"status": resposta.status_code, "json": resposta.json()}

    return pedir


def suites_do_produto(root: Path) -> list[str]:
    found = []
    for relative in ("backend/tests", "frontend/tests"):
        folder = root / relative
        if folder.is_dir() and any(folder.rglob("test_*.py")):
            found.append(relative)
    return found


def run_jornada_sync(
    root: Path,
    stage_def_id: str,
    *,
    agent_name: str,
    title: str,
    expected: list[str],
    on_status=None,
    shell=None,
    pedir=None,
) -> dict:
    """Roda a API e os testes do produto. Grava o relatório com o código real."""
    root = root.resolve()
    say = on_status or (lambda _message: None)
    falhas: list[str] = []
    saidas: list[str] = []
    cliente = pedir
    if cliente is None:
        say(f"{agent_name} abre o escritório do produto e percorre a jornada.")
        cliente = carregar_office(root)
        if cliente is None:
            falhas.append("A jornada precisa de backend/office.py.")
    if cliente is not None:
        falhas.extend(executar_jornada(cliente))
        saidas.append("jornada de API executada")

    run_cmd = shell or run_shell
    for suite in suites_do_produto(root):
        args = test_args(root, {"tests": suite, "code": suite.split("/")[0], "side": "backend", "other": ""})
        say(f"{agent_name} executa {suite}.")
        code, output = run_cmd(root, args)
        saidas.append(f"$ {' '.join(args)}\n{output}")
        if code != 0:
            falhas.append(f"{suite} terminou com código {code}.")

    passed = not falhas
    state = "passou" if passed else "falhou"
    verdict = "APROVADO" if passed else "REPROVADO"
    detail = "\n".join(falhas) if falhas else "A jornada e os testes do produto passaram."
    log = (
        f"comando: jornada\nexecucao: {state}\ncodigo_saida: {0 if passed else 1}\n---\n"
        f"{detail}\n\n" + "\n\n".join(saidas)[:4000] + "\n"
    )
    report = (
        f"# {title}\n\n"
        f"**Agente:** {agent_name}  \n"
        "**Formato:** ASD-STE100\n\n"
        f"Resultado: {verdict}\n\n"
        "## Situação\n\n"
        "A rotina percorreu a API e os testes do produto.\n\n"
        "## O que li\n\n"
        "Saúde, números, tarefa, job, cancelamento, pendências e as pastas de teste.\n\n"
        "## Entrega\n\n"
        f"{detail}\n\n"
        "## Evidência\n\n"
        f"O log está em `{evidence_file(stage_def_id)}`.\n\n"
        "## Riscos\n\n"
        "Uma frase sem esta execução não aprova a jornada.\n\n"
        "## Próximo passo\n\n"
        + ("Siga para a compilação.\n" if passed else "Corrija o código. Rode a mesma jornada de novo.\n")
    )
    from app.modules.factory.work_session import _write

    target = report_path("qa", stage_def_id)
    if expected:
        for item in expected:
            if str(item).endswith(".md"):
                target = str(item)
                break
    files = [_write(root, evidence_file(stage_def_id), log), _write(root, target, report)]
    say(f"{title} registrou Resultado: {verdict}.")
    return {"files": files, "note": f"jornada {state}"}
