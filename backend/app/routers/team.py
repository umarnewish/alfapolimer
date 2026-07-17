import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_owner
from ..database import get_db
from ..models import Invite, User

router = APIRouter(prefix="/api/team", tags=["team"])


@router.get("/users")
def list_users(db: Session = Depends(get_db), owner=Depends(get_current_owner)):
    users = db.query(User).order_by(User.created_at).all()
    return [
        {
            "id": u.id,
            "telegram_id": u.telegram_id,
            "username": u.username,
            "first_name": u.first_name,
            "role": u.role,
        }
        for u in users
    ]


@router.delete("/users/{user_id}")
def remove_user(user_id: int, db: Session = Depends(get_db), owner=Depends(get_current_owner)):
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="not_found")
    if user.role == "owner":
        raise HTTPException(status_code=400, detail="cannot_remove_owner")
    db.delete(user)
    db.commit()
    return {"ok": True}


@router.get("/invites")
def list_invites(db: Session = Depends(get_db), owner=Depends(get_current_owner)):
    invites = db.query(Invite).order_by(Invite.created_at.desc()).all()
    return [
        {
            "id": i.id,
            "token": i.token,
            "used_by": i.used_by,
            "created_at": str(i.created_at) if i.created_at else None,
            "used_at": str(i.used_at) if i.used_at else None,
        }
        for i in invites
    ]


@router.post("/invites")
def create_invite(db: Session = Depends(get_db), owner=Depends(get_current_owner)):
    token = secrets.token_urlsafe(16)
    invite = Invite(token=token, created_by=str(owner["sub"]))
    db.add(invite)
    db.commit()
    return {"id": invite.id, "token": token}


@router.delete("/invites/{invite_id}")
def delete_invite(invite_id: int, db: Session = Depends(get_db), owner=Depends(get_current_owner)):
    invite = db.query(Invite).get(invite_id)
    if not invite:
        raise HTTPException(status_code=404, detail="not_found")
    db.delete(invite)
    db.commit()
    return {"ok": True}
