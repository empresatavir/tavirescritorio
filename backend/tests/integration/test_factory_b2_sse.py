"""B2 — SSE hub + generator snapshot / live push."""
import asyncio
import time

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.api.v1.factory import _factory_run_sse_generator
from app.modules.factory.sse_hub import factory_sse_hub, format_sse


def test_format_sse_frame():
    raw = format_sse(
        "stage.changed",
        {"run_id": "r1", "stage_id": "brief", "kind": "current"},
        event_id="e1",
    )
    assert "event: stage.changed\n" in raw
    assert "id: e1\n" in raw
    assert '"stage_id": "brief"' in raw
    assert raw.endswith("\n\n")


@pytest.mark.asyncio
async def test_sse_hub_live_push_on_authorize():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tpl = await client.get("/api/v1/factory/templates/lp-c")
        if tpl.status_code != 200:
            pytest.skip("templates não seeded")

        create = await client.post(
            "/api/v1/projects/",
            json={
                "name": "B2 SSE LP",
                "company": "TAVIR",
                "ownership": "interno",
                "track": "zero",
                "template_category": "lp",
            },
        )
        assert create.status_code == 201, create.text
        proj_id = create.json()["id"]
        run = (await client.get(f"/api/v1/factory/projects/{proj_id}/run")).json()
        run_id = run["id"]

        q = await factory_sse_hub.subscribe(run_id)

        auth = await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/brief/authorize",
            json={"note": "SSE ok"},
        )
        assert auth.status_code == 200, auth.text

        got_events: list[str] = []
        got_stage_kinds: list[str] = []
        deadline = time.monotonic() + 3.0
        while time.monotonic() < deadline and ("event.appended" not in got_events or "stage.changed" not in got_events):
            try:
                frame = await asyncio.wait_for(q.get(), timeout=0.5)
            except asyncio.TimeoutError:
                continue
            name = frame["event"]
            got_events.append(name)
            if name == "stage.changed":
                got_stage_kinds.append(frame["data"].get("kind"))

        await factory_sse_hub.unsubscribe(run_id, q)

        assert "event.appended" in got_events
        assert "stage.changed" in got_events
        assert "done" in got_stage_kinds or "current" in got_stage_kinds


@pytest.mark.asyncio
async def test_sse_generator_snapshot_then_close():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        tpl = await client.get("/api/v1/factory/templates/lp-c")
        if tpl.status_code != 200:
            pytest.skip("templates não seeded")

        create = await client.post(
            "/api/v1/projects/",
            json={
                "name": "B2 Gen Snapshot",
                "company": "TAVIR",
                "ownership": "externo",
                "track": "zero",
                "template_category": "lp",
            },
        )
        assert create.status_code == 201
        proj_id = create.json()["id"]
        await client.post(
            f"/api/v1/factory/projects/{proj_id}/stages/brief/authorize",
            json={},
        )
        run_id = (await client.get(f"/api/v1/factory/projects/{proj_id}/run")).json()["id"]

    gen = _factory_run_sse_generator(run_id)
    frames: list[str] = []
    try:
        for _ in range(40):
            frames.append(await asyncio.wait_for(gen.__anext__(), timeout=2.0))
            joined = "".join(frames)
            if (
                "event: run.snapshot" in joined
                and "event: event.appended" in joined
                and "event: stage.changed" in joined
                and "authorized" in joined
            ):
                break
    finally:
        await gen.aclose()

    text = "".join(frames)
    assert "event: run.snapshot" in text
    assert "event: event.appended" in text
    assert "event: stage.changed" in text
    assert "authorized" in text
