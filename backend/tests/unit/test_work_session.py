"""A etapa de código só fecha quando o teste falha e depois passa."""

from pathlib import Path

import pytest

from app.modules.factory.work_session import (
    WorkSessionError,
    build_is_proven,
    run_build_sync,
    run_check_sync,
    scan_security,
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
