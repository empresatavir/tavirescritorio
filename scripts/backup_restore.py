"""
Script utilitário para Backup, Restore e Auditoria de Integridade do SQLite (tavir.db).
Utiliza a API nativa de Online Backup do SQLite para garantir atomicidade e consistência
mesmo com o sistema ativo (modo WAL).
"""
import argparse
import os
import shutil
import sqlite3
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = ROOT_DIR / "backend" / "tavir.db"
DEFAULT_BACKUP_DIR = ROOT_DIR / "db" / "backups"


def verify_database(db_path: Path) -> tuple[bool, str, dict[str, int]]:
    """Verifica a integridade física e de chaves estrangeiras do banco SQLite."""
    if not db_path.exists():
        return False, f"Arquivo não encontrado: {db_path}", {}

    table_counts = {}
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # 1. PRAGMA integrity_check
        cursor.execute("PRAGMA integrity_check")
        integrity_result = cursor.fetchall()
        if not integrity_result or integrity_result[0][0].lower() != "ok":
            conn.close()
            return False, f"Falha no integrity_check: {integrity_result}", {}

        # 2. PRAGMA foreign_key_check
        cursor.execute("PRAGMA foreign_key_check")
        fk_violations = cursor.fetchall()
        if fk_violations:
            conn.close()
            return False, f"Violações de chave estrangeira encontradas: {len(fk_violations)}", {}

        # 3. Estatísticas de tabelas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        tables = [r[0] for r in cursor.fetchall()]
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM \"{table}\"")
                table_counts[table] = cursor.fetchone()[0]
            except Exception:
                table_counts[table] = -1

        conn.close()
        return True, "Integridade física e relacional 100% OK", table_counts
    except Exception as exc:
        return False, f"Erro ao acessar banco: {exc}", {}


def backup_database(src_path: Path = DEFAULT_DB_PATH, dest_dir: Path = DEFAULT_BACKUP_DIR) -> Path:
    """Realiza backup atômico e seguro usando SQLite Online Backup API."""
    if not src_path.exists():
        raise FileNotFoundError(f"Banco de dados de origem não encontrado: {src_path}")

    dest_dir.mkdir(parents=True, exist_ok=True)
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    backup_file = dest_dir / f"tavir_backup_{timestamp}.db"

    # Conecta no banco de origem e no destino e realiza o backup
    src_conn = sqlite3.connect(str(src_path))
    dest_conn = sqlite3.connect(str(backup_file))

    try:
        src_conn.backup(dest_conn, pages=100)
    finally:
        dest_conn.close()
        src_conn.close()

    # Valida o arquivo recém-gerado
    ok, msg, stats = verify_database(backup_file)
    if not ok:
        if backup_file.exists():
            backup_file.unlink()
        raise RuntimeError(f"Backup gerado falhou na verificação de integridade: {msg}")

    return backup_file


def restore_database(backup_path: Path, target_path: Path = DEFAULT_DB_PATH) -> bool:
    """Restaura o banco a partir de um backup verificado, gerando cópia de segurança prévia."""
    if not backup_path.exists():
        raise FileNotFoundError(f"Arquivo de backup não encontrado: {backup_path}")

    # Valida o backup antes de tocar no destino
    ok, msg, _ = verify_database(backup_path)
    if not ok:
        raise ValueError(f"Arquivo de backup corrompido ou inválido: {msg}")

    # Cria snapshot de segurança do estado atual, se existir
    if target_path.exists():
        pre_restore = target_path.with_suffix(".pre-restore")
        shutil.copy2(target_path, pre_restore)

    target_path.parent.mkdir(parents=True, exist_ok=True)

    # Restaura usando a API de backup
    backup_conn = sqlite3.connect(str(backup_path))
    target_conn = sqlite3.connect(str(target_path))

    try:
        backup_conn.backup(target_conn, pages=100)
    finally:
        target_conn.close()
        backup_conn.close()

    # Valida o destino restaurado
    ok, msg, _ = verify_database(target_path)
    if not ok:
        raise RuntimeError(f"Banco restaurado falhou na verificação: {msg}")

    return True


def list_backups(dest_dir: Path = DEFAULT_BACKUP_DIR) -> list[tuple[Path, int, str]]:
    """Lista todos os backups existentes com data e tamanho."""
    if not dest_dir.exists():
        return []

    files = sorted(dest_dir.glob("tavir_backup_*.db"), reverse=True)
    results = []
    for f in files:
        size_bytes = f.stat().st_size
        mod_time = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(f.stat().st_mtime))
        results.append((f, size_bytes, mod_time))
    return results


def main():
    parser = argparse.ArgumentParser(description="TAVIR Escritório — Gestão de Backups e Integridade do SQLite")
    parser.add_argument("--backup", action="store_true", help="Executar backup do banco atual")
    parser.add_argument("--restore", type=str, metavar="ARQUIVO", help="Restaurar banco a partir de um arquivo de backup")
    parser.add_argument("--verify", type=str, nargs="?", const=str(DEFAULT_DB_PATH), help="Verificar integridade do banco (padrão: tavir.db)")
    parser.add_argument("--list", action="store_true", help="Listar backups disponíveis")

    args = parser.parse_args()

    if args.backup:
        print(f"[*] Iniciando backup de {DEFAULT_DB_PATH}...")
        try:
            dest = backup_database()
            size_kb = dest.stat().st_size / 1024
            print(f"[OK] Backup concluído com sucesso: {dest} ({size_kb:.1f} KB)")
        except Exception as e:
            print(f"[ERRO] Falha no backup: {e}", file=sys.stderr)
            sys.exit(1)

    elif args.restore:
        backup_path = Path(args.restore)
        print(f"[*] Restaurando {DEFAULT_DB_PATH} a partir de {backup_path}...")
        try:
            restore_database(backup_path)
            print(f"[OK] Banco restaurado e validado com sucesso!")
        except Exception as e:
            print(f"[ERRO] Falha na restauração: {e}", file=sys.stderr)
            sys.exit(1)

    elif args.verify is not None:
        target = Path(args.verify)
        print(f"[*] Verificando integridade de {target}...")
        ok, msg, stats = verify_database(target)
        if ok:
            print(f"[OK] {msg}")
            print("--- Estatísticas das Tabelas ---")
            for t, cnt in sorted(stats.items()):
                print(f"  - {t}: {cnt} registros")
        else:
            print(f"[ERRO] {msg}", file=sys.stderr)
            sys.exit(1)

    elif args.list:
        print("[*] Backups existentes em db/backups/:")
        backups = list_backups()
        if not backups:
            print("  (Nenhum backup encontrado)")
        for path, size, mtime in backups:
            print(f"  - {path.name} | {size / 1024:.1f} KB | {mtime}")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
