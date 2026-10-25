"""A etapa de código só fecha quando o teste falha e depois passa."""

import json
from pathlib import Path

import pytest

from app.modules.factory.work_session import (
    WorkSessionError,
    build_is_proven,
    run_build_sync,
    run_check_sync,
    run_visual_sync,
    scan_security,
    work_kind,
)


def _agent(workspace: Path, prompt: str, _model: str, _effort: str, _say) -> str:
    tests = workspace / "backend" / "tests"
    code = workspace / "backend" / "office.py"
    if "Fase: só testes" in prompt:
        tests.mkdir(parents=True, exist_ok=True)
        (tests / "test_office.py").write_text(
            "from pathlib import Path\n\n"
            "def test_office():\n"
            "    text = Path('backend/office.py').read_text(encoding='utf-8')\n"
            "    assert 'return \"ok\"' in text\n",
            encoding="utf-8",
        )
        if "grave a implementação junto" in prompt:
            code.parent.mkdir(parents=True, exist_ok=True)
            code.write_text("def ping():\n    return \"ok\"\n", encoding="utf-8")
        return "teste"
    if "enfraqueça o teste" in prompt:
        test = tests / "test_office.py"
        test.write_text("def test_office():\n    assert True\n", encoding="utf-8")
    code.parent.mkdir(parents=True, exist_ok=True)
    code.write_text("def ping():\n    return \"ok\"\n", encoding="utf-8")
    return "código"


def _build(root: Path, **extra):
    params = {"agent": _agent}
    params.update(extra)
    return run_build_sync(
        root,
        "m_code_be",
        agent_name="Diego Sistemas",
        title="Backend",
        model="auto",
        effort="balanced",
        guidance=None,
        expected=["backend/", "qa/plan-back.md", "changes/NOTES.md"],
        **params,
    )


def test_build_falha_primeiro_e_passa_depois(tmp_path: Path):
    (tmp_path / "context").mkdir()
    (tmp_path / "context" / "escopo.md").write_text("Escopo.", encoding="utf-8")
    result = _build(tmp_path)
    assert build_is_proven(tmp_path, "m_code_be") is True
    assert (tmp_path / "backend" / "office.py").is_file()
    assert (tmp_path / "qa" / "plan-back.md").is_file()
    assert (tmp_path / "changes" / "NOTES.md").is_file()
    assert "sessão de código" in result["note"]
    assert "Escopo." in (tmp_path / "context" / "escopo.md").read_text(encoding="utf-8")


def test_build_remove_implementacao_que_passou_cedo(tmp_path: Path):
    def early(workspace: Path, prompt: str, model: str, effort: str, say) -> str:
        if "Fase: só testes" in prompt:
            prompt = prompt + "\ngrave a implementação junto"
        return _agent(workspace, prompt, model, effort, say)

    result = _build(tmp_path, agent=early)
    assert build_is_proven(tmp_path, "m_code_be") is True
    assert "return \"ok\"" in (tmp_path / "backend" / "office.py").read_text(encoding="utf-8")
    assert result["files"]


def test_build_recusa_teste_que_nao_falha(tmp_path: Path):
    def always_pass(workspace: Path, prompt: str, _model: str, _effort: str, _say) -> str:
        tests = workspace / "backend" / "tests"
        tests.mkdir(parents=True, exist_ok=True)
        (tests / "test_office.py").write_text("def test_office():\n    assert True\n", encoding="utf-8")
        return "vazio"

    with pytest.raises(WorkSessionError, match="antes da implementação"):
        _build(tmp_path, agent=always_pass)


def test_build_restaura_teste_alterado(tmp_path: Path):
    def weaken(workspace: Path, prompt: str, model: str, effort: str, say) -> str:
        if "Fase: implementação" in prompt:
            prompt = prompt + "\nenfraqueça o teste"
        return _agent(workspace, prompt, model, effort, say)

    _build(tmp_path, agent=weaken)
    text = (tmp_path / "backend" / "tests" / "test_office.py").read_text(encoding="utf-8")
    assert "return \"ok\"" in text
    assert build_is_proven(tmp_path, "m_code_be") is True


def test_qa_grava_o_resultado_pelo_codigo_de_saida(tmp_path: Path):
    (tmp_path / "backend" / "tests").mkdir(parents=True)
    (tmp_path / "backend" / "tests" / "test_office.py").write_text("def test_office():\n    assert False\n", encoding="utf-8")

    def fail(_root, _args):
        return 1, "E assert 0"

    result = run_check_sync(
        tmp_path,
        "m_qa_be",
        kind="qa",
        agent_name="Tester Automatizado",
        title="QA backend",
        expected=["qa/report-back.md"],
        shell=fail,
    )
    report = (tmp_path / "qa" / "report-back.md").read_text(encoding="utf-8")
    assert "Resultado: REPROVADO" in report
    assert "execucao: falhou" in (tmp_path / "qa" / "evidence" / "m_qa_be.log").read_text(encoding="utf-8")
    assert result["note"].startswith("execução falhou")


def test_seguranca_reprova_segredo(tmp_path: Path):
    backend = tmp_path / "backend"
    backend.mkdir()
    (backend / "office.py").write_text("password = \"supersecret\"\n", encoding="utf-8")
    findings = scan_security(tmp_path)
    assert any("segredo" in item for item in findings)
    result = run_check_sync(
        tmp_path,
        "m_hard",
        kind="security",
        agent_name="Sérgio Seg/LGPD",
        title="Auditoria",
        expected=["security.md"],
    )
    assert "Parecer: REPROVADO" in (tmp_path / "security.md").read_text(encoding="utf-8")
    assert "execução falhou" in result["note"]


def test_markdown_sem_log_nao_prova_o_build(tmp_path: Path):
    (tmp_path / "qa").mkdir()
    (tmp_path / "qa" / "plan-back.md").write_text("Resultado: APROVADO\n", encoding="utf-8")
    assert build_is_proven(tmp_path, "m_code_be") is False


def test_pedido_de_codigo_cita_o_programa(tmp_path: Path):
    seen: list[str] = []

    def spy(workspace: Path, prompt: str, model: str, effort: str, say) -> str:
        seen.append(prompt)
        return _agent(workspace, prompt, model, effort, say)

    (tmp_path / "context").mkdir()
    (tmp_path / "context" / "contrato.json").write_text(
        json.dumps({"produto": "Painel", "telas": ["Home", "Fila"], "stack_frontend": "React 18"}),
        encoding="utf-8",
    )
    _build(tmp_path, agent=spy)
    code_prompt = next(prompt for prompt in seen if "Fase: implementação" in prompt)
    assert "Home" in code_prompt
    assert "React 18" in code_prompt
    assert "Um arquivo .md não substitui esse programa." in code_prompt


def test_prova_visual_grava_a_interface(tmp_path: Path):
    (tmp_path / "context").mkdir()
    (tmp_path / "context" / "contrato.json").write_text(
        json.dumps({"produto": "Painel", "telas": ["Home"], "stack_frontend": "React 18"}),
        encoding="utf-8",
    )

    def agent(workspace: Path, prompt: str, _model: str, _effort: str, _say) -> str:
        assert "A entrega é a interface" in prompt
        assert "Home" in prompt
        folder = workspace / "frontend"
        folder.mkdir()
        (folder / "index.html").write_text("<div id='tavir-app'>Home</div>\n" * 40, encoding="utf-8")
        (folder / "app.js").write_text("const tela = 'Home';\n" * 40, encoding="utf-8")
        return "ok"

    result = run_visual_sync(
        tmp_path,
        "visual_proof",
        agent_name="Enzo Extrator",
        title="Prova visual",
        model="auto",
        effort="balanced",
        guidance=None,
        agent=agent,
    )
    assert "interface gravada" in result["note"]
    readme = (tmp_path / "visual_proof" / "README.md").read_text(encoding="utf-8")
    assert "frontend/index.html" in readme
    assert "Vou ler" not in readme


def test_prova_visual_flutter_grava_dart(tmp_path: Path):
    (tmp_path / "context").mkdir()
    (tmp_path / "context" / "contrato.json").write_text(
        json.dumps({"produto": "Painel", "telas": ["Home"], "stack_frontend": "Flutter / Dart", "entregavel": "apk"}),
        encoding="utf-8",
    )

    def agent(workspace: Path, prompt: str, _model: str, _effort: str, _say) -> str:
        assert "aplicativo/lib/main.dart" in prompt
        assert "frontend/index.html" not in prompt
        lib = workspace / "aplicativo" / "lib"
        lib.mkdir(parents=True)
        (workspace / "aplicativo" / "pubspec.yaml").write_text("name: painel\n", encoding="utf-8")
        (lib / "main.dart").write_text("void main() {}\n// tela Home\n" * 40, encoding="utf-8")
        return "ok"

    result = run_visual_sync(
        tmp_path,
        "visual_proof",
        agent_name="Enzo Extrator",
        title="Prova visual",
        model="auto",
        effort="balanced",
        guidance=None,
        agent=agent,
    )
    assert "interface gravada" in result["note"]
    readme = (tmp_path / "visual_proof" / "README.md").read_text(encoding="utf-8")
    assert "aplicativo/lib/main.dart" in readme


def test_prova_visual_rejeita_so_markdown(tmp_path: Path):
    def agent(workspace: Path, _prompt: str, _model: str, _effort: str, _say) -> str:
        folder = workspace / "visual_proof"
        folder.mkdir()
        (folder / "README.md").write_text("só texto sobre a tela", encoding="utf-8")
        return "ok"

    with pytest.raises(WorkSessionError, match="markdown"):
        run_visual_sync(
            tmp_path,
            "visual_proof",
            agent_name="Enzo Extrator",
            title="Prova visual",
            model="auto",
            effort="balanced",
            guidance=None,
            agent=agent,
        )


def test_prova_visual_e_sessao_de_codigo():
    assert work_kind("visual_proof") == "visual"
    assert work_kind("build_fe") == "build"
    assert work_kind("docs") is None


def test_sessao_nao_abre_o_escritorio():
    office = Path(__file__).resolve().parents[3]
    with pytest.raises(WorkSessionError, match="escritório"):
        run_build_sync(
            office,
            "m_code_be",
            agent_name="Diego Sistemas",
            title="Backend",
            model="auto",
            effort="balanced",
            guidance=None,
            expected=["backend/"],
            agent=_agent,
        )
