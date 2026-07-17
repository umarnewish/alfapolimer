from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..database import get_db
from ..models import Category, Product

router = APIRouter(prefix="/api/categories", tags=["categories"])


class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None


@router.get("")
def list_categories(db: Session = Depends(get_db)):
    rows = db.query(Category).order_by(Category.sort_order, Category.name).all()
    return [{"id": c.id, "name": c.name, "sort_order": c.sort_order} for c in rows]


@router.post("")
def create_category(body: CategoryCreate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    if db.query(Category).filter(Category.name == body.name).first():
        raise HTTPException(status_code=409, detail="category_exists")
    max_order = db.query(func.max(Category.sort_order)).scalar() or 0
    category = Category(name=body.name, sort_order=max_order + 1)
    db.add(category)
    db.commit()
    db.refresh(category)
    return {"id": category.id, "name": category.name, "sort_order": category.sort_order}


@router.patch("/{category_id}")
def update_category(category_id: int, body: CategoryUpdate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    category = db.query(Category).get(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="not_found")
    if body.name is not None:
        category.name = body.name
    if body.sort_order is not None:
        category.sort_order = body.sort_order
    db.commit()
    return {"id": category.id, "name": category.name, "sort_order": category.sort_order}


@router.get("/{category_id}/usage")
def category_usage(category_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    count = db.query(func.count(Product.id)).filter(Product.category_id == category_id).scalar()
    return {"count": count or 0}


@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    category = db.query(Category).get(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="not_found")
    db.delete(category)
    db.commit()
    return {"ok": True}
