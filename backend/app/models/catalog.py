from sqlalchemy import Column, Integer, String, Numeric, TIMESTAMP, ForeignKey, func, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.core.db import Base


class Catalog(Base):
    __tablename__ = "catalog"
    __table_args__ = (
        UniqueConstraint("vendor_id", "code", name="uq_catalog_vendor_code"),
        Index("ix_catalog_vendor_id", "vendor_id"),
        Index("ix_catalog_code", "code"),
    )

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)

    code = Column(String(50), nullable=False)
    name = Column(String(150), nullable=False)
    rate = Column(Numeric(12, 2), nullable=False, server_default="0")

    created_at = Column(TIMESTAMP, server_default=func.now())

    vendor = relationship("Vendor", backref="catalog_items")
