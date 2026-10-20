from typing import Any
from pydantic import BaseModel
from datetime import datetime


class AgentResponse(BaseModel):
    id: str
    name: str
    role: str
    sector: str
    status: str
    skills: str | None = None
    model_provider: str | None = None
    soul_text: str | None = None
    total_jobs: int = 0
    total_cost: float = 0.0
    avatar_color: str | None = None
    initials: str | None = None
    last_run: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "protected_namespaces": ()}


class ProjectResponse(BaseModel):
    id: str
    slug: str
    name: str
    client: str | None = None
    company: str | None = None
    template_code: str | None = None
    stages_done: int = 0
    total_stages: int = 0
    repo_url: str | None = None
    local_path: str | None = None
    deploy_target: str | None = None
    stack: str | None = None
    files: Any = None
    status: str
    description: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}