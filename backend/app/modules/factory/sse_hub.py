"""Hub SSE in-process para runs da Fábrica (B2)."""
from __future__ import annotations

import asyncio
import json
from typing import Any


def format_sse(event: str, data: dict[str, Any], *, event_id: str | None = None) -> str:
    """Formata um frame SSE com event name + JSON data."""
    lines: list[str] = []
    if event_id:
        lines.append(f"id: {event_id}")
    lines.append(f"event: {event}")
    lines.append(f"data: {json.dumps(data, ensure_ascii=False, default=str)}")
    lines.append("")
    lines.append("")
    return "\n".join(lines)


class FactorySseHub:
    """Pub/sub por run_id. Filas asyncio por assinante."""

    def __init__(self) -> None:
        self._subs: dict[str, list[asyncio.Queue]] = {}
        self._progress: dict[str, list[dict[str, Any]]] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, run_id: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=256)
        async with self._lock:
            self._subs.setdefault(run_id, []).append(q)
        return q

    async def unsubscribe(self, run_id: str, q: asyncio.Queue) -> None:
        async with self._lock:
            subs = self._subs.get(run_id) or []
            if q in subs:
                subs.remove(q)
            if not subs and run_id in self._subs:
                del self._subs[run_id]

    async def recent_progress(self, run_id: str) -> list[dict[str, Any]]:
        async with self._lock:
            return list(self._progress.get(run_id) or [])

    async def publish(self, run_id: str, event: str, data: dict[str, Any]) -> None:
        frame = {"event": event, "data": data}
        async with self._lock:
            if event == "execution.progress":
                bucket = self._progress.setdefault(run_id, [])
                bucket.append(frame)
                if len(bucket) > 80:
                    del bucket[:-80]
            targets = list(self._subs.get(run_id) or [])
        for q in targets:
            try:
                q.put_nowait(frame)
            except asyncio.QueueFull:
                # Descarta o mais antigo e tenta de novo
                try:
                    q.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                try:
                    q.put_nowait(frame)
                except asyncio.QueueFull:
                    pass


factory_sse_hub = FactorySseHub()
