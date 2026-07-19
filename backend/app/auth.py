import hashlib
import hmac
import os
import time

import bcrypt
import jwt
from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from .models import User

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
SESSION_SECRET = os.environ.get("SESSION_SECRET", "")
ADMIN_TELEGRAM_IDS = {x.strip() for x in os.environ.get("ADMIN_TELEGRAM_IDS", "").split(",") if x.strip()}
ALLOW_ANY_ADMIN = os.environ.get("ALLOW_ANY_ADMIN", "false").lower() == "true"
OWNER_USERNAME = os.environ.get("OWNER_USERNAME", "ibnufazil").strip().lstrip("@").lower()
OWNER_BOOTSTRAP_PASSWORD = os.environ.get("OWNER_BOOTSTRAP_PASSWORD", "")

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


def seed_owner_password(db: Session):
    """Bootstrap the owner's username/password login, once.

    If a User with OWNER_USERNAME already exists (e.g. seeded earlier via
    ADMIN_TELEGRAM_IDS) and has no password yet, attach one instead of
    skipping — otherwise a pre-existing telegram-only owner row would never
    get a password and could never log in this way. Only ever sets the
    password when it's currently unset, so later password changes (once we
    have a change-password flow) survive service restarts.
    """
    if not OWNER_BOOTSTRAP_PASSWORD:
        return
    existing = db.query(User).filter(User.username == OWNER_USERNAME).first()
    if existing:
        if not existing.password_hash:
            existing.password_hash = hash_password(OWNER_BOOTSTRAP_PASSWORD)
            db.commit()
        return
    db.add(User(
        telegram_id=f"local:{OWNER_USERNAME}",
        username=OWNER_USERNAME,
        first_name=OWNER_USERNAME,
        role="owner",
        password_hash=hash_password(OWNER_BOOTSTRAP_PASSWORD),
    ))
    db.commit()


def resolve_login(db: Session, telegram_id: str, username: str | None, first_name: str | None) -> User | None:
    """Find-or-create the User for a Telegram identity. Returns None if not authorized.

    @OWNER_USERNAME (default ibnufazil) is always granted owner on first contact —
    there is no invite/admin UI in this build, so ownership is claimed by username.
    """
    is_owner_username = bool(username) and username.strip().lstrip("@").lower() == OWNER_USERNAME

    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if user:
        user.username = username or user.username
        user.first_name = first_name or user.first_name
        if is_owner_username and user.role != "owner":
            user.role = "owner"
        db.commit()
        return user

    if is_owner_username or telegram_id in ADMIN_TELEGRAM_IDS or ALLOW_ANY_ADMIN:
        user = User(telegram_id=telegram_id, username=username, first_name=first_name, role="owner")
        db.add(user)
        db.commit()
        return user

    return None


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def create_session_token(user: User) -> str:
    now = int(time.time())
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "first_name": user.first_name,
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
    try:
        user_id = int(payload["sub"])
    except (KeyError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="invalid_session")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        # removed from the team — session is no longer valid
        raise HTTPException(status_code=401, detail="access_revoked")
    payload["role"] = user.role
    return payload


def get_current_owner(admin=Depends(get_current_admin)):
    if admin.get("role") != "owner":
        raise HTTPException(status_code=403, detail="owner_only")
    return admin
