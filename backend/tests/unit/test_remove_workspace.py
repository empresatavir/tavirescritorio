"""A exclusão de pasta só apaga a pasta direta do projeto."""
from pathlib import Path

import pytest

from app.modules.factory import workspace_roots as roots


def _roots(monkeypatch, tmp_path: Path) -> tuple[Path, Path]:
    interno = tmp_path / "tavir-interno"
    externo = tmp_path / "tavir-exterrno"
    interno.mkdir()
    externo.mkdir()
    monkeypatch.setattr(roots, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(roots, "INTERNAL_ROOT", interno)
    monkeypatch.setattr(roots, "EXTERNAL_ROOT", externo)
    return interno, externo


def test_remove_a_pasta_direta_do_projeto(monkeypatch, tmp_path: Path) -> None:
    interno, _externo = _roots(monkeypatch, tmp_path)
    projeto = interno / "app-tavir"
    projeto.mkdir()
    (projeto / "leia.txt").write_text("ok", encoding="utf-8")

    removed = roots.remove_project_workspace(str(projeto))

    assert removed == projeto.resolve()
    assert not projeto.exists()
    assert interno.is_dir()


def test_recusa_a_raiz_e_o_escritorio(monkeypatch, tmp_path: Path) -> None:
    interno, _externo = _roots(monkeypatch, tmp_path)
    with pytest.raises(ValueError, match="raiz do escritório"):
        roots.remove_project_workspace(str(interno))

    escritorio = interno / "falso-escritorio"
    marker = escritorio / "backend" / "app" / "modules" / "factory"
    marker.mkdir(parents=True)
    (marker / "executor.py").write_text("x", encoding="utf-8")
    with pytest.raises(ValueError, match="escritório"):
        roots.remove_project_workspace(str(escritorio))
    assert (marker / "executor.py").is_file()


def test_recusa_pasta_fora_da_fabrica(monkeypatch, tmp_path: Path) -> None:
    _roots(monkeypatch, tmp_path)
    fora = tmp_path / "outro"
    fora.mkdir()
    with pytest.raises(ValueError, match="fora das raízes"):
        roots.remove_project_workspace(str(fora))
    assert fora.is_dir()
