"""Relógio da sessão. O teste pode fixar o instante; a produção usa UTC."""
from datetime import datetime, timezone

_fixed: datetime | None = None


def now() -> datetime:
    if _fixed is not None:
        return _fixed
    return datetime.now(timezone.utc)


def set_fixed(value: datetime | None) -> None:
    global _fixed
    _fixed = value
