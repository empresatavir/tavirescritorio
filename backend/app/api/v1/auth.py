"""Login local, sessão de 12 h e conclusão do onboarding."""
from __future__ import annotations

import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.clock import set_fixed
from app.modules.auth.service import (
    EMPTY_DETAIL,
    close_session,
    complete_onboarding,
    open_session,
    read_session,
)
from app.modules.auth.service import SESSION_HOURS
from app.shared.database import get_session

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
COOKIE = "tavir_session"


class LoginBody(BaseModel):
    secret: str = ""


class ClockBody(BaseModel):
    at: str


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        COOKIE,
        token,
        httponly=True,
        samesite="lax",
        max_age=SESSION_HOURS * 3600,
        path="/",
    )


@router.get("/session")
async def get_auth_session(request: Request, session: AsyncSession = Depends(get_session)):
    return await read_session(session, request.cookies.get(COOKIE))


@router.post("/login")
async def post_login(body: LoginBody, response: Response, session: AsyncSession = Depends(get_session)):
    state, token, status = await open_session(session, body.secret)
    if status == 400:
        raise HTTPException(status_code=400, detail=EMPTY_DETAIL)
    if status == 401:
        raise HTTPException(status_code=401, detail=state.get("detail") or "A chave local não confere.")
    if token:
        _set_cookie(response, token)
    state.pop("detail", None)
    return state


@router.post("/logout")
async def post_logout(response: Response, session: AsyncSession = Depends(get_session)):
    response.delete_cookie(COOKIE, path="/")
    return await close_session(session)


@router.post("/onboarding/complete")
async def post_onboarding(request: Request, session: AsyncSession = Depends(get_session)):
    state, status = await complete_onboarding(session, request.cookies.get(COOKIE))
    if status == 401:
        raise HTTPException(status_code=401, detail="Sessão ausente.")
    return state


@router.post("/test-clock")
async def post_test_clock(body: ClockBody):
    if os.environ.get("TAVIR_AUTH_TEST_CLOCK") != "1":
        raise HTTPException(status_code=404, detail="Not Found")
    set_fixed(datetime.fromisoformat(body.at))
    return {"at": body.at}
