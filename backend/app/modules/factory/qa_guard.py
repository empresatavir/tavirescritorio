"""B5 — Completion Guard / QA checklist por template."""
from __future__ import annotations

from pathlib import Path

from app.modules.factory.artifacts import expected_status, resolve_workspace_root, ArtifactError
from app.modules.factory.esteiras import get_esteira, stage_definitions


def default_guard_rules(template_code: str) -> list[dict]:
    """Regras mínimas: expected_artifacts das stages + gate final."""
    esteira = get_esteira(template_code)
    defs = stage_definitions(template_code) if esteira else []
    rules: list[dict] = []
    for d in defs:
        arts = d.get("expected_artifacts") or []
        if not arts:
            continue
        rules.append(
            {
                "id": f"art-{d['id']}",
                "stage_def_id": d["id"],
                "title": f"Artefatos · {d['title']}",
                "kind": "artifact",
                "paths": list(arts),
            }
        )
    rules.append(
        {
            "id": "final-gate",
            "stage_def_id": defs[-1]["id"] if defs else None,
            "title": "Gate Final CEO",
            "kind": "gate",
            "paths": [],
        }
    )
    return rules


def evaluate_guard(
    local_path: str | None,
    template_code: str,
    *,
    stages: list | None = None,
) -> dict:
    rules = default_guard_rules(template_code)
    results = []
    passed = 0
    for rule in rules:
        if rule["kind"] == "artifact":
            status = expected_status(local_path, rule["paths"])
            ok = all(s["present"] for s in status) if status else False
            results.append(
                {
                    **rule,
                    "status": "pass" if ok else "fail",
                    "detail": status,
                }
            )
            if ok:
                passed += 1
        elif rule["kind"] == "gate":
            stage_ok = False
            if stages and rule.get("stage_def_id"):
                st = next((s for s in stages if getattr(s, "stage_def_id", None) == rule["stage_def_id"]), None)
                stage_ok = bool(st and getattr(st, "status", None) == "done")
            results.append(
                {
                    **rule,
                    "status": "pass" if stage_ok else "wait",
                    "detail": [],
                }
            )
            if stage_ok:
                passed += 1

    total = len(results) or 1
    try:
        resolve_workspace_root(local_path)
        ws_ok = True
    except ArtifactError:
        ws_ok = False

    return {
        "template_code": template_code,
        "workspace_ok": ws_ok,
        "rules": results,
        "passed": passed,
        "total": total,
        "pct": round((passed / total) * 100),
        "ready_for_handoff": passed == total and ws_ok,
    }
