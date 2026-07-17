from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from ..auth import (
    ALLOW_ANY_ADMIN,
    COOKIE_NAME,
    SESSION_TTL_SECONDS,
    create_session_token,
    get_current_admin,
    verify_telegram_payload,
)
from ..database import get_db
from ..models import Invite, User

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/telegram")
async def telegram_login(request: Request, response: Response, db: Session = Depends(get_db)):
    body = await request.json()
    invite_token = body.pop("invite_token", None)

    if not verify_telegram_payload(body):
        raise HTTPException(status_code=401, detail="invalid_telegram_signature")

    telegram_id = str(body.get("id"))
    user = db.query(User).filter(User.telegram_id == telegram_id).first()

    if not user and invite_token:
        invite = db.query(Invite).filter(Invite.token == invite_token, Invite.used_by.is_(None)).first()
        if invite:
            user = User(
                telegram_id=telegram_id,
                username=body.get("username"),
                first_name=body.get("first_name"),
                role="employee",
            )
            db.add(user)
            invite.used_by = telegram_id
            invite.used_at = datetime.utcnow()
            db.commit()

    if not user and not ALLOW_ANY_ADMIN:
        raise HTTPException(status_code=403, detail="not_authorized")

    if user:
        user.username = body.get("username") or user.username
        user.first_name = body.get("first_name") or user.first_name
        db.commit()

    token = create_session_token(body)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=SESSION_TTL_SECONDS,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )
    return {
        "user": {
            "id": body.get("id"),
            "username": body.get("username"),
            "first_name": body.get("first_name"),
            "photo_url": body.get("photo_url"),
            "role": user.role if user else "owner",
        }
    }


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
