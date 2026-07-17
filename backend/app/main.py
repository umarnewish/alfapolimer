import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .auth import seed_owners
from .database import Base, SessionLocal, engine
from .models import Supplier
from .routers import auth_routes, catalogs, categories, import_routes, products, suppliers, team

Base.metadata.create_all(bind=engine)

DEFAULT_SUPPLIERS = [
    ("Alfa Polimer Line", "алфа"),
    ("RUM Plast", "р"),
    ("Farel Plast", "ф"),
    ("Doston Plast", "дос"),
    ("Elit Global Plast", "эл"),
    ("Imkon Plast", "имк"),
    ("DM Plast", "дм"),
    ("Exclusive Plast", "аб"),
    ("Bosito", "бос"),
    ("Bilol Plast", "шер"),
    ("AKUKA", "акука"),
]


def seed():
    db = SessionLocal()
    try:
        if db.query(Supplier).count() == 0:
            db.bulk_save_objects([Supplier(name=name, tag_hint=tag) for name, tag in DEFAULT_SUPPLIERS])
            db.commit()
        seed_owners(db)
    finally:
        db.close()


seed()

app = FastAPI(title="Alfa Polimer Catalog API")

cors_origin = os.environ.get("CORS_ORIGIN")
if cors_origin:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[cors_origin],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

UPLOADS_DIR = os.environ.get("UPLOADS_DIR", "./uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

app.include_router(auth_routes.router)
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(suppliers.router)
app.include_router(import_routes.router)
app.include_router(catalogs.router)
app.include_router(team.router)


@app.get("/api/health")
def health():
    return {"ok": True}
