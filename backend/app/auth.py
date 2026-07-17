import hashlib
import hmac
import os
import time

import jwt
from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
SESSION_SECRET = os.environ.get("SESSION_SECRET", "")
ADMIN_TELEGRAM_IDS = {x.strip() for x in os.environ.get("ADMIN_TELEGRAM_IDS", "").split(",") if x.strip()}
ALLOW_ANY_ADMIN = os.environ.get("ALLOW_ANY_ADMIN", "false").lower() == "true"

AUTH_DATE_MAX_AGE_SECONDS = 24 * 60 * 60
SESSION_TTL_SECONDS = 30 * 24 * 60 * 60
COOKIE_NAME = "catalog_session"


def verify_telegram_payload(data: dict) -> bool:
    received_hash = data.get("hash")
    if not received_hash:
        return False

    check_fields = {k: v for k, v in data.items() if k != "hash" and v is not None}
    data_check_string = "\n".join(f"{k}={check_fields[k]}" for k in sorted(check_fields.keys()))

    secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hash, str(received_hash)):
        return False

    auth_date = int(data.get("auth_date", 0))
    if time.time() - auth_date > AUTH_DATE_MAX_AGE_SECONDS:
        return False

    return True


def seed_owners(db: Session):
    """Ensure every telegram id from ADMIN_TELEGRAM_IDS exists as an owner."""
    for telegram_id in ADMIN_TELEGRAM_IDS:
        user = db.query(User).filter(User.telegram_id == telegram_id).first()
        if not user:
            db.add(User(telegram_id=telegram_id, role="owner"))
        elif user.role != "owner":
            user.role = "owner"
    db.commit()


def create_session_token(telegram_user: dict) -> str:
    now = int(time.time())
    payload = {
        "sub": str(telegram_user["id"]),
        "username": telegram_user.get("username"),
        "first_name": telegram_user.get("first_name"),
        "photo_url": telegram_user.get("photo_url"),
        "iat": now,
        "exp": now + SESSION_TTL_SECONDS,
    }
    return jwt.encode(payload, SESSION_SECRET, algorithm="HS256")


def decode_session_token(token: str):
    try:
        return jwt.decode(token, SESSION_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        return None


def get_current_admin(catalog_session: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    if not catalog_session:
        raise HTTPException(status_code=401, detail="not_authenticated")
    payload = decode_session_token(catalog_session)
    if not payload:
        raise HTTPException(status_code=401, detail="invalid_session")
    if ALLOW_ANY_ADMIN:
        payload["role"] = "owner"
        return payload
    user = db.query(User).filter(User.telegram_id == str(payload["sub"])).first()
    if not user:
        # removed from the team — session is no longer valid
        raise HTTPException(status_code=401, detail="access_revoked")
    payload["role"] = user.role
    return payload


def get_current_owner(admin=Depends(get_current_admin)):
    if admin.get("role") != "owner":
        raise HTTPException(status_code=403, detail="owner_only")
    return admin
