from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_admin
from ..database import get_db
from ..models import Catalog, CatalogItem, Category, Product
from ..pdf import render_catalog_pdf

router = APIRouter(prefix="/api/catalogs", tags=["catalogs"])

SORT_KEYS = {
    "revenue": lambda p: -(p.revenue_uzs or 0),
    "sales": lambda p: -(p.qty_sold or 0),
    "price": lambda p: -(p.price_uzs or 0),
    "manual": lambda p: p.manual_order,
}


class CatalogCreate(BaseModel):
    name: str
    category_ids: list[int] = []
    per_category_limit: int | None = None
    sort_key: str = "revenue"
    columns: int = 5


class CatalogUpdate(BaseModel):
    name: str | None = None
    columns: int | None = None
    sort_key: str | None = None
    per_category_limit: int | None = None
    category_ids: list[int] | None = None


class ItemAdd(BaseModel):
    product_id: int


class ReorderRequest(BaseModel):
    item_ids: list[int]


def materialize(catalog: Catalog, db: Session):
    """(Re)build catalog items from its rules: top-N per category by sort key."""
    sort_fn = SORT_KEYS.get(catalog.sort_key, SORT_KEYS["revenue"])
    category_ids = catalog.category_ids or [c.id for c in db.query(Category).order_by(Category.sort_order).all()]

    db.query(CatalogItem).filter(CatalogItem.catalog_id == catalog.id).delete()

    position = 0
    for category_id in category_ids:
        products = db.query(Product).filter(Product.category_id == category_id).all()
        products.sort(key=sort_fn)
        if catalog.per_category_limit:
            products = products[: catalog.per_category_limit]
        for product in products:
            position += 10
            db.add(CatalogItem(catalog_id=catalog.id, product_id=product.id, position=position))


def catalog_summary(catalog: Catalog, db: Session):
    count = db.query(CatalogItem).filter(CatalogItem.catalog_id == catalog.id).count()
    return {
        "id": catalog.id,
        "name": catalog.name,
        "columns": catalog.columns,
        "sort_key": catalog.sort_key,
        "per_category_limit": catalog.per_category_limit,
        "category_ids": catalog.category_ids,
        "item_count": count,
    }


def item_dict(item: CatalogItem):
    p = item.product
    return {
        "id": item.id,
        "position": item.position,
        "product": p.to_dict() if p else None,
    }


@router.get("")
def list_catalogs(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    return [catalog_summary(c, db) for c in db.query(Catalog).order_by(Catalog.created_at.desc()).all()]


@router.post("")
def create_catalog(body: CatalogCreate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    if body.sort_key not in SORT_KEYS:
        raise HTTPException(status_code=422, detail="invalid_sort_key")
    catalog = Catalog(
        name=body.name,
        columns=max(2, min(6, body.columns)),
        sort_key=body.sort_key,
        per_category_limit=body.per_category_limit,
        category_ids=body.category_ids or None,
    )
    db.add(catalog)
    db.flush()
    materialize(catalog, db)
    db.commit()
    return catalog_summary(catalog, db)


@router.get("/{catalog_id}")
def get_catalog(catalog_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    catalog = db.query(Catalog).get(catalog_id)
    if not catalog:
        raise HTTPException(status_code=404, detail="not_found")
    items = (
        db.query(CatalogItem)
        .options(joinedload(CatalogItem.product).joinedload(Product.category))
        .filter(CatalogItem.catalog_id == catalog_id)
        .order_by(CatalogItem.position)
        .all()
    )
    return {**catalog_summary(catalog, db), "items": [item_dict(i) for i in items]}


@router.patch("/{catalog_id}")
def update_catalog(catalog_id: int, body: CatalogUpdate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    catalog = db.query(Catalog).get(catalog_id)
    if not catalog:
        raise HTTPException(status_code=404, detail="not_found")
    for field, value in body.dict(exclude_unset=True).items():
        setattr(catalog, field, value)
    db.commit()
    return catalog_summary(catalog, db)


@router.post("/{catalog_id}/refresh")
def refresh_catalog(catalog_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    catalog = db.query(Catalog).get(catalog_id)
    if not catalog:
        raise HTTPException(status_code=404, detail="not_found")
    materialize(catalog, db)
    db.commit()
    return catalog_summary(catalog, db)


@router.delete("/{catalog_id}")
def delete_catalog(catalog_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    catalog = db.query(Catalog).get(catalog_id)
    if not catalog:
        raise HTTPException(status_code=404, detail="not_found")
    db.delete(catalog)
    db.commit()
    return {"ok": True}


@router.post("/{catalog_id}/items")
def add_item(catalog_id: int, body: ItemAdd, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    catalog = db.query(Catalog).get(catalog_id)
    if not catalog:
        raise HTTPException(status_code=404, detail="not_found")
    exists = db.query(CatalogItem).filter(
        CatalogItem.catalog_id == catalog_id, CatalogItem.product_id == body.product_id
    ).first()
    if exists:
        raise HTTPException(status_code=409, detail="already_in_catalog")
    max_pos = (
        db.query(CatalogItem.position)
        .filter(CatalogItem.catalog_id == catalog_id)
        .order_by(CatalogItem.position.desc())
        .limit(1)
        .scalar()
        or 0
    )
    item = CatalogItem(catalog_id=catalog_id, product_id=body.product_id, position=max_pos + 10)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item_dict(item)


@router.delete("/{catalog_id}/items/{item_id}")
def remove_item(catalog_id: int, item_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    item = db.query(CatalogItem).filter(
        CatalogItem.catalog_id == catalog_id, CatalogItem.id == item_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="not_found")
    db.delete(item)
    db.commit()
    return {"ok": True}


@router.post("/{catalog_id}/reorder")
def reorder_items(catalog_id: int, body: ReorderRequest, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    for idx, item_id in enumerate(body.item_ids):
        db.query(CatalogItem).filter(
            CatalogItem.catalog_id == catalog_id, CatalogItem.id == item_id
        ).update({"position": (idx + 1) * 10})
    db.commit()
    return {"ok": True}


@router.get("/{catalog_id}/pdf")
def catalog_pdf(catalog_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    catalog = db.query(Catalog).get(catalog_id)
    if not catalog:
        raise HTTPException(status_code=404, detail="not_found")
    pdf_bytes = render_catalog_pdf(catalog, db)
    filename = f"catalog-{catalog.id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
