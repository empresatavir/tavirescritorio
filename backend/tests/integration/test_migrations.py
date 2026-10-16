"""Integration tests for Alembic migrations and API endpoints."""
import pytest
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent.parent / "tavir.db"


def test_all_tables_exist():
    """Verify all expected tables were created by the initial migration."""
    assert DB_PATH.exists(), f"Database file not found at {DB_PATH}"
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()

    expected = ["agents", "approvals", "artifacts", "events", "jobs", "projects", "tasks"]
    for table in expected:
        assert table in tables, f"Table '{table}' not found in database. Found: {tables}"


def test_seed_data_exists():
    """Verify seed script populated initial data."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM agents")
    agent_count = cursor.fetchone()[0]
    assert agent_count >= 2, f"Expected at least 2 agents, found {agent_count}"

    cursor.execute("SELECT COUNT(*) FROM projects")
    project_count = cursor.fetchone()[0]
    assert project_count >= 1, f"Expected at least 1 project, found {project_count}"

    cursor.execute("SELECT COUNT(*) FROM tasks")
    task_count = cursor.fetchone()[0]
    assert task_count >= 1, f"Expected at least 1 task, found {task_count}"

    conn.close()