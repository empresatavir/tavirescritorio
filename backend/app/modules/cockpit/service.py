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
        running_jobs_list = [j for j in all_jobs if j.status in ("running", "preflight", "queued")]
        active_statuses = {"to_plan", "planning", "planned", "in_progress", "pending"}
        active_tasks_list = [
            t for t in all_tasks
            if t.status in active_statuses or (t.active_job_id and t.status != "done")
        ]
        pending_approvals_list = [a for a in all_approvals if a.status == "pending"]
        approval_task_ids = {a.task_id for a in pending_approvals_list if a.task_id}
        # Bloqueios / escalados: escalação textual OU aprovação pendente vinculada
        escalated_tasks_list = [
            t for t in all_tasks
            if t.status != "done"
            and (
                (t.escalation and str(t.escalation).strip())
                or t.id in approval_task_ids
            )
        ]
        alteracao_pending = [
            a for a in pending_approvals_list
            if (a.type or "") == "alteracao" or str(a.id).startswith("ap-alt")
        ]
        failed_jobs_list = [j for j in all_jobs if j.status == "failed"]

        # Format running jobs for UI
        running_jobs_ui = []
        for j in running_jobs_list:
            ag = agents.get(j.agent_id) if j.agent_id else None
            linked_task = next((t for t in all_tasks if t.id == j.task_id), None)
            if linked_task:
                job_title = f"Task #{linked_task.seq}: {linked_task.title}" if linked_task.seq else linked_task.title
            else:
                job_title = f"Execução {j.id[:8]}"

            prog = 65 if j.status == "running" else (25 if j.status == "preflight" else 10)
            running_jobs_ui.append({
                "id": j.id,
                "title": job_title,
                "agentName": ag.name if ag else (j.agent_id or "Paula PM"),
                "model": j.model_name or "claude-sonnet-4",
                "progress": prog,
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
            if not linked_job:
                linked_job = next((j for j in all_jobs if j.task_id == t.id), None)

            job_label = "Em andamento"
            job_color = "var(--teal)"
            if linked_job:
                if linked_job.status in ("running", "preflight"):
                    job_label = "Rodando · 65%"
                    job_color = "var(--teal)"
                elif linked_job.status == "succeeded":
                    job_label = "Planejado · 100%"
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
                "assignee": ag.name if ag else "Paula PM",
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
                "icon": "git-pull-request",
                "color": "oklch(0.80 0.155 78)",
                "label": "Alterações pendentes",
                "detail": f"{len(alteracao_pending)} homologações aguardando decisão",
                "count": str(len(alteracao_pending)),
                "path": "/alteracoes",
            },
        ]

        return {
            "kpis": {
                "active_cards_count": len(active_tasks_list),
                "escalated_count": len(escalated_tasks_list),
                "running_jobs_count": len(running_jobs_list),
                "pending_approvals_count": len(pending_approvals_list),
                "pending_changes_count": len(alteracao_pending),
            },
            "summary_text": f"{len(active_tasks_list)} cards ativos · {len(escalated_tasks_list)} escalados · {len(running_jobs_list)} jobs rodando",
            "running_jobs": running_jobs_ui,
            "escalated_tasks": escalated_tasks_ui,
            "active_tasks": active_tasks_ui,
            "needs": needs,
            "badge_counts": {
                "tasks_open": len([t for t in all_tasks if t.status not in ("done",)]),
                "blocks": len(escalated_tasks_list),
                "approvals": len(pending_approvals_list),
                "changes": len(alteracao_pending),
                "jobs_running": len(running_jobs_list),
            },
        }
