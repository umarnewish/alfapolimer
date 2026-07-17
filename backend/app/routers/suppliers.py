from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..database import get_db
from ..models import Product, Supplier

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


class SupplierCreate(BaseModel):
    name: str


class SupplierUpdate(BaseModel):
    name: str | None = None


@router.get("")
def list_suppliers(db: Session = Depends(get_db)):
    rows = db.query(Supplier).order_by(Supplier.name).all()
    return [{"id": s.id, "name": s.name} for s in rows]


@router.post("")
def create_supplier(body: SupplierCreate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    if db.query(Supplier).filter(Supplier.name == body.name).first():
        raise HTTPException(status_code=409, detail="supplier_exists")
    supplier = Supplier(name=body.name)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return {"id": supplier.id, "name": supplier.name}


@router.patch("/{supplier_id}")
def update_supplier(supplier_id: int, body: SupplierUpdate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    supplier = db.query(Supplier).get(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="not_found")
    if body.name is not None:
        supplier.name = body.name
    db.commit()
    return {"id": supplier.id, "name": supplier.name}


@router.get("/{supplier_id}/usage")
def supplier_usage(supplier_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    count = db.query(func.count(Product.id)).filter(Product.supplier_id == supplier_id).scalar()
    return {"count": count or 0}


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    supplier = db.query(Supplier).get(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="not_found")
    db.delete(supplier)
    db.commit()
    return {"ok": True}
