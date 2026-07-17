from sqlalchemy import (
    JSON,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    products = relationship("Product", back_populates="category")


class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    tag_hint = Column(String, nullable=True)

    products = relationship("Product", back_populates="supplier")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    telegram_id = Column(String, unique=True, nullable=False)
    username = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    role = Column(String, default="employee", nullable=False)  # owner | employee
    created_at = Column(DateTime, server_default=func.now())


class Invite(Base):
    __tablename__ = "invites"
    id = Column(Integer, primary_key=True)
    token = Column(String, unique=True, nullable=False)
    created_by = Column(String, nullable=True)
    used_by = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    used_at = Column(DateTime, nullable=True)


class Catalog(Base):
    __tablename__ = "catalogs"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    columns = Column(Integer, default=5, nullable=False)
    sort_key = Column(String, default="revenue", nullable=False)
    per_category_limit = Column(Integer, nullable=True)
    category_ids = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    items = relationship("CatalogItem", back_populates="catalog", cascade="all, delete-orphan", order_by="CatalogItem.position")


class CatalogItem(Base):
    __tablename__ = "catalog_items"
    id = Column(Integer, primary_key=True)
    catalog_id = Column(Integer, ForeignKey("catalogs.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    position = Column(Integer, default=0, nullable=False)

    catalog = relationship("Catalog", back_populates="items")
    product = relationship("Product")


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    external_code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    price_uzs = Column(Float, default=0, nullable=False)
    qty_sold = Column(Integer, default=0, nullable=False)
    revenue_uzs = Column(Float, default=0, nullable=False)
    shipments = Column(Integer, default=0, nullable=False)
    last_price_uzs = Column(Float, nullable=True)
    last_shipment_date = Column(String, nullable=True)
    legacy_catalog_number = Column(Integer, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    image_path = Column(String, nullable=True)
    manual_order = Column(Integer, default=0, nullable=False)
    raw_import = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    category = relationship("Category", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")

    def to_dict(self):
        return {
            "id": self.id,
            "external_code": self.external_code,
            "name": self.name,
            "price_uzs": self.price_uzs,
            "qty_sold": self.qty_sold,
            "revenue_uzs": self.revenue_uzs,
            "shipments": self.shipments,
            "last_price_uzs": self.last_price_uzs,
            "last_shipment_date": self.last_shipment_date,
            "legacy_catalog_number": self.legacy_catalog_number,
            "category": {"id": self.category.id, "name": self.category.name} if self.category else None,
            "supplier": {"id": self.supplier.id, "name": self.supplier.name} if self.supplier else None,
            "category_id": self.category_id,
            "supplier_id": self.supplier_id,
            "image_path": self.image_path,
            "manual_order": self.manual_order,
        }
