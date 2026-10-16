"""Projects API router — read endpoints for projects."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.database import get_session
from app.modules.projects.repository import ProjectRepository
from app.api.v1.schemas import ProjectResponse

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


@router.get("/", response_model=list[ProjectResponse])
async def list_projects(session: AsyncSession = Depends(get_session)):
    repo = ProjectRepository(session)
    projects = await repo.list_all()
    return projects