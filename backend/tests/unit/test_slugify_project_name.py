"""Slug de pasta da Fábrica — acentos e ç."""
from app.modules.factory.workspace_roots import slugify_project_name


def test_slugify_venda_de_maca():
    assert slugify_project_name("Venda de Maça") == "venda-de-maca"


def test_slugify_accents_and_spaces():
    assert slugify_project_name("  LP Ação B2B  ") == "lp-acao-b2b"
    assert slugify_project_name("São Paulo · Oferta") == "sao-paulo-oferta"


def test_slugify_empty_fallback():
    assert slugify_project_name("   ") == "projeto"
    assert slugify_project_name("!!!") == "projeto"
