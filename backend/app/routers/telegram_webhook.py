import os
from datetime import datetime, timedelta

from fastapi import APIRouter, Header, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import LoginCode
from ..telegram_bot import (
    CODE_TTL_SECONDS,
    RENEW_CALLBACK,
    answer_callback,
    edit_code_message,
    generate_code,
    send_code_message,
)

router = APIRouter(prefix="/api/telegram", tags=["telegram"])

WEBHOOK_SECRET = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")


def issue_code(db: Session, *, telegram_id: str, username: str | None, first_name: str | None,
                chat_id: str, message_id: int | None) -> str:
    # invalidate any still-unused codes for this identity before issuing a fresh one
    db.query(LoginCode).filter(
        LoginCode.telegram_id == telegram_id, LoginCode.used_at.is_(None),
    ).update({"used_at": datetime.utcnow()})

    code = generate_code()
    row = LoginCode(
        code=code, telegram_id=telegram_id, username=username, first_name=first_name,
        chat_id=chat_id, message_id=message_id,
        expires_at=datetime.utcnow() + timedelta(seconds=CODE_TTL_SECONDS),
    )
    db.add(row)
    db.commit()
    return code


@router.post("/webhook")
async def webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
):
    if WEBHOOK_SECRET and x_telegram_bot_api_secret_token != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="bad_secret")

    update = await request.json()
    db = SessionLocal()
    try:
        if "callback_query" in update:
            cq = update["callback_query"]
            if cq.get("data") != RENEW_CALLBACK:
                return {"ok": True}
            frm = cq["from"]
            chat_id = str(cq["message"]["chat"]["id"])
            message_id = cq["message"]["message_id"]
            code = issue_code(
                db, telegram_id=str(frm["id"]), username=frm.get("username"),
                first_name=frm.get("first_name"), chat_id=chat_id, message_id=message_id,
            )
            await edit_code_message(chat_id, message_id, code)
            await answer_callback(cq["id"], "Код обновлён")
            return {"ok": True}

        if "message" in update:
            msg = update["message"]
            if "from" not in msg or msg["from"].get("is_bot"):
                return {"ok": True}
            frm = msg["from"]
            chat_id = str(msg["chat"]["id"])
            code = issue_code(
                db, telegram_id=str(frm["id"]), username=frm.get("username"),
                first_name=frm.get("first_name"), chat_id=chat_id, message_id=None,
            )
            sent = await send_code_message(chat_id, code)
            result = sent.get("result") or {}
            if result.get("message_id"):
                db.query(LoginCode).filter(LoginCode.code == code).update(
                    {"message_id": result["message_id"]},
                )
                db.commit()
            return {"ok": True}

        return {"ok": True}
    finally:
        db.close()
