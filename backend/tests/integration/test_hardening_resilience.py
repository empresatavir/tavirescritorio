"""Integration tests for Phase 7 (Goal G10) Hardening, Resilience, and Backup/Restore."""
import os
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Adiciona o diretório scripts ao path para testar utilitários
ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from backup_restore import backup_database, restore_database, verify_database
from app.main import app

DB_PATH = ROOT_DIR / "backend" / "tavir.db"


def test_database_integrity_and_foreign_keys():
    """Verify that the production SQLite database passes integrity and foreign key checks."""
    assert DB_PATH.exists(), f"Database not found at {DB_PATH}"
    
    ok, msg, stats = verify_database(DB_PATH)
    assert ok is True, f"Database integrity check failed: {msg}"
    assert stats.get("agents", 0) >= 47, f"Expected at least 47 agents, found {stats.get('agents')}"
    assert stats.get("tasks", 0) >= 30, f"Expected tasks in database, found {stats.get('tasks')}"
    assert stats.get("knowledge_entries", 0) >= 100, f"Expected vault entries, found {stats.get('knowledge_entries')}"


def test_sqlite_backup_and_restore_cycle(tmp_path):
    """Test full cycle: online backup -> verify -> restore to separate target -> verify."""
    backup_dir = tmp_path / "backups"
    restore_target = tmp_path / "restored_tavir.db"

    # 1. Executa backup atômico
    backup_file = backup_database(src_path=DB_PATH, dest_dir=backup_dir)
    assert backup_file.exists()
    assert backup_file.stat().st_size > 0

    # 2. Verifica integridade do arquivo gerado
    ok, msg, bkp_stats = verify_database(backup_file)
    assert ok is True, f"Backup failed verification: {msg}"

    # 3. Restaura para o target temporário
    restored = restore_database(backup_path=backup_file, target_path=restore_target)
    assert restored is True
    assert restore_target.exists()

    # 4. Verifica integridade do banco restaurado
    ok_res, msg_res, res_stats = verify_database(restore_target)
    assert ok_res is True, f"Restored database failed verification: {msg_res}"
    assert bkp_stats == res_stats, "Stats before and after restore mismatch!"


@pytest.mark.asyncio
async def test_graceful_degradation_without_external_credentials():
    """Verify API endpoints degrade gracefully without throwing 500 when external keys are absent."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Status de integrações deve retornar 200 com status='unavailable', nunca 500
        res = await client.get("/api/v1/integrations/ghostcli/status")
        assert res.status_code == 200
        data = res.json()
        assert data["integration"] == "ghostcli"
        assert data["status"] in ["unavailable", "configured", "error"]

        # Catálogo de modelos deve retornar fallback padrão
        res_models = await client.get("/api/v1/models")
        assert res_models.status_code == 200
        models_data = res_models.json()
        assert "models" in models_data
        assert len(models_data["models"]) >= 4


def test_offline_asset_headers_and_local_fonts():
    """Verify fonts and css assets exist locally in frontend source tree (zero external CDN)."""
    frontend_dir = ROOT_DIR / "frontend"
    assert frontend_dir.exists()

    # Verifica fontes locais
    fonts_dir = frontend_dir / "src" / "shared" / "fonts"
    assert fonts_dir.exists(), f"Fonts directory not found at {fonts_dir}"
    
    font_files = list(fonts_dir.glob("*.ttf")) + list(fonts_dir.glob("*.woff2"))
    assert len(font_files) >= 2, f"Expected local font files, found {font_files}"

    # Verifica que index.html não importa CDNs externos de estilos ou fontes
    index_html = (frontend_dir / "index.html").read_text(encoding="utf-8")
    assert "fonts.googleapis.com" not in index_html, "Found external Google Fonts CDN link in index.html"
    assert "cdn.jsdelivr.net" not in index_html, "Found external CDN link in index.html"
    assert "unpkg.com" not in index_html, "Found unpkg CDN link in index.html"
