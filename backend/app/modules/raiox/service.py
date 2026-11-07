"""Regras do Raio-X: uma prioridade, sustentada por evidência utilizável."""
from __future__ import annotations

import uuid

from app.models.raiox_case import RaioxCase
from app.models.raiox_evidence import RaioxEvidence
from app.modules.raiox.catalog import (
    FRONT_IDS,
    MODES,
    SELL_OFFERS,
    method_pages,
    product_name,
    required_fronts,
)
from app.modules.raiox.repository import RaioxRepository

STAGES = ("encontrar", "conversar", "atender", "vender", "medir")
CLASSIFICATIONS = ("observado", "informado", "inferido", "indisponivel")
ORIGINS = ("amigo", "rua", "formulario")
PACKAGES = ("basico",)
OFFERS = (*SELL_OFFERS, "nenhuma")
DECISIONS = ("proposta_emitida", "nao_emitir")
CONFIDENCE = ("alta", "media", "baixa")


class RaioxError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


def _clean(value: str | None) -> str:
    return (value or "").strip()


def _usable(item: RaioxEvidence) -> bool:
    return item.classification != "indisponivel"


class RaioxService:
    def __init__(self, repo: RaioxRepository):
        self.repo = repo

    async def list_cases(self) -> list[dict]:
        cases = await self.repo.list_cases()
        payload = []
        for case in cases:
            evidence = await self.repo.list_evidence(case.id)
            payload.append(self._summary(case, evidence))
        return payload

    async def get_case(self, case_id: str) -> dict:
        case, evidence = await self._load(case_id)
        return self._detail(case, evidence)

    async def create_case(
        self,
        *,
        company_name: str,
        objective: str,
        decision_needed: str,
        contact_name: str | None = None,
        frontier: str | None = None,
        product_id: str = "diagnostico",
        deep_scan: bool = False,
        physical_store: bool = False,
        origin: str = "amigo",
        segment: str | None = None,
        public_link: str | None = None,
        package_id: str = "basico",
    ) -> dict:
        company = _clean(company_name)
        goal = _clean(objective)
        decision = _clean(decision_needed)
        mode = _clean(product_id) or "diagnostico"
        source = _clean(origin) or "amigo"
        package = _clean(package_id) or "basico"
        if not company:
            raise RaioxError("Informe a empresa.")
        if not goal:
            raise RaioxError("Informe o objetivo comercial.")
        if not decision:
            raise RaioxError("Informe a decisão que o diagnóstico precisa permitir.")
        if mode not in MODES:
            raise RaioxError("Escolha estudo rápido, diagnóstico ou leitura completa.")
        if source not in ORIGINS:
            raise RaioxError("Origem inválida. Use amigo, rua ou formulário.")
        if package not in PACKAGES:
            raise RaioxError("Pacote diferente de básico não abre nesta fase.")
        if deep_scan and mode != "completo":
            raise RaioxError("Deep scan só existe dentro da leitura completa.")
        case = RaioxCase(
            id=str(uuid.uuid4()),
            company_name=company,
            contact_name=_clean(contact_name) or None,
            objective=goal,
            decision_needed=decision,
            frontier=_clean(frontier) or None,
            product_id=mode,
            deep_scan=bool(deep_scan),
            physical_store=bool(physical_store),
            origin=source,
            segment=_clean(segment) or None,
            public_link=_clean(public_link) or None,
            package_id=package,
            status="intake",
        )
        await self.repo.add_case(case)
        await self.repo.session.refresh(case)
        return self._detail(case, [])

    async def update_frontier(
        self,
        case_id: str,
        *,
        company_name: str | None = None,
        contact_name: str | None = None,
        objective: str | None = None,
        decision_needed: str | None = None,
        frontier: str | None = None,
        origin: str | None = None,
        segment: str | None = None,
        public_link: str | None = None,
    ) -> dict:
        case, evidence = await self._load(case_id)
        if company_name is not None:
            company = _clean(company_name)
            if not company:
                raise RaioxError("Informe a empresa.")
            case.company_name = company
        if contact_name is not None:
            case.contact_name = _clean(contact_name) or None
        if objective is not None:
            goal = _clean(objective)
            if not goal:
                raise RaioxError("Informe o objetivo comercial.")
            case.objective = goal
        if decision_needed is not None:
            decision = _clean(decision_needed)
            if not decision:
                raise RaioxError("Informe a decisão que o diagnóstico precisa permitir.")
            case.decision_needed = decision
        if frontier is not None:
            case.frontier = _clean(frontier) or None
        if origin is not None:
            source = _clean(origin)
            if source not in ORIGINS:
                raise RaioxError("Origem inválida. Use amigo, rua ou formulário.")
            case.origin = source
        if segment is not None:
            case.segment = _clean(segment) or None
        if public_link is not None:
            case.public_link = _clean(public_link) or None
        await self.repo.session.flush()
        await self.repo.session.refresh(case)
        return self._detail(case, evidence)

    async def add_evidence(
        self,
        case_id: str,
        *,
        stage: str,
        source: str,
        claim: str,
        classification: str,
        note: str | None = None,
        front: str | None = None,
    ) -> dict:
        case, evidence = await self._load(case_id)
        stage_id = _clean(stage)
        kind = _clean(classification)
        origin = _clean(source)
        statement = _clean(claim)
        if stage_id not in STAGES:
            raise RaioxError("Etapa da jornada inválida.")
        if kind not in CLASSIFICATIONS:
            raise RaioxError("Classificação inválida. Use observado, informado, inferido ou indisponível.")
        if not origin:
            raise RaioxError("Informe a fonte da evidência.")
        if not statement:
            raise RaioxError("Informe o que a evidência mostra.")
        front_id = _clean(front) or None
        if case.deep_scan and not front_id:
            raise RaioxError("No deep scan, marque a frente desta evidência.")
        if front_id and front_id not in FRONT_IDS:
            raise RaioxError("Frente de varredura inválida.")
        item = RaioxEvidence(
            id=str(uuid.uuid4()),
            case_id=case.id,
            stage=stage_id,
            source=origin,
            claim=statement,
            classification=kind,
            front=front_id,
            note=_clean(note) or None,
        )
        await self.repo.add_evidence(item)
        evidence.append(item)
        self._sync(case, evidence)
        await self.repo.session.flush()
        await self.repo.session.refresh(case)
        return self._detail(case, evidence)

    async def remove_evidence(self, case_id: str, evidence_id: str) -> dict:
        case, evidence = await self._load(case_id)
        item = next((row for row in evidence if row.id == evidence_id), None)
        if item is None:
            raise RaioxError("Evidência não encontrada neste diagnóstico.", 404)
        await self.repo.delete_evidence(item)
        evidence = [row for row in evidence if row.id != evidence_id]
        self._sync(case, evidence)
        await self.repo.session.flush()
        await self.repo.session.refresh(case)
        return self._detail(case, evidence)

    async def set_priority(
        self,
        case_id: str,
        *,
        priority_stage: str,
        bottleneck: str,
        priority_rationale: str,
        confidence: str,
        discarded: str | None = None,
    ) -> dict:
        case, evidence = await self._load(case_id)
        stage_id = _clean(priority_stage)
        gap = _clean(bottleneck)
        why = _clean(priority_rationale)
        level = _clean(confidence)
        if stage_id not in STAGES:
            raise RaioxError("Escolha a etapa do gargalo.")
        if not gap:
            raise RaioxError("Descreva o gargalo prioritário.")
        if not why:
            raise RaioxError("Registre por que esta prioridade vem primeiro.")
        if level not in CONFIDENCE:
            raise RaioxError("Informe o nível de confiança: alta, média ou baixa.")
        usable = [
            row for row in evidence if row.stage == stage_id and _usable(row)
        ]
        if not usable:
            raise RaioxError(
                "A prioridade precisa de uma evidência utilizável na etapa escolhida. "
                "Fonte indisponível não sustenta o gargalo."
            )
        case.priority_stage = stage_id
        case.bottleneck = gap
        case.priority_rationale = why
        case.confidence = level
        case.discarded = _clean(discarded) or None
        self._clear_debrief(case)
        self._sync(case, evidence)
        await self.repo.session.flush()
        await self.repo.session.refresh(case)
        return self._detail(case, evidence)

    async def set_debrief(
        self,
        case_id: str,
        *,
        decision: str,
        reason: str,
        next_offer: str | None = None,
        plan_30: str | None = None,
        plan_60: str | None = None,
        plan_90: str | None = None,
    ) -> dict:
        case, evidence = await self._load(case_id)
        choice = _clean(decision)
        why = _clean(reason)
        if choice not in DECISIONS:
            raise RaioxError("A devolutiva é proposta emitida ou não emitir.")
        if not why:
            raise RaioxError("Registre o motivo da devolutiva.")
        if not case.bottleneck or not case.priority_stage:
            raise RaioxError("Feche a prioridade antes da devolutiva.")
        if choice == "proposta_emitida":
            offer = _clean(next_offer)
            first_step = _clean(plan_30)
            if offer not in SELL_OFFERS:
                raise RaioxError("Escolha uma oferta seguinte. O Raio-X não vende tudo de uma vez.")
            if not first_step:
                raise RaioxError("Registre o próximo passo dos próximos 30 dias.")
            missing = self._missing_fronts(case, evidence)
            if missing:
                names = ", ".join(item["label"] for item in missing)
                raise RaioxError(f"O deep scan ainda não cobriu: {names}.")
            case.next_offer = offer
            case.plan_30 = first_step
            case.plan_60 = _clean(plan_60) or None
            case.plan_90 = _clean(plan_90) or None
        else:
            case.next_offer = "nenhuma"
            case.plan_30 = None
            case.plan_60 = None
            case.plan_90 = None
        case.debrief_decision = choice
        case.debrief_reason = why
        self._sync(case, evidence)
        await self.repo.session.flush()
        await self.repo.session.refresh(case)
        return self._detail(case, evidence)

    async def close_case(self, case_id: str) -> dict:
        case, evidence = await self._load(case_id)
        if not case.debrief_decision:
            raise RaioxError("Encerre só depois da devolutiva.")
        case.status = "fechado"
        await self.repo.session.flush()
        await self.repo.session.refresh(case)
        return self._detail(case, evidence)

    async def _load(self, case_id: str) -> tuple[RaioxCase, list[RaioxEvidence]]:
        case = await self.repo.get_case(case_id)
        if case is None:
            raise RaioxError("Diagnóstico não encontrado.", 404)
        evidence = await self.repo.list_evidence(case_id)
        return case, evidence

    def _sync(self, case: RaioxCase, evidence: list[RaioxEvidence]) -> None:
        if case.priority_stage and not any(
            row.stage == case.priority_stage and _usable(row) for row in evidence
        ):
            case.priority_stage = None
            case.bottleneck = None
            case.priority_rationale = None
            case.confidence = None
            case.discarded = None
            self._clear_debrief(case)
        if case.status == "fechado" and case.debrief_decision:
            return
        usable_stages = {row.stage for row in evidence if _usable(row)}
        if case.debrief_decision:
            case.status = "devolutiva"
        elif case.bottleneck and case.priority_stage:
            case.status = "prioridade"
        elif len(usable_stages) >= 2:
            case.status = "mapa"
        elif evidence:
            case.status = "coleta"
        else:
            case.status = "intake"

    def _clear_debrief(self, case: RaioxCase) -> None:
        case.debrief_decision = None
        case.debrief_reason = None
        case.next_offer = None
        case.plan_30 = None
        case.plan_60 = None
        case.plan_90 = None

    def _summary(self, case: RaioxCase, evidence: list[RaioxEvidence]) -> dict:
        return {
            "id": case.id,
            "company_name": case.company_name,
            "contact_name": case.contact_name,
            "objective": case.objective,
            "product_id": case.product_id,
            "product_name": product_name(case.product_id),
            "deep_scan": bool(case.deep_scan),
            "physical_store": bool(case.physical_store),
            "origin": case.origin,
            "segment": case.segment,
            "public_link": case.public_link,
            "package_id": case.package_id,
            "status": case.status,
            "bottleneck": case.bottleneck,
            "priority_stage": case.priority_stage,
            "next_offer": case.next_offer,
            "debrief_decision": case.debrief_decision,
            "evidence_count": len(evidence),
            "updated_at": case.updated_at,
        }

    def _detail(self, case: RaioxCase, evidence: list[RaioxEvidence]) -> dict:
        journey = []
        for stage in STAGES:
            rows = [row for row in evidence if row.stage == stage]
            journey.append(
                {
                    "stage": stage,
                    "count": len(rows),
                    "usable": sum(1 for row in rows if _usable(row)),
                }
            )
        usable_on_priority = any(
            row.stage == case.priority_stage and _usable(row) for row in evidence
        ) if case.priority_stage else False
        return {
            **self._summary(case, evidence),
            "decision_needed": case.decision_needed,
            "frontier": case.frontier,
            "priority_rationale": case.priority_rationale,
            "discarded": case.discarded,
            "confidence": case.confidence,
            "debrief_reason": case.debrief_reason,
            "plan_30": case.plan_30,
            "plan_60": case.plan_60,
            "plan_90": case.plan_90,
            "created_at": case.created_at,
            "evidence": [
                {
                    "id": row.id,
                    "stage": row.stage,
                    "source": row.source,
                    "claim": row.claim,
                    "classification": row.classification,
                    "front": row.front,
                    "note": row.note,
                    "created_at": row.created_at,
                }
                for row in evidence
            ],
            "journey": journey,
            "readiness": {
                "has_usable_evidence": any(_usable(row) for row in evidence),
                "priority_ready": bool(case.bottleneck and case.priority_stage and usable_on_priority),
                "debrief_ready": bool(case.debrief_decision),
            },
            "scan": self._scan(case, evidence),
            "method_pages": method_pages(case.product_id, bool(case.deep_scan)),
        }

    def _scan(self, case: RaioxCase, evidence: list[RaioxEvidence]) -> list[dict]:
        covered = {row.front for row in evidence if row.front and _usable(row)}
        return [
            {"id": item["id"], "label": item["label"], "covered": item["id"] in covered}
            for item in required_fronts(bool(case.deep_scan), bool(case.physical_store))
        ]

    def _missing_fronts(self, case: RaioxCase, evidence: list[RaioxEvidence]) -> list[dict]:
        return [item for item in self._scan(case, evidence) if not item["covered"]]
