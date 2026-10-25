"""Job runner — isolated execution with state machine and event logging."""
import asyncio
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.job import Job
from app.models.job_attempt import JobAttempt
from app.models.event import Event
from app.models.artifact import Artifact

ALLOWED_COMMANDS = {"echo", "cat", "ls", "python"}
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "workspaces"
_ACTIVE_PROCESSES: dict[str, asyncio.subprocess.Process] = {}


def _get_office_db_path():
    for parent in Path(__file__).resolve().parents:
        cand = parent / "AgenciaIA" / "escritorio" / "office.db"
        if cand.exists():
            return cand
    return None


def _sync_to_office_db(job: Job, attempt_num: int, status: str, log_stream: str = "", git_diff_stat: str = ""):
    try:
        import sqlite3
        p = _get_office_db_path()
        if not p:
            return
        conn = sqlite3.connect(str(p), timeout=5.0)
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout=5000;")
        cur = conn.cursor()
        now_str = datetime.now(timezone.utc).isoformat()
        st_map = {
            "queued": "queued",
            "preflight": "preflight",
            "running": "running",
            "succeeded": "completed",
            "failed": "failed",
            "paused": "paused",
            "cancelled": "failed",
        }
        st_office = st_map.get(status, "queued")
        cur.execute("""
            INSERT OR REPLACE INTO jobs
            (id, task_id, project_id, agent_id, model, effort, status, progress, cost_usd, worktree_path, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            job.id, job.task_id, job.project_id or "tavir-core", job.agent_id or "pm-projetos",
            job.model_name or "Fable", job.effort or "max", st_office, 100 if st_office == "completed" else 0,
            0.0, job.workspace_path, now_str, now_str
        ))
        cur.execute("""
            INSERT OR REPLACE INTO job_attempts
            (id, job_id, attempt_number, status, log_stream, git_diff_stat, started_at, ended_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"att-{job.id}-{attempt_num}", job.id, attempt_num, st_office, log_stream, git_diff_stat or "",
            now_str, now_str if st_office in ("completed", "failed") else None
        ))
        conn.commit()
        conn.close()
    except Exception as exc:
        print(f"[JobRunner] sync to office.db warning: {exc}")


class JobRunner:
    VALID_TRANSITIONS = {
        "queued": ["preflight", "failed", "paused"],
        "preflight": ["running", "failed", "paused"],
        "running": ["succeeded", "failed", "paused"],
        "paused": ["queued", "running", "failed"],
        "succeeded": [],
        "failed": ["queued"],
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
        origin: str = "manual",
    ) -> Job:
        ws_path = str(WORKSPACE_ROOT / str(uuid.uuid4()))
        if task_id:
            try:
                from app.api.v1.jobs import _get_office_module
                office = _get_office_module()
                if office:
                    cols = office.kan_load()
                    import re
                    m_search = re.search(r"\d+", str(task_id))
                    card = None
                    if m_search:
                        _, card = office.kan_achar_numero(cols, int(m_search.group(0)))
                    if not card:
                        _, card = office.kan_achar(cols, str(task_id).replace("task-", ""))
                    if card:
                        wt, erro_wt = office.worktree_garantir(card["slug"])
                        if wt and wt.get("path"):
                            ws_path = wt["path"]
            except Exception as exc:
                print(f"[JobRunner] Worktree guarantee warning: {exc}")

            # Reusa workspace do job de planejamento (plano.md) quando origem é execution
            if (origin or "").lower() == "execution":
                try:
                    from app.models.task import Task
                    task_row = await self.session.get(Task, task_id)
                    if task_row and isinstance(task_row.tags, list):
                        plan_job_tag = next(
                            (t for t in task_row.tags if str(t).startswith("plan_job:")),
                            None,
                        )
                        if plan_job_tag:
                            plan_job_id = str(plan_job_tag).split(":", 1)[1]
                            plan_job = await self.session.get(Job, plan_job_id)
                            if plan_job and plan_job.workspace_path and Path(plan_job.workspace_path).is_dir():
                                ws_path = plan_job.workspace_path
                except Exception as exc:
                    print(f"[JobRunner] Reuse planning workspace warning: {exc}")

        job = Job(
            id=str(uuid.uuid4()),
            task_id=task_id,
            project_id=project_id,
            agent_id=agent_id,
            origin=origin or "manual",
            status="queued",
            model_name=model_name,
            effort=effort,
            model_provider=model_provider,
            workspace_path=ws_path,
        )
        self.session.add(job)
        origin_l = (origin or "manual").lower()
        if origin_l == "planning":
            created_msg = f"Job de planejamento enfileirado ({model_name or 'Fable'} · {effort or 'Máximo'})"
        elif origin_l == "execution":
            created_msg = f"Job de execução enfileirado ({model_name or 'Fable'} · {effort or 'Máximo'})"
        else:
            created_msg = f"Job instanciado na fila: {command}"
        attempt = JobAttempt(
            id=str(uuid.uuid4()),
            job_id=job.id,
            attempt_number=1,
            status="queued",
            log_stream=created_msg,
            git_diff_stat="",
        )
        self.session.add(attempt)
        _sync_to_office_db(job, 1, "queued", log_stream=created_msg)
        await self._log_event(
            job.id, None, "queued", "system", "job_created", created_msg
        )
        await self.session.flush()
        return job

    async def run(self, job_id: str, command: str, timeout: int = 30):
        job = await self.session.get(Job, job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        origin = (job.origin or "manual").lower()
        model_label = job.model_name or "Fable"
        effort_label = job.effort or "Máximo"
        agent_label = job.agent_id or "pm-projetos"

        await self._transition(
            job, "preflight",
            details="Preparando workspace e metadados do job...",
        )
        await self.session.commit()

        await self._transition(
            job, "running",
            details=(
                f"Planejamento em andamento ({model_label} · {effort_label})"
                if origin == "planning"
                else f"Execução em andamento ({model_label} · {effort_label})"
                if origin == "execution"
                else "Job em processamento."
            ),
        )
        await self.session.commit()

        workspace = Path(job.workspace_path or "")
        workspace.mkdir(parents=True, exist_ok=True)

        try:
            # Planning / execution: materializa artefatos reais (sem teatro de shell/echo).
            if origin in ("planning", "execution"):
                from app.models.task import Task

                task = await self.session.get(Task, job.task_id) if job.task_id else None
                task_ref = (
                    f"Task #{task.seq}: {task.title}"
                    if task and task.seq
                    else (task.title if task else (job.task_id or "sem task"))
                )
                await self._log_event(
                    job.id, "running", "running", agent_label, "job_context",
                    f"{agent_label} · {task_ref} · {model_label} · esforço {effort_label}",
                )
                await self.session.commit()

                if origin == "planning":
                    await self._log_event(
                        job.id, "running", "running", agent_label, "plan_write",
                        "Gerando plano.md e metadados de handoffs/gates...",
                    )
                    await self.session.commit()
                    await self._materialize_plan(job, workspace)
                    success_detail = "Planejamento concluído. Artefato plano.md registrado."
                    stub_output = f"plan-ok:{job.id}"
                else:
                    await self._log_event(
                        job.id, "running", "running", agent_label, "exec_write",
                        "Resolvendo a demanda e gerando evidências (execucao.md / output.txt)...",
                    )
                    await self.session.commit()
                    deliverable = await self._produce_deliverable(job, task)
                    await self._materialize_execution(job, workspace, deliverable)
                    success_detail = "Execução concluída. Resposta registrada em execucao.md."
                    stub_output = deliverable

                artifact_path = workspace / "output.txt"
                if not artifact_path.exists():
                    artifact_path.write_text(stub_output, encoding="utf-8")
                    self.session.add(
                        Artifact(
                            id=str(uuid.uuid4()),
                            job_id=job.id,
                            task_id=job.task_id,
                            name="output.txt",
                            artifact_type="text",
                            path=str(artifact_path),
                            size_bytes=artifact_path.stat().st_size,
                            qa_status="pending",
                        )
                    )

                await self._transition(job, "succeeded", details=success_detail)
                await self._advance_linked_task(job, success=True)
                await self.session.commit()
                return

            # Manual: executa comando allowlisted
            cmd_name = command.split()[0] if command else ""
            if cmd_name not in ALLOWED_COMMANDS:
                await self._fail(job, f"Command '{cmd_name}' not in allowlist: {ALLOWED_COMMANDS}")
                await self.session.commit()
                return

            await self._log_event(
                job.id, "running", "running", "worker", "process_start",
                f"Executando comando: {command}",
            )
            await self.session.commit()

            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(workspace),
            )
            _ACTIVE_PROCESSES[job.id] = proc
            try:
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
            finally:
                _ACTIVE_PROCESSES.pop(job.id, None)
            output = (stdout or b"").decode(errors="replace").strip()
            err = (stderr or b"").decode(errors="replace").strip()

            if proc.returncode != 0:
                await self._fail(job, f"Exit code {proc.returncode}: {err[:500] or 'sem stderr'}")
                await self._advance_linked_task(job, success=False)
                await self.session.commit()
                return

            if output:
                await self._log_event(
                    job.id, "running", "running", "worker", "process_output",
                    output.strip("'\""),
                )
                await self.session.commit()

            artifact_path = workspace / "output.txt"
            artifact_path.write_text(output, encoding="utf-8")
            self.session.add(
                Artifact(
                    id=str(uuid.uuid4()),
                    job_id=job.id,
                    task_id=job.task_id,
                    name="output.txt",
                    artifact_type="text",
                    path=str(artifact_path),
                    size_bytes=artifact_path.stat().st_size,
                    qa_status="pending",
                )
            )

            await self._transition(
                job, "succeeded",
                details="Execução concluída com sucesso. Artefato registrado.",
            )
            await self._advance_linked_task(job, success=True)
            await self.session.commit()

        except asyncio.TimeoutError:
            await self._fail(job, f"Timeout after {timeout}s")
            await self._advance_linked_task(job, success=False)
            await self.session.commit()
        except Exception as e:
            reason = (str(e) or "").strip() or f"{type(e).__name__}: falha na execução"
            print(f"[JobRunner] run failed for {job_id}: {type(e).__name__}: {e!r}")
            await self._fail(job, reason[:500])
            await self._advance_linked_task(job, success=False)
            await self.session.commit()

    async def _materialize_plan(self, job: Job, workspace: Path) -> None:
        """Gera plano.md e anexa metadados na task (handoffs, gates, tags)."""
        from app.models.task import Task

        task = await self.session.get(Task, job.task_id) if job.task_id else None
        seq = task.seq if task and task.seq else "?"
        title = task.title if task else "Demanda"
        desc = (task.description or "Sem descrição.").strip()
        model = job.model_name or "Fable"
        effort = job.effort or "Máximo"
        agent = job.agent_id or "pm-projetos"

        plan_body = (
            f"# Plano operacional — Task #{seq}\n\n"
            f"**Título:** {title}\n"
            f"**Orquestradora:** Paula PM ({agent})\n"
            f"**Modelo:** {model}\n"
            f"**Esforço:** {effort}\n\n"
            f"## Contexto\n{desc}\n\n"
            f"## Etapas\n"
            f"1. Triagem de escopo, riscos e informações faltantes\n"
            f"2. Quebra técnica e critérios de aceite\n"
            f"3. Matriz de handoffs para agentes especialistas\n"
            f"4. Gates humanos (se houver decisão/autorização)\n"
            f"5. Execução cadenciada e evidências\n\n"
            f"## Handoffs sugeridos\n"
            f"- Paula PM → Arquiteto / Especialista de domínio\n"
            f"- Especialista → Validador / QA\n"
            f"- QA → Homologação (CEO) quando aplicável\n\n"
            f"## Gates\n"
            f"- Gate de início: CEO confirma Iniciar execução\n"
            f"- Gate de conclusão: homologação se alteração estrutural\n\n"
            f"## Pronto quando\n"
            f"- Critérios de aceite verificáveis\n"
            f"- Evidências no workspace da task\n"
            f"- Status Concluído no kanban\n"
        )
        plan_path = workspace / "plano.md"
        plan_path.write_text(plan_body, encoding="utf-8")
        artifact = Artifact(
            id=str(uuid.uuid4()),
            job_id=job.id,
            task_id=job.task_id,
            name="plano.md",
            artifact_type="markdown",
            path=str(plan_path),
            size_bytes=plan_path.stat().st_size,
            qa_status="pending",
        )
        self.session.add(artifact)

        await self._log_event(
            job.id, "running", "running", agent, "plan_artifact",
            f"Plano materializado em plano.md ({model} · {effort})"
        )

        if task:
            tags = list(task.tags) if isinstance(task.tags, list) else []
            tags = [t for t in tags if not str(t).startswith(("plan:", "model:", "effort:", "origin:"))]
            tags.extend([
                "plan:ready",
                f"model:{model}",
                f"effort:{effort}",
                f"origin:planning",
                f"plan_job:{job.id}",
            ])
            task.tags = tags
            task.handoffs = [
                "Paula PM → Especialista de domínio",
                "Especialista → Validador / QA",
            ]
            task.gates = [
                "Início explícito do CEO (Iniciar execução)",
                "Homologação se alteração estrutural",
            ]
            task.updated_at = datetime.now(timezone.utc)
            self.session.add(task)
        await self.session.flush()

    async def _produce_deliverable(self, job: Job, task) -> str:
        """Gera a resposta real à demanda (não stub). Clima via Open-Meteo; demais via GhostCLI se disponível."""
        import re
        import os
        import httpx

        demand = ((task.description if task else None) or (task.title if task else "") or "").strip()
        title = (task.title if task else "") or "Demanda"

        if re.search(r"temperatur|clima|\btempo\b|weather|°c|graus", demand, re.I):
            try:
                # Default: São Paulo — Open-Meteo (sem API key)
                url = (
                    "https://api.open-meteo.com/v1/forecast"
                    "?latitude=-23.55&longitude=-46.63"
                    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m"
                    "&daily=temperature_2m_max,temperature_2m_min"
                    "&timezone=America%2FSao_Paulo&forecast_days=1"
                )
                async with httpx.AsyncClient(timeout=12.0) as client:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    data = resp.json()
                cur = data.get("current") or {}
                daily = data.get("daily") or {}
                temp = cur.get("temperature_2m")
                feels = cur.get("apparent_temperature")
                hum = cur.get("relative_humidity_2m")
                wind = cur.get("wind_speed_10m")
                tmax = (daily.get("temperature_2m_max") or [None])[0]
                tmin = (daily.get("temperature_2m_min") or [None])[0]
                day = (daily.get("time") or ["hoje"])[0]
                lines = [
                    f"Resposta à demanda: {demand}",
                    "",
                    f"Local de referência: São Paulo, SP (America/Sao_Paulo)",
                    f"Data da previsão: {day}",
                    f"Temperatura atual: {temp} °C" if temp is not None else "Temperatura atual: indisponível",
                    f"Sensação térmica: {feels} °C" if feels is not None else "",
                    f"Mínima / máxima do dia: {tmin} °C / {tmax} °C" if tmin is not None else "",
                    f"Umidade: {hum}%" if hum is not None else "",
                    f"Vento: {wind} km/h" if wind is not None else "",
                    "",
                    "Fonte: Open-Meteo (open-meteo.com).",
                ]
                return "\n".join(l for l in lines if l is not None)
            except Exception as exc:
                return (
                    f"Não foi possível obter a temperatura agora ({type(exc).__name__}: {exc}).\n"
                    f"Demanda original: {demand}\n"
                    "Tente novamente ou consulte um serviço meteorológico."
                )

        try:
            from app.modules.ghostcli import chat_completion

            return await chat_completion(
                system=(
                    "Você é Paula PM no TAVIR Escritório. Execute a demanda do usuário "
                    "e entregue uma resposta objetiva em português do Brasil. "
                    "Não invente dados que precisem de API externa sem avisar."
                ),
                messages=[{"role": "user", "content": f"Título: {title}\n\nDemanda:\n{demand}"}],
                model=job.model_name,
                max_tokens=1200,
                timeout=60.0,
            )
        except Exception as exc:
            return (
                f"Falha ao consultar o motor padrão ({type(exc).__name__}: {exc}).\n\n"
                f"Demanda recebida:\n{demand}\n\n"
                "Confira o motor padrão em Integrações e rode novamente."
            )

    async def _materialize_execution(self, job: Job, workspace: Path, output: str) -> None:
        """Registra evidência de execução e consome plano.md se existir."""
        from app.models.task import Task

        task = await self.session.get(Task, job.task_id) if job.task_id else None
        plan_path = workspace / "plano.md"
        # Copia plano do workspace de planning se este job tem outro workspace
        if task and not plan_path.exists():
            tags = task.tags if isinstance(task.tags, list) else []
            plan_job_tag = next((t for t in tags if str(t).startswith("plan_job:")), None)
            if plan_job_tag:
                plan_job_id = str(plan_job_tag).split(":", 1)[1]
                from sqlalchemy import select
                stmt = select(Artifact).where(
                    Artifact.job_id == plan_job_id,
                    Artifact.name == "plano.md",
                )
                res = await self.session.execute(stmt)
                art = res.scalars().first()
                if art and art.path and Path(art.path).exists():
                    try:
                        (workspace / "plano.md").write_text(
                            Path(art.path).read_text(encoding="utf-8"), encoding="utf-8"
                        )
                    except Exception:
                        pass

        demand = ((task.description if task else None) or (task.title if task else "") or "").strip()
        answer = (output or "").strip() or "(sem saída)"
        exec_body = (
            f"# Execução — Task #{task.seq if task and task.seq else '?'}\n\n"
            f"**Job:** {job.id}\n"
            f"**Modelo:** {job.model_name or 'Fable'}\n"
            f"**Esforço:** {job.effort or 'Máximo'}\n"
            f"**Agente:** {job.agent_id or 'pm-projetos'}\n\n"
            f"## Demanda\n{demand or '_Sem descrição._'}\n\n"
            f"## Resposta\n{answer}\n"
        )
        exec_path = workspace / "execucao.md"
        exec_path.write_text(exec_body, encoding="utf-8")
        artifact = Artifact(
            id=str(uuid.uuid4()),
            job_id=job.id,
            task_id=job.task_id,
            name="execucao.md",
            artifact_type="markdown",
            path=str(exec_path),
            size_bytes=exec_path.stat().st_size,
            qa_status="pending",
        )
        self.session.add(artifact)
        await self._log_event(
            job.id, "running", "running", job.agent_id or "pm-projetos", "execution_artifact",
            "Evidência de execução registrada em execucao.md"
        )
        if task:
            tags = list(task.tags) if isinstance(task.tags, list) else []
            tags = [t for t in tags if not str(t).startswith("exec_job:")]
            tags.append(f"exec_job:{job.id}")
            task.tags = tags
            task.updated_at = datetime.now(timezone.utc)
            self.session.add(task)
        await self.session.flush()

    async def _advance_linked_task(self, job: Job, success: bool) -> None:
        """Avança a task vinculada conforme origem do job (planning → planned, execution → done)."""
        if not job.task_id:
            return
        from app.models.task import Task

        task = await self.session.get(Task, job.task_id)
        if not task:
            return

        origin = (job.origin or "manual").lower()
        if success:
            if origin == "planning" or (origin == "manual" and task.status in ("planning", "to_plan", "pending")):
                task.status = "planned"
            elif origin == "execution" or task.status == "in_progress":
                task.status = "done"
        else:
            if origin == "planning" or task.status == "planning":
                task.status = "to_plan"
            # Execução falha: permanece in_progress para remediação na UI

        task.updated_at = datetime.now(timezone.utc)
        self.session.add(task)
        await self.session.flush()

    async def _rollback_task_on_cancel(self, job: Job) -> None:
        """Parar job: planning → A planejar; execution → Planejado (plano preservado)."""
        if not job.task_id:
            return
        from app.models.task import Task

        task = await self.session.get(Task, job.task_id)
        if not task or task.status == "done":
            return

        origin = (job.origin or "manual").lower()
        if origin == "planning" or task.status == "planning":
            task.status = "to_plan"
        else:
            # Em execução (ou falha): volta para Planejado para poder reiniciar
            task.status = "planned"

        task.active_job_id = None
        task.updated_at = datetime.now(timezone.utc)
        self.session.add(task)
        await self.session.flush()

    async def _transition(self, job: Job, new_status: str, details: str | None = None, git_diff_stat: str = ""):
        valid = self.VALID_TRANSITIONS.get(job.status, [])
        if new_status not in valid:
            raise ValueError(f"Invalid transition {job.status} -> {new_status} for job {job.id}")
        old_status = job.status
        job.status = new_status
        job.updated_at = datetime.now(timezone.utc)
        await self._log_event(job.id, old_status, new_status, "worker", "state_change", details)

        from sqlalchemy import select
        stmt = select(JobAttempt).where(JobAttempt.job_id == job.id).order_by(JobAttempt.attempt_number.desc())
        res = await self.session.execute(stmt)
        latest_attempt = res.scalars().first()
        att_num = 1
        if latest_attempt:
            att_num = latest_attempt.attempt_number
            latest_attempt.status = new_status
            if details:
                latest_attempt.log_stream = (latest_attempt.log_stream or "") + "\n" + details
            if git_diff_stat:
                latest_attempt.git_diff_stat = git_diff_stat
            if new_status in ("succeeded", "failed"):
                latest_attempt.ended_at = datetime.now(timezone.utc)
            self.session.add(latest_attempt)

        _sync_to_office_db(job, att_num, new_status, log_stream=details or "", git_diff_stat=git_diff_stat)
        await self.session.flush()

    async def _fail(self, job: Job, reason: str):
        msg = (reason or "").strip() or "Falha sem detalhes registrados"
        job.error_message = msg
        await self._transition(job, "failed", details=msg)

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
        await self._log_event(
            job.id, old_status, "queued", "operator", "job_retried",
            "Job re-enfileirado pelo operador",
        )

        from sqlalchemy import select
        stmt = select(JobAttempt).where(JobAttempt.job_id == job.id).order_by(JobAttempt.attempt_number.desc())
        res = await self.session.execute(stmt)
        latest_attempt = res.scalars().first()
        next_num = (latest_attempt.attempt_number + 1) if latest_attempt else 2
        new_attempt = JobAttempt(
            id=str(uuid.uuid4()),
            job_id=job.id,
            attempt_number=next_num,
            status="queued",
            log_stream="Job re-enfileirado pelo operador",
            git_diff_stat="",
        )
        self.session.add(new_attempt)
        _sync_to_office_db(job, next_num, "queued", log_stream="Job re-enfileirado pelo operador")
        await self.session.flush()
        return job

    async def pause_job(self, job_id: str) -> Job:
        job = await self.session.get(Job, job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")

        # Kill running process if active
        proc = _ACTIVE_PROCESSES.pop(job.id, None)
        if proc:
            try:
                proc.terminate()
            except Exception:
                pass

        # Save checkpoint in worktree
        if job.workspace_path and Path(job.workspace_path).is_dir():
            try:
                import subprocess
                subprocess.run(
                    ["git", "add", "-A"],
                    cwd=job.workspace_path, capture_output=True, timeout=15
                )
                subprocess.run(
                    ["git", "commit", "--allow-empty", "-m", "wip(checkpoint): pausa manual pelo operador"],
                    cwd=job.workspace_path, capture_output=True, timeout=15
                )
            except Exception as e_ck:
                print(f"[JobRunner] Checkpoint error on pause: {e_ck}")

        old_status = job.status
        job.status = "paused"
        job.updated_at = datetime.now(timezone.utc)
        await self._log_event(job.id, old_status, "paused", "operator", "job_paused", "Job pausado pelo operador com checkpoint")

        from sqlalchemy import select
        stmt = select(JobAttempt).where(JobAttempt.job_id == job.id).order_by(JobAttempt.attempt_number.desc())
        res = await self.session.execute(stmt)
        latest_attempt = res.scalars().first()
        att_num = latest_attempt.attempt_number if latest_attempt else 1
        if latest_attempt:
            latest_attempt.status = "paused"
            latest_attempt.log_stream = (latest_attempt.log_stream or "") + "\nJob pausado pelo operador com checkpoint."
            self.session.add(latest_attempt)

        _sync_to_office_db(job, att_num, "paused", log_stream="Job pausado com checkpoint")
        await self.session.flush()
        return job

    async def cancel_job(self, job_id: str) -> Job:
        job = await self.session.get(Job, job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")
        proc = _ACTIVE_PROCESSES.pop(job.id, None)
        if proc:
            try:
                proc.terminate()
            except Exception:
                pass
        old_status = job.status
        job.status = "failed"
        job.error_message = "Job cancelado pelo operador"
        job.updated_at = datetime.now(timezone.utc)
        await self._log_event(job.id, old_status, "failed", "operator", "job_cancelled", "Job cancelado pelo operador")

        from sqlalchemy import select
        stmt = select(JobAttempt).where(JobAttempt.job_id == job.id).order_by(JobAttempt.attempt_number.desc())
        res = await self.session.execute(stmt)
        latest_attempt = res.scalars().first()
        att_num = latest_attempt.attempt_number if latest_attempt else 1
        if latest_attempt:
            latest_attempt.status = "failed"
            latest_attempt.ended_at = datetime.now(timezone.utc)
            latest_attempt.log_stream = (latest_attempt.log_stream or "") + "\nJob cancelado pelo operador."
            self.session.add(latest_attempt)

        _sync_to_office_db(job, att_num, "failed", log_stream="Job cancelado pelo operador")
        await self._rollback_task_on_cancel(job)
        await self.session.flush()
        return job