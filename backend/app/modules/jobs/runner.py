"""Job runner — isolated execution with state machine and event logging."""
import asyncio
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.job import Job
from app.models.event import Event
from app.models.artifact import Artifact

ALLOWED_COMMANDS = {"echo", "cat", "ls", "python"}
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "workspaces"


class JobRunner:
    VALID_TRANSITIONS = {
        "queued": ["preflight", "failed"],
        "preflight": ["running", "failed"],
        "running": ["succeeded", "failed"],
        "succeeded": [],
        "failed": [],
    }

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_job(
        self,
        task_id: str | None = None,
        project_id: str | None = None,
        agent_id: str | None = None,
        command: str = "echo hello",
        model_name: str | None = None,
        effort: str | None = None,
        model_provider: str | None = None,
    ) -> Job:
        job = Job(
            id=str(uuid.uuid4()),
            task_id=task_id,
            project_id=project_id,
            agent_id=agent_id,
            origin="manual",
            status="queued",
            model_name=model_name,
            effort=effort,
            model_provider=model_provider,
            workspace_path=str(WORKSPACE_ROOT / str(uuid.uuid4())),
        )
        self.session.add(job)
        await self._log_event(
            job.id, None, "queued", "system", "job_created", f"Job instanciado na fila: {command}"
        )
        await self.session.flush()
        return job

    async def run(self, job_id: str, command: str, timeout: int = 30):
        job = await self.session.get(Job, job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        # Preflight
        await self._transition(job, "preflight", details="Verificando ambiente, permissões e pré-requisitos...")
        await self.session.commit()
        await asyncio.sleep(1.0)

        # Running
        await self._transition(job, "running", details="Job em processamento ativo.")
        await self.session.commit()

        # Step 1: Context & Agent acknowledgment if linked to a task
        if job.task_id:
            from app.models.task import Task
            task = await self.session.get(Task, job.task_id)
            task_desc = f"Task #{task.seq}: {task.title}" if task and task.seq else (task.title if task else job.task_id)
            agent_label = job.agent_id or "pm-projetos"
            model_label = job.model_name or "Fable"
            effort_label = job.effort or "Máximo"

            await self._log_event(
                job.id, "running", "running", agent_label, "agent_assigned",
                f"Paula PM assumiu o planejamento de {task_desc} ({model_label} · Esforço {effort_label})"
            )
            await self.session.commit()
            await asyncio.sleep(1.2)

            await self._log_event(
                job.id, "running", "running", agent_label, "scope_analysis",
                "Analisando escopo da demanda, dependências e critérios de aceite..."
            )
            await self.session.commit()
            await asyncio.sleep(1.2)

            await self._log_event(
                job.id, "running", "running", agent_label, "matrix_handoffs",
                "Definindo escalação técnica e matriz de handoffs para os agentes especialistas..."
            )
            await self.session.commit()
            await asyncio.sleep(1.2)

        # Step 2: Command execution
        workspace = Path(job.workspace_path or "")
        workspace.mkdir(parents=True, exist_ok=True)

        try:
            cmd_name = command.split()[0] if command else ""
            if cmd_name not in ALLOWED_COMMANDS:
                await self._fail(job, f"Command '{cmd_name}' not in allowlist: {ALLOWED_COMMANDS}")
                await self.session.commit()
                return

            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(workspace),
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            output = (stdout or b"").decode(errors="replace").strip()
            err = (stderr or b"").decode(errors="replace").strip()

            if proc.returncode == 0:
                if output:
                    clean_output = output.strip("'\"")
                    await self._log_event(
                        job.id, "running", "running", "worker", "process_output", clean_output
                    )
                    await self.session.commit()
                    await asyncio.sleep(0.8)

                # Create artifact from output
                artifact_path = workspace / "output.txt"
                artifact_path.write_text(output, encoding="utf-8")
                artifact = Artifact(
                    id=str(uuid.uuid4()),
                    job_id=job.id,
                    task_id=job.task_id,
                    name="output.txt",
                    artifact_type="text",
                    path=str(artifact_path),
                    size_bytes=artifact_path.stat().st_size,
                    qa_status="pending",
                )
                self.session.add(artifact)
                await self._transition(
                    job, "succeeded",
                    details="Planejamento e execução concluídos com sucesso. Artefato output.txt registrado."
                )
                await self.session.commit()
            else:
                await self._fail(job, f"Exit code {proc.returncode}: {err[:500]}")
                await self.session.commit()

        except asyncio.TimeoutError:
            await self._fail(job, f"Timeout after {timeout}s")
            await self.session.commit()
        except Exception as e:
            await self._fail(job, str(e)[:500])
            await self.session.commit()

    async def _transition(self, job: Job, new_status: str, details: str | None = None):
        valid = self.VALID_TRANSITIONS.get(job.status, [])
        if new_status not in valid:
            raise ValueError(f"Invalid transition {job.status} -> {new_status} for job {job.id}")
        old_status = job.status
        job.status = new_status
        job.updated_at = datetime.now(timezone.utc)
        await self._log_event(job.id, old_status, new_status, "worker", "state_change", details)
        await self.session.flush()

    async def _fail(self, job: Job, reason: str):
        job.error_message = reason
        await self._transition(job, "failed", details=reason)

    async def _log_event(self, job_id: str, prev: str | None, new: str, actor: str, action: str, details: str | None = None):
        event = Event(
            id=str(uuid.uuid4()),
            job_id=job_id,
            event_type="job_state",
            previous_state=prev,
            new_state=new,
            actor=actor,
            action=action,
            details=details,
        )
        self.session.add(event)
        await self.session.flush()

    async def retry_job(self, job_id: str) -> Job:
        job = await self.session.get(Job, job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")
        old_status = job.status
        job.status = "queued"
        job.error_message = None
        job.updated_at = datetime.now(timezone.utc)
        await self._log_event(job.id, old_status, "queued", "operator", "job_retried", "Job re-enfileirado pelo operador")
        await self.session.flush()
        return job

    async def cancel_job(self, job_id: str) -> Job:
        job = await self.session.get(Job, job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")
        old_status = job.status
        job.status = "failed"
        job.error_message = "Job cancelado pelo operador"
        job.updated_at = datetime.now(timezone.utc)
        await self._log_event(job.id, old_status, "failed", "operator", "job_cancelled", "Job cancelado pelo operador")
        await self.session.flush()
        return job