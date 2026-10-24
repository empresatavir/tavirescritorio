from pathlib import Path

from app.modules.factory.quality_loop import read_verdict, rework_target, write_issue


class _Stage:
    def __init__(self, stage_def_id, sort_order, topology):
        self.stage_def_id = stage_def_id
        self.sort_order = sort_order
        self.topology = topology


def test_missing_verdict_is_rejected():
    assert read_verdict("## Entrega\n\nTexto sem linha final.\n", "qa") == "reprovado"
    assert read_verdict("Resultado: APROVADO\n", "qa") == "aprovado"
    assert read_verdict("Parecer: REPROVADO\n", "security") == "reprovado"


def test_rework_returns_to_first_build_before_review():
    stages = [
        _Stage("m_plan_gate", 3, "spec"),
        _Stage("m_code", 4, "build"),
        _Stage("m_qa", 5, "qa"),
        _Stage("m_hard", 6, "review"),
    ]
    target = rework_target(stages, stages[-1])
    assert target.stage_def_id == "m_code"


def test_front_qa_returns_only_to_frontend():
    stages = [
        _Stage("m_code_be", 4, "build"),
        _Stage("m_code_fe", 5, "build"),
        _Stage("m_qa_be", 6, "qa"),
        _Stage("m_qa_fe", 7, "qa"),
    ]
    assert rework_target(stages, stages[2]).stage_def_id == "m_code_be"
    assert rework_target(stages, stages[3]).stage_def_id == "m_code_fe"


def test_jornada_volta_para_o_frontend():
    stages = [
        _Stage("m_code_fe", 5, "build"),
        _Stage("m_qa_fe", 7, "qa"),
        _Stage("m_qa_jornada", 8, "qa"),
        _Stage("m_apk", 9, "build"),
    ]
    assert rework_target(stages, stages[2]).stage_def_id == "m_code_fe"


def test_issue_file_is_numbered(tmp_path: Path):
    first = write_issue(tmp_path, "qa", "Resultado: REPROVADO\n\nO botão salvar falhou.")
    second = write_issue(tmp_path, "security", "Parecer: REPROVADO\n\nSEC-001 segredo no código.")
    assert first == "qa/issues/QA-001.md"
    assert second == "security/issues/SEC-001.md"
    assert "botão salvar" in (tmp_path / first).read_text(encoding="utf-8")
