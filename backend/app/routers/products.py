import os
import time
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_admin
from ..database import get_db
from ..models import Product

router = APIRouter(prefix="/api/products", tags=["products"])

UPLOADS_DIR = os.environ.get("UPLOADS_DIR", "./uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


class ProductCreate(BaseModel):
    name: str
    price_uzs: float = 0
    external_code: str | None = None
    category_id: int | None = None
    supplier_id: int | None = None


class ProductUpdate(BaseModel):
    name: str | None = None
    price_uzs: float | None = None
    qty_sold: int | None = None
    revenue_uzs: float | None = None
    category_id: int | None = None
    supplier_id: int | None = None


class ReorderRequest(BaseModel):
    ids: list[int]


class BulkAssignRequest(BaseModel):
    ids: list[int]
    category_id: int | None = None
    clear_category: bool = False
    supplier_id: int | None = None
    clear_supplier: bool = False


def _query(db: Session):
    return db.query(Product).options(joinedload(Product.category), joinedload(Product.supplier))


@router.get("")
def list_products(db: Session = Depends(get_db)):
    rows = _query(db).order_by(Product.manual_order).all()
    return [p.to_dict() for p in rows]


@router.post("")
def create_product(body: ProductCreate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    external_code = body.external_code or f"manual-{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
    if db.query(Product).filter(Product.external_code == external_code).first():
        raise HTTPException(status_code=409, detail="external_code_exists")
    max_order = db.query(func.max(Product.manual_order)).scalar() or 0
    product = Product(
        external_code=external_code,
        name=body.name,
        price_uzs=body.price_uzs,
        category_id=body.category_id,
        supplier_id=body.supplier_id,
        manual_order=max_order + 10,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return _query(db).get(product.id).to_dict()


@router.patch("/{product_id}")
def update_product(product_id: int, body: ProductUpdate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    product = db.query(Product).get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="not_found")
    for field, value in body.dict(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    return _query(db).get(product_id).to_dict()


@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    product = db.query(Product).get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="not_found")
    db.delete(product)
    db.commit()
    return {"ok": True}


@router.post("/reorder")
def reorder_products(body: ReorderRequest, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    for idx, product_id in enumerate(body.ids):
        db.query(Product).filter(Product.id == product_id).update({"manual_order": (idx + 1) * 10})
    db.commit()
    return {"ok": True}


@router.post("/bulk_assign")
def bulk_assign(body: BulkAssignRequest, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    updates = {}
    if body.clear_category:
        updates["category_id"] = None
    elif body.category_id is not None:
        updates["category_id"] = body.category_id
    if body.clear_supplier:
        updates["supplier_id"] = None
    elif body.supplier_id is not None:
        updates["supplier_id"] = body.supplier_id
    if not updates:
        return {"ok": True, "updated": 0}
    db.query(Product).filter(Product.id.in_(body.ids)).update(updates, synchronize_session=False)
    db.commit()
    return {"ok": True, "updated": len(body.ids)}


@router.post("/{product_id}/photo")
async def upload_photo(product_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    product = db.query(Product).get(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="not_found")
    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"{product.external_code}{ext}"
    dest = os.path.join(UPLOADS_DIR, filename)
    with open(dest, "wb") as f:
        f.write(await file.read())
    product.image_path = filename
    db.commit()
    return _query(db).get(product_id).to_dict()
