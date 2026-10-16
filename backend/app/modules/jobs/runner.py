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

    async def create_job(self, task_id: str | None = None, project_id: str | None = None,
                         agent_id: str | None = None, command: str = "echo hello") -> Job:
        job = Job(
            id=str(uuid.uuid4()),
            task_id=task_id,
            project_id=project_id,
            agent_id=agent_id,
            origin="manual",
            status="queued",
            workspace_path=str(WORKSPACE_ROOT / str(uuid.uuid4())),
        )
        self.session.add(job)
        await self._log_event(job.id, None, "queued", "system", "job_created", f"Command: {command}")
        await self.session.flush()
        return job

    async def run(self, job_id: str, command: str, timeout: int = 30):
        job = await self.session.get(Job, job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        # Preflight
        await self._transition(job, "preflight")
        cmd_name = command.split()[0] if command else ""
        if cmd_name not in ALLOWED_COMMANDS:
            await self._fail(job, f"Command '{cmd_name}' not in allowlist: {ALLOWED_COMMANDS}")
            return

        # Running
        await self._transition(job, "running")
        workspace = Path(job.workspace_path or "")
        workspace.mkdir(parents=True, exist_ok=True)

        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(workspace),
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            output = (stdout or b"").decode(errors="replace")
            err = (stderr or b"").decode(errors="replace")

            if proc.returncode == 0:
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
                await self._transition(job, "succeeded", details=f"Exit code 0, {len(output)} bytes output")
            else:
                await self._fail(job, f"Exit code {proc.returncode}: {err[:500]}")

        except asyncio.TimeoutError:
            await self._fail(job, f"Timeout after {timeout}s")
        except Exception as e:
            await self._fail(job, str(e)[:500])

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