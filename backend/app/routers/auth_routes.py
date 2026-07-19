from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import (
    COOKIE_NAME,
    SESSION_TTL_SECONDS,
    create_session_token,
    get_current_admin,
    resolve_login,
    verify_password,
    verify_telegram_payload,
)
from ..database import get_db
from ..models import Invite, LoginCode, User

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_session_cookie(response: Response, user: User):
    token = create_session_token(user)
    response.set_cookie(
        key=COOKIE_NAME, value=token, max_age=SESSION_TTL_SECONDS,
        httponly=True, secure=True, samesite="lax", path="/",
    )


def _user_out(user: User):
    return {"id": user.id, "username": user.username, "first_name": user.first_name, "role": user.role}


class PasswordLoginBody(BaseModel):
    username: str
    password: str


@router.post("/login")
def password_login(body: PasswordLoginBody, response: Response, db: Session = Depends(get_db)):
    username = body.username.strip().lstrip("@").lower()
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid_credentials")

    _set_session_cookie(response, user)
    return {"user": _user_out(user)}


# --- Telegram login (dormant for now — bot token not wired up yet) ----------

class CodeLoginBody(BaseModel):
    code: str


@router.post("/code")
def code_login(body: CodeLoginBody, response: Response, db: Session = Depends(get_db)):
    code = body.code.strip().upper()
    row = db.query(LoginCode).filter(LoginCode.code == code).first()
    if not row or row.used_at is not None or row.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="invalid_or_expired_code")

    row.used_at = datetime.utcnow()
    db.commit()

    user = resolve_login(db, row.telegram_id, row.username, row.first_name)
    if not user:
        raise HTTPException(status_code=403, detail="not_authorized")

    _set_session_cookie(response, user)
    return {"user": _user_out(user)}


@router.post("/telegram")
async def telegram_login(request: Request, response: Response, db: Session = Depends(get_db)):
    body = await request.json()
    invite_token = body.pop("invite_token", None)

    if not verify_telegram_payload(body):
        raise HTTPException(status_code=401, detail="invalid_telegram_signature")

    telegram_id = str(body.get("id"))
    username = body.get("username")
    first_name = body.get("first_name")

    if invite_token and not db.query(User).filter(User.telegram_id == telegram_id).first():
        invite = db.query(Invite).filter(Invite.token == invite_token, Invite.used_by.is_(None)).first()
        if invite:
            user = User(telegram_id=telegram_id, username=username, first_name=first_name, role="employee")
            db.add(user)
            invite.used_by = telegram_id
            invite.used_at = datetime.utcnow()
            db.commit()

    user = resolve_login(db, telegram_id, username, first_name)
    if not user:
        raise HTTPException(status_code=403, detail="not_authorized")

    _set_session_cookie(response, user)
    return {"user": _user_out(user)}


@router.get("/me")
def me(admin=Depends(get_current_admin)):
    return {
        "user": {
            "id": admin["sub"],
            "username": admin.get("username"),
            "first_name": admin.get("first_name"),
            "role": admin.get("role", "employee"),
        }
    }


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}
