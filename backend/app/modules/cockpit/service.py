"""Cockpit service — aggregated operational cockpit data for Sala de Operação."""
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any
from app.models.task import Task
from app.models.job import Job
from app.models.approval import Approval
from app.models.agent import Agent


class CockpitService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_summary(self) -> dict[str, Any]:
        # 1. Fetch all agents map for friendly names
        agent_res = await self.session.execute(select(Agent))
        agents = {a.id: a for a in agent_res.scalars().all()}

        # 2. Fetch tasks
        task_res = await self.session.execute(select(Task).order_by(Task.seq.asc().nullslast()))
        all_tasks = list(task_res.scalars().all())

        # 3. Fetch jobs
        job_res = await self.session.execute(select(Job).order_by(Job.created_at.desc()))
        all_jobs = list(job_res.scalars().all())
        jobs_map = {j.id: j for j in all_jobs}

        # 4. Fetch approvals
        appr_res = await self.session.execute(select(Approval).order_by(Approval.created_at.desc()))
        all_approvals = list(appr_res.scalars().all())

        # Calculate KPIs
        running_jobs_list = [j for j in all_jobs if j.status == "running"]
        active_tasks_list = [t for t in all_tasks if t.status == "in_progress" or t.active_job_id]
        escalated_tasks_list = [t for t in all_tasks if t.escalation and t.status != "done"]
        failed_jobs_list = [j for j in all_jobs if j.status == "failed"]
        pending_approvals_list = [a for a in all_approvals if a.status == "pending"]

        # Format running jobs for UI
        running_jobs_ui = []
        for j in running_jobs_list:
            ag = agents.get(j.agent_id) if j.agent_id else None
            running_jobs_ui.append({
                "id": j.id,
                "title": f"Execução {j.id[:8]}",
                "agentName": ag.name if ag else "Agente Operacional",
                "model": j.model_name or "claude-sonnet-4",
                "progress": 65,  # Calculated or default active progress
                "taskId": j.task_id or "",
            })

        # Format escalated tasks for UI
        escalated_tasks_ui = []
        for t in escalated_tasks_list:
            # Check if there is an approval for this task
            task_appr = next((a for a in pending_approvals_list if a.task_id == t.id), None)
            reason = f"aprovação {task_appr.id} pendente" if task_appr else (t.description or "Requer intervenção")
            escalated_tasks_ui.append({
                "seq": f"#{t.seq}" if t.seq else f"#{t.id[:4]}",
                "title": t.title,
                "to": t.escalation or "CEO",
                "reason": reason,
                "action": "Decidir" if task_appr else "Ver falha",
                "actionTarget": "/aprovacoes" if task_appr else "/execucoes",
                "taskId": t.id,
            })

        # Format active tasks for UI
        active_tasks_ui = []
        for t in active_tasks_list:
            ag = agents.get(t.assignee_agent_id) if t.assignee_agent_id else None
            handoff_str = ""
            if t.handoffs:
                handoff_str = t.handoffs if isinstance(t.handoffs, str) else " → ".join(t.handoffs)

            linked_job = jobs_map.get(t.active_job_id) if t.active_job_id else None
            job_label = "Em andamento"
            job_color = "var(--teal)"
            if linked_job:
                if linked_job.status == "running":
                    job_label = "Rodando · 67%"
                    job_color = "var(--teal)"
                elif linked_job.status == "failed":
                    job_label = "Falhou"
                    job_color = "oklch(0.635 0.185 27)"
                elif linked_job.status == "queued":
                    job_label = "Na fila"
                    job_color = "oklch(0.80 0.155 78)"

            active_tasks_ui.append({
                "seq": f"#{t.seq}" if t.seq else f"#{t.id[:4]}",
                "title": t.title,
                "assignee": ag.name if ag else "Agente",
                "handoff": handoff_str or "sem handoff",
                "jobLabel": job_label,
                "jobColor": job_color,
                "taskId": t.id,
            })

        # Needs / Precisa de Você items
        needs = [
            {
                "icon": "shield-check",
                "color": "oklch(0.80 0.155 78)",
                "label": "Aprovações pendentes",
                "detail": f"{len(pending_approvals_list)} autorizações aguardando decisão",
                "count": str(len(pending_approvals_list)),
                "path": "/aprovacoes",
            },
            {
                "icon": "circle-x",
                "color": "oklch(0.635 0.185 27)",
                "label": "Execuções com falha",
                "detail": f"{len(failed_jobs_list)} jobs com erro requerem remediação",
                "count": str(len(failed_jobs_list)),
                "path": "/execucoes",
            },
            {
                "icon": "octagon-alert",
                "color": "oklch(0.635 0.185 27)",
                "label": "Bloqueios",
                "detail": "tarefas com escalação ativa",
                "count": str(len(escalated_tasks_list)),
                "path": "/bloqueios",
            },
            {
                "icon": "file-signature",
                "color": "oklch(0.80 0.155 78)",
                "label": "Propostas pendentes",
                "detail": "propostas comerciais em andamento",
                "count": "2",
                "path": "/propostas",
            },
        ]

        return {
            "kpis": {
                "active_cards_count": len(active_tasks_list),
                "escalated_count": len(escalated_tasks_list),
                "running_jobs_count": len(running_jobs_list),
            },
            "summary_text": f"{len(active_tasks_list)} cards ativos · {len(escalated_tasks_list)} escalados · {len(running_jobs_list)} jobs rodando",
            "running_jobs": running_jobs_ui,
            "escalated_tasks": escalated_tasks_ui,
            "active_tasks": active_tasks_ui,
            "needs": needs,
        }
