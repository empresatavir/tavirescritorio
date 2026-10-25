"""A leitura da criação só aceita caminhos de código citados no contrato."""

import json
from pathlib import Path

from app.modules.factory.intake import (
    contract_is_useful,
    contract_targets,
    merge_expected,
    needs_contract,
    parse_contract,
)

def test_contrato_vazio_nao_trava_a_leitura(tmp_path: Path):
    folder = tmp_path / "context"
    folder.mkdir()
    (folder / "contrato.json").write_text(
        json.dumps({"read_ok": False, "backend_files": [], "resumo": ""}),
        encoding="utf-8",
    )
    assert contract_is_useful(str(tmp_path)) is False
    (folder / "contrato.json").write_text(
        json.dumps({"read_ok": True, "resumo": "Controle mobile da operação.", "telas": ["Home"]}),
        encoding="utf-8",
    )
    assert contract_is_useful(str(tmp_path)) is True


def test_contrato_ignora_caminho_fora_da_pasta():
    text = json.dumps(
        {
            "produto": "Controle Mobile",
            "telas": ["Home", "Fila"],
            "backend_files": ["backend/office.py", "C:/segredo.py", "../backend/office.py", "office.py"],
            "frontend_files": ["frontend/index.html", "frontend/README.md"],
        }
    )
    data = parse_contract(text)
    assert data["backend_files"] == ["backend/office.py"]
    assert data["frontend_files"] == ["frontend/index.html"]
    assert data["entregavel"] == "web"
    assert data["telas"] == ["Home", "Fila"]


def test_codigo_pede_contrato_quando_a_especificacao_existe():
    assert needs_contract("m_code_be", has_contract=False, has_source=True) is True
    assert needs_contract("m_code_be", has_contract=True, has_source=True) is False
    assert needs_contract("m_qa_be", has_contract=False, has_source=True) is False


def test_etapa_de_codigo_recebe_os_arquivos_do_contrato(tmp_path: Path):
    (tmp_path / "context").mkdir()
    (tmp_path / "context" / "contrato.json").write_text(
        json.dumps({"backend_files": ["backend/office.py"], "frontend_files": ["frontend/index.html"]}),
        encoding="utf-8",
    )
    assert contract_targets(str(tmp_path), "m_code_be") == ["backend/office.py"]
    assert contract_targets(str(tmp_path), "m_qa_be") == []
    merged = merge_expected(str(tmp_path), "m_code_fe", ["frontend/", "qa/plan-front.md"])
    assert merged == ["frontend/", "qa/plan-front.md", "frontend/index.html"]


def test_contrato_aceita_flutter_e_recusa_caminho_sujo():
    text = json.dumps(
        {
            "produto": "Controle no celular",
            "resumo": "App web e apk",
            "stack_frontend": "html e flutter",
            "frontend_files": [
                "aplicativo/lib/main.dart",
                "aplicativo/pubspec.yaml",
                "aplicativo/../segredo.dart",
                "frontend/app.js",
            ],
            "telas": ["Home"],
        }
    )
    data = parse_contract(text)
    assert data["frontend_files"] == [
        "aplicativo/lib/main.dart",
        "aplicativo/pubspec.yaml",
        "frontend/app.js",
    ]
    assert data["entregavel"] == "ambos"


def test_contrato_vazio_bloqueia_codigo_e_apk(tmp_path: Path):
    from app.modules.factory.intake import contract_block_reason

    (tmp_path / "context").mkdir()
    (tmp_path / "context" / "contrato.json").write_text(
        json.dumps({"read_ok": False, "telas": [], "resumo": ""}),
        encoding="utf-8",
    )
    (tmp_path / "context" / "spec.md").write_text("Especificação.", encoding="utf-8")
    reason = contract_block_reason(str(tmp_path), "m_code_fe", has_source=True)
    assert reason
    assert "contrato está vazio" in reason
    assert contract_block_reason(str(tmp_path), "build_apk", has_source=True)
    assert contract_block_reason(str(tmp_path), "m_diag", has_source=True) is None
    assert contract_block_reason(str(tmp_path), "m_code_fe", has_source=False) is None
