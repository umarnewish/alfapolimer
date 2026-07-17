import csv
import io
import os
import re
from collections import defaultdict

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..auth import get_current_admin
from ..database import get_db
from ..models import Category, Product, Supplier

router = APIRouter(prefix="/api/import", tags=["import"])

UPLOADS_DIR = os.environ.get("UPLOADS_DIR", "./uploads")


def parse_number(value):
    if value is None or str(value).strip() == "":
        return 0
    try:
        return float(str(value).replace(",", "").strip())
    except ValueError:
        return 0


def parse_optional_number(value):
    if value is None or str(value).strip() == "":
        return None
    return parse_number(value)


def map_row(row):
    external_code = (row.get("Код МойСклад") or "").strip()
    if not external_code:
        return None
    return {
        "category_name": (row.get("Категория") or "").strip() or None,
        "external_code": external_code,
        "name": (row.get("Наименование") or "").strip(),
        "price_uzs": parse_number(row.get("Цена (сум)")),
        "qty_sold": int(parse_number(row.get("Продано, шт"))),
        "revenue_uzs": parse_number(row.get("Выручка (сум)")),
        "shipments": int(parse_number(row.get("Отгрузок"))),
        "last_price_uzs": parse_optional_number(row.get("Посл. цена")),
        "last_shipment_date": (row.get("Посл. отгрузка") or "").strip() or None,
        "legacy_catalog_number": (
            int(parse_optional_number(row.get("№ в каталоге")))
            if parse_optional_number(row.get("№ в каталоге")) is not None
            else None
        ),
        "raw_import": row,
    }


def suggest_supplier_id(name, suppliers):
    tokens = set(name.lower().split())
    for supplier in suppliers:
        if supplier.tag_hint and supplier.tag_hint.lower() in tokens:
            return supplier.id
    return None


@router.post("/csv")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    raw = await file.read()
    text = raw.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = [r for r in (map_row(row) for row in reader) if r]

    existing = {p.external_code: p for p in db.query(Product).all()}
    suppliers = db.query(Supplier).all()
    max_order = db.query(func.max(Product.manual_order)).scalar() or 0

    # Categories named in the sheet are created on the fly; a product's
    # category is only filled from the sheet when the product has none yet,
    # so admin-made corrections survive re-imports.
    categories = {c.name: c for c in db.query(Category).all()}
    max_cat_order = db.query(func.max(Category.sort_order)).scalar() or 0

    def category_id_for(name):
        nonlocal max_cat_order
        if not name:
            return None
        if name not in categories:
            max_cat_order += 1
            category = Category(name=name, sort_order=max_cat_order)
            db.add(category)
            db.flush()
            categories[name] = category
        return categories[name].id

    inserted = 0
    updated = 0
    for row in rows:
        category_name = row.pop("category_name", None)
        product = existing.get(row["external_code"])
        if product:
            for field in [
                "name", "price_uzs", "qty_sold", "revenue_uzs", "shipments",
                "last_price_uzs", "last_shipment_date", "legacy_catalog_number", "raw_import",
            ]:
                setattr(product, field, row[field])
            if product.category_id is None:
                product.category_id = category_id_for(category_name)
            updated += 1
        else:
            max_order += 10
            db.add(Product(
                **row,
                category_id=category_id_for(category_name),
                supplier_id=suggest_supplier_id(row["name"], suppliers),
                manual_order=max_order,
            ))
            inserted += 1

    db.commit()
    return {"total": len(rows), "inserted": inserted, "updated": updated}


def extract_photo_code(filename):
    base = re.sub(r"\.[^.]+$", "", filename)
    match = re.match(r"^(\d+)", base)
    return match.group(1) if match else None


@router.post("/photos")
async def import_photos(
    files: list[UploadFile] = File(...),
    overwrite: bool = Form(False),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    os.makedirs(UPLOADS_DIR, exist_ok=True)

    by_code = {}
    contents = {}
    for f in files:
        code = extract_photo_code(f.filename or "")
        if not code:
            continue
        data = await f.read()
        existing = by_code.get(code)
        if not existing or len(data) > len(contents[existing.filename]):
            by_code[code] = f
            contents[f.filename] = data

    products = {p.external_code: p for p in db.query(Product).all()}
    matched = 0
    skipped = 0
    for code, f in by_code.items():
        product = products.get(code)
        if not product:
            continue
        if product.image_path and not overwrite:
            skipped += 1
            continue
        ext = os.path.splitext(f.filename or "")[1] or ".jpg"
        filename = f"{product.external_code}{ext}"
        with open(os.path.join(UPLOADS_DIR, filename), "wb") as out:
            out.write(contents[f.filename])
        product.image_path = filename
        matched += 1

    db.commit()
    return {"matched": matched, "skipped_existing": skipped, "files_considered": len(by_code)}
