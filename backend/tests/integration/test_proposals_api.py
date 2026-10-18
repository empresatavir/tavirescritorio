"""Integration tests for Commercial Proposals REST API."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_proposals_api_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List proposals (seeded 6 real proposals)
        resp = await client.get("/api/v1/proposals")
        assert resp.status_code == 200
        proposals = resp.json()
        assert len(proposals) >= 6

        clients = {p["client"] for p in proposals}
        assert "Atlas Holdings" in clients
        assert "Meridian Capital" in clients
        assert "Cobalt Group" in clients

        # 2. Get specific proposal
        p1_resp = await client.get("/api/v1/proposals/prop-01")
        assert p1_resp.status_code == 200
        p1 = p1_resp.json()
        assert p1["num"] == "PRO-001"
        assert p1["client"] == "Atlas Holdings"
        assert p1["value"] == 48500
        assert len(p1["items"]) == 3

        # 3. Request a change (simulate client or operator asking Arquiteto for scope change)
        chg_resp = await client.post(
            "/api/v1/proposals/prop-01/change",
            json={
                "target": "Prazos",
                "agent": "Arquiteto",
                "text": "Reduzir o prazo de entrega para 7 semanas.",
            },
        )
        assert chg_resp.status_code == 200
        updated_p1 = chg_resp.json()
        assert any(c["text"] == "Reduzir o prazo de entrega para 7 semanas." for c in updated_p1["changes"])

        # 4. Create new proposal
        create_resp = await client.post(
            "/api/v1/proposals",
            json={
                "client": "Acme Ventures",
                "summary": "Implementação de ecossistema de dados com painel em tempo real",
                "scope": "Pipelines de ETL, banco de dados analítico e dashboard executivo",
                "value": 38000,
                "deadline": "6 semanas",
                "validity": "30 dias",
                "items": [
                    {"desc": "Modelagem e pipelines ETL", "value": 20000},
                    {"desc": "Dashboard analítico executivo", "value": 18000},
                ],
            },
        )
        assert create_resp.status_code == 201
        new_prop = create_resp.json()
        assert new_prop["client"] == "Acme Ventures"
        assert new_prop["num"].startswith("PRO-")
        new_id = new_prop["id"]

        # 5. Send proposal (generates trackable link)
        send_resp = await client.post(
            f"/api/v1/proposals/{new_id}/send",
            json={"sent_to": "diretoria@acmeventures.com.br"},
        )
        assert send_resp.status_code == 200
        sent_prop = send_resp.json()
        assert sent_prop["stage"] == "pending"
        assert sent_prop["send_info"] is not None
        assert sent_prop["send_info"]["sentTo"] == "diretoria@acmeventures.com.br"
        assert "link" in sent_prop["send_info"]

        # 6. Accept proposal (electronic sign)
        accept_resp = await client.post(
            f"/api/v1/proposals/{new_id}/accept",
            json={"signer_name": "Roberto Dias", "accepted": True},
        )
        assert accept_resp.status_code == 200
        accepted_prop = accept_resp.json()
        assert accepted_prop["stage"] == "done"
        assert accepted_prop["status"] == "Aceita e contra-assinada"
        assert accepted_prop["send_info"]["accept"][0] == "signed"
        assert accepted_prop["send_info"]["accept"][1] == "Roberto Dias"
