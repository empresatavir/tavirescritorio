"""Números do funil comercial a partir de casos e propostas gravados."""
from datetime import datetime

from app.models.proposal import Proposal
from app.models.raiox_case import RaioxCase

LIVE_STAGES = {"progress", "pending"}
SENT_STAGES = {"pending", "done"}


def money_label(value: float) -> str:
    amount = float(value or 0)
    if amount >= 1000:
        text = f"{amount / 1000:.1f}".replace(".", ",")
        return f"R$ {text} mil"
    return f"R$ {int(round(amount))}"


def _moment(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    text = str(value).replace("T", " ").replace("Z", "")
    for size, fmt in ((26, "%Y-%m-%d %H:%M:%S.%f"), (19, "%Y-%m-%d %H:%M:%S"), (10, "%Y-%m-%d")):
        try:
            return datetime.strptime(text[:size], fmt)
        except ValueError:
            continue
    return None


def summarize(cases: list[RaioxCase], proposals: list[Proposal]) -> dict:
    live = [row for row in proposals if row.stage in LIVE_STAGES and (row.tone or "") != "lost"]
    signed = [row for row in proposals if row.stage == "done"]
    sent = [row for row in proposals if row.stage in SENT_STAGES and row.value is not None]
    open_value = sum(float(row.value or 0) for row in live)
    ticket = sum(float(row.value or 0) for row in sent) / len(sent) if sent else 0
    conversion = round(100 * len(signed) / len(cases)) if cases else 0

    by_id = {row.id: row for row in cases}
    spans: list[float] = []
    for row in signed:
        case = by_id.get(row.raiox_case_id or "")
        if case is None:
            continue
        start = _moment(case.created_at)
        end = _moment(row.updated_at)
        if start is None or end is None:
            continue
        spans.append((end - start).total_seconds() / 86400)
    cycle = round(sum(spans) / len(spans)) if spans else 0

    accepted = [
        row
        for row in proposals
        if row.stage == "done" or "aceit" in (row.status or "").lower()
    ]
    stages = [
        {"key": "Casos abertos", "count": len(cases)},
        {"key": "Devolutiva", "count": sum(1 for row in cases if row.debrief_decision)},
        {"key": "Proposta enviada", "count": len(sent)},
        {"key": "Aceita", "count": len(accepted)},
        {"key": "Assinada", "count": len(signed)},
    ]
    return {
        "open_value": open_value,
        "open_count": len(live),
        "open_label": money_label(open_value),
        "open_note": f"{len(live)} propostas vivas",
        "conversion_pct": conversion,
        "conversion_label": f"{conversion}%",
        "cycle_days": cycle,
        "cycle_label": f"{cycle} d",
        "ticket": ticket,
        "ticket_label": money_label(ticket),
        "stages": stages,
        "deals": [
            {
                "id": row.id,
                "client": row.client,
                "stage": row.stage,
                "status": row.status,
                "value_label": money_label(float(row.value or 0)),
            }
            for row in live
        ],
    }
