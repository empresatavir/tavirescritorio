"""Unit tests — normalização de status e depends_on do fluxo Tasks (Fase 5)."""
import pytest
from app.api.v1.tasks import normalize_task_status, _normalize_depends_on


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("to_plan", "to_plan"),
        ("planning", "planning"),
        ("planned", "planned"),
        ("in_progress", "in_progress"),
        ("done", "done"),
        ("pending", "to_plan"),
        ("todo", "to_plan"),
        ("completed", "done"),
        ("succeeded", "done"),
        (None, "to_plan"),
        ("", "to_plan"),
        ("  PENDING  ", "to_plan"),
        ("unknown-x", "to_plan"),
    ],
)
def test_normalize_task_status(raw, expected):
    assert normalize_task_status(raw) == expected


def test_normalize_depends_on_unique_and_strip_hash():
    assert _normalize_depends_on(["#12", 12, "45", "", None, "#45"]) == ["12", "45"]


def test_normalize_depends_on_empty():
    assert _normalize_depends_on(None) == []
    assert _normalize_depends_on([]) == []
