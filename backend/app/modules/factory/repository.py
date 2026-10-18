"""EngineeringTemplate & Factory repository — async CRUD for factory templates and projects."""
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.template import EngineeringTemplate
from app.models.project import Project


class TemplateRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_all(self) -> list[EngineeringTemplate]:
        result = await self.session.execute(
            select(EngineeringTemplate).order_by(EngineeringTemplate.sort_order)
        )
        return list(result.scalars().all())

    async def get_by_id(self, template_id: str) -> EngineeringTemplate | None:
        return await self.session.get(EngineeringTemplate, template_id)

    async def get_by_code(self, code: str) -> EngineeringTemplate | None:
        res = await self.session.execute(
            select(EngineeringTemplate).where(EngineeringTemplate.id == code)
        )
        tpl = res.scalars().first()
        if tpl:
            return tpl
        # try category + '-' + mode (e.g. lp-c)
        parts = code.split("-")
        if len(parts) == 2:
            res = await self.session.execute(
                select(EngineeringTemplate).where(
                    EngineeringTemplate.category == parts[0],
                    EngineeringTemplate.mode == parts[1]
                )
            )
            return res.scalars().first()
        return None

    async def create(self, template: EngineeringTemplate) -> EngineeringTemplate:
        self.session.add(template)
        await self.session.flush()
        return template

    # --- Factory Projects ---

    async def list_factory_projects(self) -> list[Project]:
        result = await self.session.execute(
            select(Project).where(Project.template_code.isnot(None)).order_by(Project.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_factory_project(self, project_id: str) -> Project | None:
        return await self.session.get(Project, project_id)

    async def create_factory_project(self, project: Project) -> Project:
        self.session.add(project)
        await self.session.flush()
        return project

    async def update_project_stage(self, project_id: str, stages_done: int) -> Project | None:
        project = await self.session.get(Project, project_id)
        if not project:
            return None
        project.stages_done = stages_done
        if stages_done >= project.total_stages and project.total_stages > 0:
            project.status = "done"
        cur_log = list(project.event_log) if project.event_log else []
        cur_log.append([
            datetime.now().strftime("%d/%m %H:%M"),
            "Operação",
            f"Estágio atualizado para {stages_done}/{project.total_stages}"
        ])
        project.event_log = cur_log
        return project

    async def resolve_project_pendency(self, project_id: str, pendency_id: str, note: str | None = None) -> Project | None:
        project = await self.session.get(Project, project_id)
        if not project:
            return None
        pends = list(project.pendencies) if project.pendencies else []
        resolved_title = pendency_id
        new_pends = []
        for p in pends:
            if p.get("id") == pendency_id:
                resolved_title = p.get("title", pendency_id)
            else:
                new_pends.append(p)
        project.pendencies = new_pends

        cur_log = list(project.event_log) if project.event_log else []
        cur_log.append([
            datetime.now().strftime("%d/%m %H:%M"),
            "CEO",
            f"Pendência resolvida: {resolved_title}{f' ({note})' if note else ''}"
        ])
        project.event_log = cur_log

        # Se não há mais pendências, retoma status para running
        if len(new_pends) == 0 and project.status == "paused":
            project.status = "running"
        return project